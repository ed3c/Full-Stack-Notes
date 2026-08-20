import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import test, { afterEach } from 'node:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { HttpWorkQueueApi } from '../src/api.js';
import { WorkQueueScreen } from '../src/work-queue.js';

const requestIds = {
  initialList: '00000000-0000-4000-8000-000000000001',
  create: '11111111-1111-4111-8111-111111111111',
  claim: '22222222-2222-4222-8222-222222222222',
  complete: '33333333-3333-4333-8333-333333333333',
  refresh: '44444444-4444-4444-8444-444444444444',
  finalList: '55555555-5555-4555-8555-555555555555'
} as const;

const idempotencyKeys = [
  'e2e-create-key-0001',
  'e2e-claim-key-0001',
  'e2e-complete-key-0001'
] as const;

const title = 'PR5 deterministic runtime item';
const description = 'Created through the React component, live BFF, Java service, and PostgreSQL.';

afterEach(() => cleanup());

test('React component completes the live create -> claim -> complete journey', async () => {
  const baseUrl = process.env.E2E_BFF_URL;
  assert.ok(baseUrl, 'E2E_BFF_URL is required');
  const receiptPath = process.env.E2E_UI_RECEIPT_PATH;
  assert.ok(receiptPath, 'E2E_UI_RECEIPT_PATH is required');

  const originalFetch = globalThis.fetch;
  const queuedRequestIds = Object.values(requestIds);
  const observedRequestIds: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const nextRequestId = queuedRequestIds.shift();
    assert.ok(nextRequestId, 'unexpected extra HTTP request from the React runtime');
    const headers = new Headers(init?.headers);
    headers.set('x-request-id', nextRequestId);
    observedRequestIds.push(nextRequestId);
    return originalFetch(input, { ...init, headers });
  };

  let keyIndex = 0;
  const api = new HttpWorkQueueApi(baseUrl);
  try {
    const user = userEvent.setup();
    render(
      <WorkQueueScreen
        api={api}
        idempotencyKeyFactory={() => {
          const key = idempotencyKeys[keyIndex];
          assert.ok(key, 'unexpected extra mutation from the React runtime');
          keyIndex += 1;
          return key;
        }}
      />
    );

    await screen.findByText('No work items yet.');
    await user.type(screen.getByLabelText('Title'), title);
    await user.type(screen.getByLabelText('Description'), description);
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    await screen.findByRole('heading', { name: title });
    assert.ok(screen.getByText('OPEN'));
    assert.ok(screen.getByText('Version 1'));

    await user.click(screen.getByRole('button', { name: 'Claim' }));
    await waitFor(() => {
      assert.ok(screen.getByText('IN PROGRESS'));
      assert.ok(screen.getByText('Version 2'));
    });

    await user.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => {
      assert.ok(screen.getByText('DONE'));
      assert.ok(screen.getByText('Version 3'));
    });

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => {
      assert.ok(screen.getByText('DONE'));
      assert.ok(screen.getByText('Version 3'));
    });

    const items = await api.list();
    const item = items.find((candidate) => candidate.title === title);
    assert.ok(item, 'final canonical list does not contain the created item');
    assert.equal(item.status, 'DONE');
    assert.equal(item.version, 3);
    assert.equal(keyIndex, idempotencyKeys.length);
    assert.deepEqual(observedRequestIds, Object.values(requestIds));

    await writeFile(
      receiptPath,
      JSON.stringify(
        {
          result: 'PASS',
          scenario: 'React -> BFF -> Java -> PostgreSQL create/claim/complete',
          item: {
            id: item.id,
            title: item.title,
            status: item.status,
            version: item.version
          },
          requestIds,
          idempotencyKeys,
          observedRequestIds
        },
        null,
        2
      ) + '\n',
      'utf8'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
