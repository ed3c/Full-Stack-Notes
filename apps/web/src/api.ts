import {
  parseApiError,
  parseWorkItem,
  parseWorkItemList,
  type ApiErrorBody,
  type CreateWorkItemRequest,
  type TransitionAction,
  type WorkItem
} from './contracts.js';

export interface WorkQueueApi {
  list(): Promise<WorkItem[]>;
  get(workItemId: string): Promise<WorkItem>;
  create(request: CreateWorkItemRequest, idempotencyKey: string): Promise<WorkItem>;
  transition(workItemId: string, expectedVersion: number, action: TransitionAction, idempotencyKey: string): Promise<WorkItem>;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody | null
  ) {
    super(body?.message ?? `API request failed with HTTP ${status}`);
  }
}

export class ApiProtocolError extends Error {
  constructor(cause?: unknown) {
    super('API response violated the frozen Work Queue contract', { cause });
  }
}

export class HttpWorkQueueApi implements WorkQueueApi {
  constructor(private readonly baseUrl = '') {}

  async list(): Promise<WorkItem[]> {
    const response = await this.request('/v1/work-items?limit=100', { method: 'GET' });
    try {
      return parseWorkItemList(response);
    } catch (error) {
      throw new ApiProtocolError(error);
    }
  }

  async get(workItemId: string): Promise<WorkItem> {
    const response = await this.request(`/v1/work-items/${encodeURIComponent(workItemId)}`, { method: 'GET' });
    try {
      return parseWorkItem(response);
    } catch (error) {
      throw new ApiProtocolError(error);
    }
  }

  async create(request: CreateWorkItemRequest, idempotencyKey: string): Promise<WorkItem> {
    const response = await this.request('/v1/work-items', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify(request)
    });
    try {
      return parseWorkItem(response);
    } catch (error) {
      throw new ApiProtocolError(error);
    }
  }

  async transition(
    workItemId: string,
    expectedVersion: number,
    action: TransitionAction,
    idempotencyKey: string
  ): Promise<WorkItem> {
    const response = await this.request(`/v1/work-items/${encodeURIComponent(workItemId)}/transitions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
        'if-match': String(expectedVersion)
      },
      body: JSON.stringify({ action })
    });
    try {
      return parseWorkItem(response);
    } catch (error) {
      throw new ApiProtocolError(error);
    }
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const requestId = crypto.randomUUID();
    const headers = new Headers(init.headers);
    headers.set('x-request-id', requestId);
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const text = await response.text();
    const body = text.length === 0 ? null : parseJson(text);
    if (!response.ok) throw new ApiClientError(response.status, parseApiError(body));
    return body;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new ApiProtocolError(error);
  }
}
