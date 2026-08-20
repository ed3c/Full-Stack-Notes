import {
  TRANSITION_ACTIONS,
  WORK_ITEM_STATUSES,
  type TransitionAction,
  type WorkItemStatus
} from './contract-generated.js';

export type { TransitionAction, WorkItemStatus };

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkItemRequest {
  title: string;
  description?: string | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown> | null;
}

export function isTransitionAction(value: string): value is TransitionAction {
  return (TRANSITION_ACTIONS as readonly string[]).includes(value);
}

export function parseWorkItem(value: unknown): WorkItem {
  if (!isRecord(value)) throw new Error('work item must be an object');
  if (typeof value.id !== 'string' || typeof value.title !== 'string') throw new Error('work item identity/title invalid');
  if (!(WORK_ITEM_STATUSES as readonly unknown[]).includes(value.status)) throw new Error('work item status invalid');
  if (!Number.isInteger(value.version) || (value.version as number) < 1) throw new Error('work item version invalid');
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') throw new Error('work item timestamps invalid');
  if (!(typeof value.description === 'string' || value.description === null)) throw new Error('work item description invalid');
  return value as unknown as WorkItem;
}

export function parseWorkItemList(value: unknown): WorkItem[] {
  if (!isRecord(value) || !Array.isArray(value.items)) throw new Error('work item list invalid');
  return value.items.map(parseWorkItem);
}

export function parseApiError(value: unknown): ApiErrorBody | null {
  if (!isRecord(value)) return null;
  if (typeof value.code !== 'string' || typeof value.message !== 'string' || typeof value.requestId !== 'string') return null;
  return {
    code: value.code,
    message: value.message,
    requestId: value.requestId,
    details: isRecord(value.details) ? value.details : value.details === null ? null : undefined
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
