import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ApiClientError, type WorkQueueApi } from '../src/api.js';
import type { CreateWorkItemRequest, TransitionAction, WorkItem } from '../src/contracts.js';
import { WorkQueueScreen } from '../src/work-queue.js';
import { deferred, OPEN_ITEM } from './helpers.js';

afterEach(() => cleanup());

const keyFactory = () => 'web-test-idempotency-key-0001';

function inertApi(overrides: Partial<WorkQueueApi> = {}): WorkQueueApi {
  return {
    list: async () => [],
    get: async () => OPEN_ITEM,
    create: async (_request: CreateWorkItemRequest) => OPEN_ITEM,
    transition: async (_id: string, _version: number, _action: TransitionAction) => OPEN_ITEM,
    ...overrides
  };
}

test('older list response cannot overwrite a newer refresh result', async () => {
  const first = deferred<WorkItem[]>();
  const second = deferred<WorkItem[]>();
  let calls = 0;
  const api = inertApi({ list: () => (++calls === 1 ? first.promise : second.promise) });
  const user = userEvent.setup();
  render(<WorkQueueScreen api={api} idempotencyKeyFactory={keyFactory} />);

  await waitFor(() => assert.equal(calls, 1));
  await user.click(screen.getByRole('button', { name: 'Refresh' }));
  await waitFor(() => assert.equal(calls, 2));

  const fresh = { ...OPEN_ITEM, title: 'Fresh server result', version: 2 };
  second.resolve([fresh]);
  await screen.findByText('Fresh server result');
  first.resolve([{ ...OPEN_ITEM, title: 'Stale server result' }]);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(screen.queryByText('Stale server result'), null);
  assert.ok(screen.getByText('Fresh server result'));
});

test('list response started before a confirmed mutation cannot roll back the mutation', async () => {
  const initialList = deferred<WorkItem[]>();
  const created = { ...OPEN_ITEM, title: 'Confirmed after load started', version: 1 };
  const api = inertApi({
    list: () => initialList.promise,
    create: async () => created
  });
  const user = userEvent.setup();
  render(<WorkQueueScreen api={api} idempotencyKeyFactory={keyFactory} />);

  await screen.findByText('Loading queue…');
  await user.type(screen.getByLabelText('Title'), created.title);
  await user.keyboard('{Enter}');
  assert.ok(await screen.findByRole('heading', { name: created.title }));

  initialList.resolve([]);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.ok(screen.getByRole('heading', { name: created.title }));
  assert.equal(screen.queryByText('No work items yet.'), null);
});

test('failed create shows pending state but never inserts a false confirmed item', async () => {
  const createResult = deferred<WorkItem>();
  const api = inertApi({ create: () => createResult.promise });
  const user = userEvent.setup();
  render(<WorkQueueScreen api={api} idempotencyKeyFactory={keyFactory} />);

  await screen.findByText('No work items yet.');
  const title = screen.getByLabelText('Title');
  await user.type(title, 'Draft task');
  await user.keyboard('{Enter}');
  assert.ok(await screen.findByRole('button', { name: 'Creating…' }));
  assert.equal(screen.queryByRole('heading', { name: 'Draft task' }), null);

  createResult.reject(new Error('create failed'));
  assert.ok(await screen.findByRole('alert'));
  assert.equal(screen.queryByRole('heading', { name: 'Draft task' }), null);
});

test('409 transition conflict re-reads canonical server state instead of showing false success', async () => {
  const latest = { ...OPEN_ITEM, status: 'IN_PROGRESS' as const, version: 2 };
  const api = inertApi({
    list: async () => [OPEN_ITEM],
    transition: async () => { throw new ApiClientError(409, { code: 'VERSION_CONFLICT', message: 'stale', requestId: 'r1' }); },
    get: async () => latest
  });
  const user = userEvent.setup();
  render(<WorkQueueScreen api={api} idempotencyKeyFactory={keyFactory} />);

  await screen.findByText('Investigate alert');
  await user.click(screen.getByRole('button', { name: 'Claim' }));
  assert.ok(await screen.findByText('IN PROGRESS'));
  const notice = await screen.findByRole('status');
  assert.match(notice.textContent ?? '', /latest server state was loaded/i);
  assert.ok(screen.getByText('Version 2'));
});
