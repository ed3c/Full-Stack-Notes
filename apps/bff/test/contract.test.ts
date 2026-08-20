import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

test('typed BFF client assumptions remain bound to the frozen OpenAPI contract', async () => {
  const path = resolve(process.cwd(), '../../packages/contracts/openapi.json');
  const contract = JSON.parse(await readFile(path, 'utf8')) as {
    paths: Record<string, Record<string, { operationId?: string; parameters?: Array<{ $ref?: string }> }>>;
  };

  assert.equal(contract.paths['/v1/work-items']?.get?.operationId, 'listWorkItems');
  assert.equal(contract.paths['/v1/work-items']?.post?.operationId, 'createWorkItem');
  assert.equal(contract.paths['/v1/work-items/{workItemId}']?.get?.operationId, 'getWorkItem');
  assert.equal(
    contract.paths['/v1/work-items/{workItemId}/transitions']?.post?.operationId,
    'transitionWorkItem'
  );

  const createRefs = contract.paths['/v1/work-items']?.post?.parameters?.map((parameter) => parameter.$ref) ?? [];
  const transitionRefs = contract.paths['/v1/work-items/{workItemId}/transitions']?.post?.parameters?.map(
    (parameter) => parameter.$ref
  ) ?? [];
  assert.ok(createRefs.includes('#/components/parameters/IdempotencyKey'));
  assert.ok(transitionRefs.includes('#/components/parameters/IdempotencyKey'));

  const transitionParameters = contract.paths['/v1/work-items/{workItemId}/transitions']?.post?.parameters ?? [];
  assert.ok(transitionParameters.some((parameter) => !parameter.$ref));
});
