export type WorkItemStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TransitionAction = 'CLAIM' | 'COMPLETE' | 'RELEASE' | 'CANCEL';

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItemList {
  items: WorkItem[];
}

export interface CreateWorkItemRequest {
  title: string;
  description?: string | null;
}

export interface TransitionWorkItemRequest {
  action: TransitionAction;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'IDEMPOTENCY_CONFLICT'
  | 'VERSION_CONFLICT'
  | 'INVALID_TRANSITION'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  requestId: string;
  details?: Record<string, unknown> | null;
}

const STATUSES = new Set<WorkItemStatus>(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']);
const ERROR_CODES = new Set<ApiErrorCode>([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'IDEMPOTENCY_CONFLICT',
  'VERSION_CONFLICT',
  'INVALID_TRANSITION',
  'INTERNAL_ERROR'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isApiError(value: unknown): value is ApiError {
  if (!isRecord(value)) return false;
  return (
    typeof value.code === 'string' &&
    ERROR_CODES.has(value.code as ApiErrorCode) &&
    typeof value.message === 'string' &&
    typeof value.requestId === 'string'
  );
}

export function parseWorkItem(value: unknown): WorkItem {
  if (!isRecord(value)) throw new Error('upstream WorkItem must be an object');
  if (typeof value.id !== 'string') throw new Error('upstream WorkItem.id must be a string');
  if (typeof value.title !== 'string') throw new Error('upstream WorkItem.title must be a string');
  if (value.description !== null && typeof value.description !== 'string') {
    throw new Error('upstream WorkItem.description must be string|null');
  }
  if (typeof value.status !== 'string' || !STATUSES.has(value.status as WorkItemStatus)) {
    throw new Error('upstream WorkItem.status is invalid');
  }
  if (!Number.isInteger(value.version) || (value.version as number) < 1) {
    throw new Error('upstream WorkItem.version must be a positive integer');
  }
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') {
    throw new Error('upstream WorkItem timestamps must be strings');
  }

  return {
    id: value.id,
    title: value.title,
    description: value.description,
    status: value.status as WorkItemStatus,
    version: value.version as number,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

export function parseWorkItemList(value: unknown): WorkItemList {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error('upstream work-item list must contain an items array');
  }
  return { items: value.items.map(parseWorkItem) };
}
