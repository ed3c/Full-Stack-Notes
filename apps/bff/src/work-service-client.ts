import {
  isApiError,
  parseWorkItem,
  parseWorkItemList,
  type ApiError,
  type CreateWorkItemRequest,
  type TransitionWorkItemRequest,
  type WorkItem,
  type WorkItemList
} from './contracts.js';

export interface RequestContext {
  requestId: string;
  signal?: AbortSignal;
}

export interface UpstreamResponse<T> {
  status: number;
  body: T;
  headers: Record<string, string>;
}

export interface WorkServicePort {
  list(limit: number, context: RequestContext): Promise<UpstreamResponse<WorkItemList>>;
  get(workItemId: string, context: RequestContext): Promise<UpstreamResponse<WorkItem>>;
  create(
    request: CreateWorkItemRequest,
    idempotencyKey: string,
    context: RequestContext
  ): Promise<UpstreamResponse<WorkItem>>;
  transition(
    workItemId: string,
    expectedVersion: number,
    request: TransitionWorkItemRequest,
    idempotencyKey: string,
    context: RequestContext
  ): Promise<UpstreamResponse<WorkItem>>;
}

export class UpstreamHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError | null
  ) {
    super(`upstream returned HTTP ${status}`);
  }
}

export class UpstreamTimeoutError extends Error {
  constructor() {
    super('upstream request deadline exceeded');
  }
}

export class UpstreamUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('upstream request failed', { cause });
  }
}

export class UpstreamCancelledError extends Error {
  constructor() {
    super('caller cancelled upstream request');
  }
}

export class UpstreamProtocolError extends Error {
  constructor(cause?: unknown) {
    super('upstream response violated the frozen contract', { cause });
  }
}

interface ClientPolicy {
  requestTimeoutMs: number;
  retryMaxAttempts: number;
  retryBaseDelayMs: number;
}

interface RequestSpec<T> {
  method: 'GET' | 'POST';
  path: string;
  successStatus: number;
  context: RequestContext;
  body?: unknown;
  idempotencyKey?: string;
  ifMatch?: number;
  parse: (value: unknown) => T;
}

export class WorkServiceClient implements WorkServicePort {
  constructor(
    private readonly baseUrl: string,
    private readonly policy: ClientPolicy
  ) {}

  list(limit: number, context: RequestContext): Promise<UpstreamResponse<WorkItemList>> {
    return this.request({
      method: 'GET',
      path: `/v1/work-items?limit=${encodeURIComponent(String(limit))}`,
      successStatus: 200,
      context,
      parse: parseWorkItemList
    });
  }

  get(workItemId: string, context: RequestContext): Promise<UpstreamResponse<WorkItem>> {
    return this.request({
      method: 'GET',
      path: `/v1/work-items/${encodeURIComponent(workItemId)}`,
      successStatus: 200,
      context,
      parse: parseWorkItem
    });
  }

  create(
    request: CreateWorkItemRequest,
    idempotencyKey: string,
    context: RequestContext
  ): Promise<UpstreamResponse<WorkItem>> {
    if (idempotencyKey.length === 0) throw new Error('mutation retry policy requires an idempotency key');
    return this.request({
      method: 'POST',
      path: '/v1/work-items',
      successStatus: 201,
      context,
      body: request,
      idempotencyKey,
      parse: parseWorkItem
    });
  }

  transition(
    workItemId: string,
    expectedVersion: number,
    request: TransitionWorkItemRequest,
    idempotencyKey: string,
    context: RequestContext
  ): Promise<UpstreamResponse<WorkItem>> {
    if (idempotencyKey.length === 0) throw new Error('mutation retry policy requires an idempotency key');
    return this.request({
      method: 'POST',
      path: `/v1/work-items/${encodeURIComponent(workItemId)}/transitions`,
      successStatus: 200,
      context,
      body: request,
      idempotencyKey,
      ifMatch: expectedVersion,
      parse: parseWorkItem
    });
  }

  private async request<T>(spec: RequestSpec<T>): Promise<UpstreamResponse<T>> {
    const deadlineMs = Date.now() + this.policy.requestTimeoutMs;
    const retrySafe = spec.method === 'GET' || Boolean(spec.idempotencyKey);
    let lastNetworkError: unknown;

    for (let attempt = 1; attempt <= this.policy.retryMaxAttempts; attempt += 1) {
      if (spec.context.signal?.aborted) throw new UpstreamCancelledError();
      const remainingMs = deadlineMs - Date.now();
      if (remainingMs <= 0) throw new UpstreamTimeoutError();

      const controller = new AbortController();
      let timedOut = false;
      const onCallerAbort = (): void => controller.abort(spec.context.signal?.reason);
      spec.context.signal?.addEventListener('abort', onCallerAbort, { once: true });
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort(new Error('upstream deadline exceeded'));
      }, remainingMs);

      try {
        const headers: Record<string, string> = {
          accept: 'application/json',
          'x-request-id': spec.context.requestId
        };
        if (spec.body !== undefined) headers['content-type'] = 'application/json';
        if (spec.idempotencyKey !== undefined) headers['idempotency-key'] = spec.idempotencyKey;
        if (spec.ifMatch !== undefined) headers['if-match'] = String(spec.ifMatch);

        const response = await fetch(`${this.baseUrl}${spec.path}`, {
          method: spec.method,
          headers,
          body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
          signal: controller.signal
        });

        const rawBody = await readJson(response);
        if (response.status === spec.successStatus) {
          try {
            return {
              status: response.status,
              body: spec.parse(rawBody),
              headers: Object.fromEntries(response.headers.entries())
            };
          } catch (error) {
            throw new UpstreamProtocolError(error);
          }
        }

        if (
          retrySafe &&
          isRetryableStatus(response.status) &&
          attempt < this.policy.retryMaxAttempts &&
          await this.waitBeforeRetry(attempt, deadlineMs, spec.context.signal)
        ) {
          continue;
        }

        throw new UpstreamHttpError(response.status, isApiError(rawBody) ? rawBody : null);
      } catch (error) {
        if (error instanceof UpstreamHttpError || error instanceof UpstreamProtocolError) throw error;
        if (spec.context.signal?.aborted) throw new UpstreamCancelledError();
        if (timedOut) throw new UpstreamTimeoutError();

        lastNetworkError = error;
        if (
          retrySafe &&
          attempt < this.policy.retryMaxAttempts &&
          await this.waitBeforeRetry(attempt, deadlineMs, spec.context.signal)
        ) {
          continue;
        }
        throw new UpstreamUnavailableError(lastNetworkError);
      } finally {
        clearTimeout(timeout);
        spec.context.signal?.removeEventListener('abort', onCallerAbort);
      }
    }

    throw new UpstreamUnavailableError(lastNetworkError);
  }

  private async waitBeforeRetry(
    attempt: number,
    deadlineMs: number,
    signal?: AbortSignal
  ): Promise<boolean> {
    const delayMs = this.policy.retryBaseDelayMs * 2 ** (attempt - 1);
    if (Date.now() + delayMs >= deadlineMs) return false;
    await delay(delayMs, signal);
    return true;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new UpstreamProtocolError(error);
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timeout);
      reject(new UpstreamCancelledError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
