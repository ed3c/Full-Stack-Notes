import type { WorkItem } from '../src/contracts.js';

export const OPEN_ITEM: WorkItem = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Investigate alert',
  description: 'Customer-visible latency',
  status: 'OPEN',
  version: 1,
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z'
};

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
