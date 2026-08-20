import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyError, type FastifyInstance, type FastifyRequest } from 'fastify';
import type { BffConfig } from './config.js';
import type { ApiError, CreateWorkItemRequest, TransitionWorkItemRequest } from './contracts.js';
import { LifecycleState } from './lifecycle.js';
import { TokenBucketRateLimiter } from './rate-limit.js';
import {
  UpstreamCancelledError,
  UpstreamHttpError,
  UpstreamProtocolError,
  UpstreamTimeoutError,
  UpstreamUnavailableError,
  WorkServiceClient,
  type RequestContext,
  type WorkServicePort
} from './work-service-client.js';

export interface BuildAppOptions {
  config: BffConfig;
  lifecycle?: LifecycleState;
  client?: WorkServicePort;
  rateLimiter?: TokenBucketRateLimiter;
  logger?: boolean;
}

export interface BuiltApp {
  app: FastifyInstance;
  lifecycle: LifecycleState;
}

const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

export function buildApp(options: BuildAppOptions): BuiltApp {
  const { config } = options;
  const lifecycle = options.lifecycle ?? new LifecycleState();
  const client = options.client ?? new WorkServiceClient(config.workServiceBaseUrl, {
    requestTimeoutMs: config.requestTimeoutMs,
    retryMaxAttempts: config.retryMaxAttempts,
    retryBaseDelayMs: config.retryBaseDelayMs
  });
  const rateLimiter = options.rateLimiter ?? new TokenBucketRateLimiter(
    config.rateLimitCapacity,
    config.rateLimitRefillPerSecond
  );

  const app = Fastify({
    logger: options.logger ?? true,
    genReqId: (rawRequest) => {
      const supplied = rawRequest.headers['x-request-id'];
      if (typeof supplied === 'string' && supplied.length >= 1 && supplied.length <= 128) return supplied;
      return randomUUID();
    }
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
    if (request.url === '/healthz') return;

    if (!lifecycle.isReady()) {
      return reply.code(503).send(edgeError(request.id, 'service is draining', 'DRAINING'));
    }
    if (request.url === '/readyz') return;

    const decision = rateLimiter.check(request.ip);
    if (!decision.allowed) {
      reply.header('retry-after', String(decision.retryAfterSeconds));
      return reply.code(429).send(edgeError(request.id, 'request rate limit exceeded', 'RATE_LIMITED'));
    }
  });

  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async () => ({ status: 'ready' }));

  app.get<{ Querystring: { limit?: number } }>(
    '/v1/work-items',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 } }
        }
      }
    },
    async (request, reply) => {
      const result = await withRequestContext(request, (context) => client.list(request.query.limit ?? 50, context));
      return reply.code(result.status).send(result.body);
    }
  );

  app.get<{ Params: { workItemId: string } }>(
    '/v1/work-items/:workItemId',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['workItemId'],
          properties: { workItemId: { type: 'string', pattern: UUID_PATTERN } }
        }
      }
    },
    async (request, reply) => {
      const result = await withRequestContext(request, (context) => client.get(request.params.workItemId, context));
      return reply.code(result.status).send(result.body);
    }
  );

  app.post<{
    Headers: { 'idempotency-key': string };
    Body: CreateWorkItemRequest;
  }>(
    '/v1/work-items',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['idempotency-key'],
          properties: {
            'idempotency-key': { type: 'string', minLength: 8, maxLength: 128 }
          }
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { anyOf: [{ type: 'string', maxLength: 4000 }, { type: 'null' }] }
          }
        }
      }
    },
    async (request, reply) => {
      const key = request.headers['idempotency-key'];
      const result = await withRequestContext(request, (context) => client.create(request.body, key, context));
      const replayed = result.headers['idempotency-replayed'];
      if (replayed !== undefined) reply.header('idempotency-replayed', replayed);
      return reply.code(result.status).send(result.body);
    }
  );

  app.post<{
    Headers: { 'idempotency-key': string; 'if-match': string };
    Params: { workItemId: string };
    Body: TransitionWorkItemRequest;
  }>(
    '/v1/work-items/:workItemId/transitions',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['idempotency-key', 'if-match'],
          properties: {
            'idempotency-key': { type: 'string', minLength: 8, maxLength: 128 },
            'if-match': { type: 'string', pattern: '^[0-9]+$' }
          }
        },
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['workItemId'],
          properties: { workItemId: { type: 'string', pattern: UUID_PATTERN } }
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['action'],
          properties: {
            action: { type: 'string', enum: ['CLAIM', 'COMPLETE', 'RELEASE', 'CANCEL'] }
          }
        }
      }
    },
    async (request, reply) => {
      const expectedVersion = Number(request.headers['if-match']);
      const result = await withRequestContext(request, (context) => client.transition(
        request.params.workItemId,
        expectedVersion,
        request.body,
        request.headers['idempotency-key'],
        context
      ));
      const replayed = result.headers['idempotency-replayed'];
      if (replayed !== undefined) reply.header('idempotency-replayed', replayed);
      return reply.code(result.status).send(result.body);
    }
  );

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation !== undefined) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: error.message,
        requestId: request.id,
        details: { validation: error.validation }
      } satisfies ApiError);
    }
    if (error instanceof UpstreamHttpError) {
      if (error.body !== null) return reply.code(error.status).send(error.body);
      return reply.code(502).send(edgeError(request.id, 'upstream returned an invalid error body', 'UPSTREAM_BAD_RESPONSE'));
    }
    if (error instanceof UpstreamTimeoutError) {
      return reply.code(504).send(edgeError(request.id, 'upstream request timed out', 'UPSTREAM_TIMEOUT'));
    }
    if (error instanceof UpstreamUnavailableError) {
      return reply.code(502).send(edgeError(request.id, 'upstream service is unavailable', 'UPSTREAM_UNAVAILABLE'));
    }
    if (error instanceof UpstreamProtocolError) {
      return reply.code(502).send(edgeError(request.id, 'upstream response violated the contract', 'UPSTREAM_PROTOCOL_ERROR'));
    }
    if (error instanceof UpstreamCancelledError) {
      return reply.code(499).send(edgeError(request.id, 'request was cancelled', 'CALLER_CANCELLED'));
    }

    request.log.error({ err: error }, 'unhandled BFF error');
    return reply.code(500).send(edgeError(request.id, 'unexpected BFF failure', 'BFF_INTERNAL_ERROR'));
  });

  return { app, lifecycle };
}

function edgeError(requestId: string, message: string, reason: string): ApiError {
  return {
    code: 'INTERNAL_ERROR',
    message,
    requestId,
    details: { reason }
  };
}

async function withRequestContext<T>(
  request: FastifyRequest,
  operation: (context: RequestContext) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const abort = (): void => controller.abort(new Error('caller disconnected'));
  request.raw.once('aborted', abort);
  try {
    return await operation({ requestId: request.id, signal: controller.signal });
  } finally {
    request.raw.removeListener('aborted', abort);
  }
}
