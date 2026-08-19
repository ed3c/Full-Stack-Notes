import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import type { WorkItem } from '../src/contracts.js';
import { UpstreamHttpError, WorkServiceClient } from '../src/work-service-client.js';

const ITEM: WorkItem = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Retry-safe mutation',
  description: null,
  status: 'OPEN',
  version: 1,
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z'
};

const POLICY = {
  requestTimeoutMs: 500,
  retryMaxAttempts: 2,
  retryBaseDelayMs: 5
};

test('mutation retry keeps the same idempotency key and request ID across retryable attempts', async () => {
  let attempts = 0;
  const idempotencyKeys: Array<string | undefined> = [];
  const requestIds: Array<string | undefined> = [];
  const server = createServer((request, response) => {
    attempts += 1;
    idempotencyKeys.push(request.headers['idempotency-key']);
    requestIds.push(request.headers['x-request-id']);
    response.setHeader('content-type', 'application/json');

    if (attempts === 1) {
      response.statusCode = 503;
      response.end(JSON.stringify({
        code: 'INTERNAL_ERROR',
        message: 'temporarily unavailable',
        requestId: 'mutation-retry-request'
      }));
      return;
    }

    response.statusCode = 201;
    response.setHeader('idempotency-replayed', 'false');
    response.end(JSON.stringify(ITEM));
  });
  const baseUrl = await listen(server);

  try {
    const client = new WorkServiceClient(baseUrl, POLICY);
    const result = await client.create(
      { title: ITEM.title, description: ITEM.description },
      'mutation-retry-key-0001',
      { requestId: 'mutation-retry-request' }
    );

    assert.equal(result.status, 201);
    assert.equal(attempts, 2);
    assert.deepEqual(idempotencyKeys, ['mutation-retry-key-0001', 'mutation-retry-key-0001']);
    assert.deepEqual(requestIds, ['mutation-retry-request', 'mutation-retry-request']);
  } finally {
    await close(server);
  }
});

test('domain/conflict 4xx is never retried even when mutation has an idempotency key', async () => {
  let attempts = 0;
  const server = createServer((_request, response) => {
    attempts += 1;
    response.statusCode = 409;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'key already used for a different request',
      requestId: 'conflict-request'
    }));
  });
  const baseUrl = await listen(server);

  try {
    const client = new WorkServiceClient(baseUrl, POLICY);
    await assert.rejects(
      client.create(
        { title: ITEM.title, description: ITEM.description },
        'mutation-conflict-key-0001',
        { requestId: 'conflict-request' }
      ),
      (error: unknown) => {
        assert.ok(error instanceof UpstreamHttpError);
        assert.equal(error.status, 409);
        return true;
      }
    );
    assert.equal(attempts, 1);
  } finally {
    await close(server);
  }
});

test('mutation client rejects an empty idempotency key before opening a request', () => {
  const client = new WorkServiceClient('http://127.0.0.1:1', POLICY);
  assert.throws(
    () => client.create(
      { title: ITEM.title, description: ITEM.description },
      '',
      { requestId: 'missing-key-request' }
    ),
    /requires an idempotency key/
  );
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
