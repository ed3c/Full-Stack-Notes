import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError, type WorkQueueApi } from './api.js';
import type { CreateWorkItemRequest, TransitionAction, WorkItem } from './contracts.js';

export type LoadPhase = 'loading' | 'empty' | 'ready';

export interface WorkQueueModel {
  items: WorkItem[];
  phase: LoadPhase;
  error: string | null;
  notice: string | null;
  creating: boolean;
  pendingIds: ReadonlySet<string>;
  refresh(): Promise<void>;
  create(request: CreateWorkItemRequest): Promise<boolean>;
  transition(item: WorkItem, action: TransitionAction): Promise<void>;
}

export function useWorkQueue(
  api: WorkQueueApi,
  idempotencyKeyFactory: () => string = defaultIdempotencyKey
): WorkQueueModel {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const loadEpoch = useRef(0);
  const dataRevision = useRef(0);
  const mutationEpochs = useRef(new Map<string, number>());

  const commitItem = useCallback((item: WorkItem): void => {
    dataRevision.current += 1;
    setItems((current) => upsert(current, item));
    setPhase('ready');
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const epoch = ++loadEpoch.current;
    const revisionAtStart = dataRevision.current;
    setError(null);
    setPhase('loading');
    try {
      const nextItems = await api.list();
      if (epoch !== loadEpoch.current || revisionAtStart !== dataRevision.current) return;
      setItems(nextItems);
      setPhase(nextItems.length === 0 ? 'empty' : 'ready');
    } catch (failure) {
      if (epoch !== loadEpoch.current) return;
      setError(messageFor(failure));
      setPhase((current) => current === 'loading' ? 'empty' : current);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (request: CreateWorkItemRequest): Promise<boolean> => {
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const created = await api.create(request, idempotencyKeyFactory());
      commitItem(created);
      return true;
    } catch (failure) {
      setError(messageFor(failure));
      return false;
    } finally {
      setCreating(false);
    }
  }, [api, commitItem, idempotencyKeyFactory]);

  const transition = useCallback(async (item: WorkItem, action: TransitionAction): Promise<void> => {
    const nextEpoch = (mutationEpochs.current.get(item.id) ?? 0) + 1;
    mutationEpochs.current.set(item.id, nextEpoch);
    setPendingIds((current) => addToSet(current, item.id));
    setError(null);
    setNotice(null);

    try {
      const updated = await api.transition(item.id, item.version, action, idempotencyKeyFactory());
      if (mutationEpochs.current.get(item.id) !== nextEpoch) return;
      commitItem(updated);
    } catch (failure) {
      if (mutationEpochs.current.get(item.id) !== nextEpoch) return;
      if (failure instanceof ApiClientError && failure.status === 409) {
        try {
          const latest = await api.get(item.id);
          if (mutationEpochs.current.get(item.id) !== nextEpoch) return;
          commitItem(latest);
          setNotice('Conflict detected. Your change was not confirmed; the latest server state was loaded.');
        } catch (reconcileFailure) {
          setError(`Conflict detected and reconciliation failed: ${messageFor(reconcileFailure)}`);
        }
      } else {
        setError(messageFor(failure));
      }
    } finally {
      if (mutationEpochs.current.get(item.id) === nextEpoch) {
        setPendingIds((current) => removeFromSet(current, item.id));
      }
    }
  }, [api, commitItem, idempotencyKeyFactory]);

  return { items, phase, error, notice, creating, pendingIds, refresh, create, transition };
}

function upsert(items: WorkItem[], next: WorkItem): WorkItem[] {
  const index = items.findIndex((item) => item.id === next.id);
  if (index === -1) return [next, ...items];
  return items.map((item) => item.id === next.id ? next : item);
}

function addToSet(current: Set<string>, value: string): Set<string> {
  const next = new Set(current);
  next.add(value);
  return next;
}

function removeFromSet(current: Set<string>, value: string): Set<string> {
  const next = new Set(current);
  next.delete(value);
  return next;
}

function messageFor(failure: unknown): string {
  return failure instanceof Error ? failure.message : 'Unexpected request failure';
}

function defaultIdempotencyKey(): string {
  return `web-${crypto.randomUUID()}`;
}
