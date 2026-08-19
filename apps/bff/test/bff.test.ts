import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { BffConfig } from '../src/config.js';
import type {
  CreateWorkItemRequest,
  TransitionWorkItemRequest,
  WorkItem,
  WorkItemList
} from '../src/contracts.js';
import { installShutdownHandlers, LifecycleState, type SignalSource } from '../src/lifecycle.js';
import { TokenBucketRateLimiter } from '../src/rate-limit.js';
import {
  UpstreamTimeoutError,
  WorkServiceClient,
  type RequestContext,
  type UpstreamResponse,
  type WorkServicePort
} from '../src/work-service-client.js';

const ITEM: WorkItem = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Investigate alert',
  description: null,
  status: 'OPEN',
  version: 1,
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z'
};

class FakeWorkService implements WorkServicePort {
  lastRequestId: string | undefined;
  createCalls = 0;

  async list(_limit: number, context: RequestContext): Promise<UpstreamResponse<WorkItemList>> {
    this.lastRequestId = context.requestId;
    return { status: 200, body: { items: [ITEM] }, headers: {} };
  }

  async get(_id: string, context: RequestContext): Promise<UpstreamResponse<WorkItem>> {
    this.lastRequestId = context.requestId;
    return { status: 200, body: ITEM, headers: {} };
  }

  async create(
    _request: CreateWorkItemRequest,
    _key: string,
    context: RequestContext
  ): Promise<UpstreamResponse<WorkItem>> {
    this.createCalls += 1;
    this.lastRequestId = context.requestId;
    return { status: 201, body: ITEM, headers: { 'idempotency-replayed': 'false' } };
  }

  async transition(
    _id: string,
    _version: number,
    _request: TransitionWorkItemRequest,
    _key: string,
    context: RequestContext
  ): Promise<UpstreamResponse<WorkItem>> {
    this.lastRequestId = context.requestId;
    return { status: 200, body: { ...ITEM, status: 'IN_PROGRESS', version: 2 }, headers: {} };
  }
}

function config(overrides: Partial<BffConfig> = {}): BffConfig {
  return {
    host: '127.0.0.1',
    port: 3000,
    workServiceBaseUrl: 'http://127.0.0.1:8080',
    requestTimeoutMs: 250,
    retryMaxAttempts: 2,
    retryBaseDelayMs: 5,
    rateLimitCapacity: 20,
    rateLimitRefillPerSecond: 10,
    shutdownTimeoutMs: 100,
    ...overrides
  };
}

test('propagates request ID and preserves typed success shape', async () => {
  const fake = new FakeWorkService();
  const { app } = buildApp({ config: config(), client: fake, logger: false });
  const response = await app.inject({
    method: 'GET',
    url: '/v1/work-items?limit=10',
    headers: { 'x-request-id': 'request-123' }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(fake.lastRequestId, 'request-123');
  assert.equal(response.headers['x-request-id'], 'request-123');
  assert.deepEqual(response.json(), { items: [ITEM] });
  await app.close();
});

test('rejects mutation without idempotency key before reaching upstream', async () => {
  const fake = new FakeWorkService();
  const { app } = buildApp({ config: config(), client: fake, logger: false });
  const response = await app.inject({
    method: 'POST',
    url: '/v1/work-items',
    payload: { title: 'No key' }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(fake.createCalls, 0);
  assert.equal(response.json().code, 'VALIDATION_ERROR');
  await app.close();
});

test('process-local token bucket returns typed 429 without calling upstream twice', async () => {
  const fake = new FakeWorkService();
  const limiter = new TokenBucketRateLimiter(1, 0, () => 1000);
  const { app } = buildApp({ config: config(), client: fake, rateLimiter: limiter, logger: false });

  const first = await app.inject({ method: 'GET', url: '/v1/work-items' });
  const second = await app.inject({ method: 'GET', url: '/v1/work-items' });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 429);
  assert.equal(second.json().details.reason, 'RATE_LIMITED');
  assert.equal(second.headers['retry-after'], '60');
  await app.close();
});

test('GET retries a retryable upstream response within the bounded policy', async () => {
  let attempts = 0;
  const server = createServer((_request, response) => {
    attempts += 1;
    response.setHeader('content-type', 'application/json');
    if (attempts === 1) {
      response.statusCode = 503;
      response.end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'busy', requestId: 'retry-test' }));
      return;
    }
    response.statusCode = 200;
    response.end(JSON.stringify({ items: [ITEM] }));
  });
  const baseUrl = await listen(server);

  try {
    const client = new WorkServiceClient(baseUrl, {
      requestTimeoutMs: 500,
      retryMaxAttempts: 2,
      retryBaseDelayMs: 5
    });
    const result = await client.list(50, { requestId: 'retry-test' });
    assert.equal(result.status, 200);
    assert.equal(attempts, 2);
  } finally {
    await close(server);
  }
});

test('upstream deadline is bounded and exposed as a typed user-facing failure', async () => {
  const server = createServer((_request, response) => {
    setTimeout(() => {
      if (!response.writableEnded) {
        response.statusCode = 200;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ items: [ITEM] }));
      }
    }, 150);
  });
  const baseUrl = await listen(server);

  try {
    const client = new WorkServiceClient(baseUrl, {
      requestTimeoutMs: 30,
      retryMaxAttempts: 2,
      retryBaseDelayMs: 5
    });
    await assert.rejects(
      client.list(50, { requestId: 'timeout-test' }),
      UpstreamTimeoutError
    );

    const timeoutPort = new FakeWorkService();
    timeoutPort.list = async (): Promise<UpstreamResponse<WorkItemList>> => {
      throw new UpstreamTimeoutError();
    };
    const { app } = buildApp({ config: config(), client: timeoutPort, logger: false });
    const response = await app.inject({ method: 'GET', url: '/v1/work-items' });
    assert.equal(response.statusCode, 504);
    assert.equal(response.json().details.reason, 'UPSTREAM_TIMEOUT');
    await app.close();
  } finally {
    await close(server);
  }
});

test('draining flips readiness and bounded shutdown forces exit on timeout', async () => {
  const lifecycle = new LifecycleState();
  const fake = new FakeWorkService();
  const { app } = buildApp({ config: config(), client: fake, lifecycle, logger: false });
  lifecycle.beginDrain();

  const ready = await app.inject({ method: 'GET', url: '/readyz' });
  const work = await app.inject({ method: 'GET', url: '/v1/work-items' });
  assert.equal(ready.statusCode, 503);
  assert.equal(work.statusCode, 503);
  assert.equal(work.json().details.reason, 'DRAINING');
  await app.close();

  const source = new EventEmitter() as unknown as SignalSource;
  const timeoutLifecycle = new LifecycleState();
  let forcedExitCode: number | undefined;
  const controller = installShutdownHandlers(
    source,
    { close: () => new Promise<void>(() => undefined) },
    timeoutLifecycle,
    10,
    (code) => { forcedExitCode = code; }
  );

  source.emit('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(timeoutLifecycle.isDraining(), true);
  assert.equal(forcedExitCode, 1);
  controller.dispose();
});

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
