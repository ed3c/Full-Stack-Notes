import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { TRANSITION_ACTIONS, WORK_ITEM_STATUSES, WORK_QUEUE_OPERATIONS } from '../src/contract-generated.js';

test('generated web primitives remain bound to the frozen OpenAPI contract', async () => {
  const path = resolve(process.cwd(), '../../packages/contracts/openapi.json');
  const contract = JSON.parse(await readFile(path, 'utf8')) as any;

  assert.deepEqual([...WORK_ITEM_STATUSES], contract.components.schemas.WorkItemStatus.enum);
  assert.deepEqual([...TRANSITION_ACTIONS], contract.components.schemas.TransitionWorkItemRequest.properties.action.enum);
  assert.equal(WORK_QUEUE_OPERATIONS.list, contract.paths['/v1/work-items'].get.operationId);
  assert.equal(WORK_QUEUE_OPERATIONS.create, contract.paths['/v1/work-items'].post.operationId);
  assert.equal(WORK_QUEUE_OPERATIONS.get, contract.paths['/v1/work-items/{workItemId}'].get.operationId);
  assert.equal(WORK_QUEUE_OPERATIONS.transition, contract.paths['/v1/work-items/{workItemId}/transitions'].post.operationId);
});
