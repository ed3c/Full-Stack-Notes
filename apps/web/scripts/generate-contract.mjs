import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const contractPath = resolve(process.cwd(), '../../packages/contracts/openapi.json');
const outputPath = resolve(process.cwd(), 'src/contract-generated.ts');
const contract = JSON.parse(await readFile(contractPath, 'utf8'));

const statuses = contract.components?.schemas?.WorkItemStatus?.enum;
const actions = contract.components?.schemas?.TransitionWorkItemRequest?.properties?.action?.enum;
const operations = {
  list: contract.paths?.['/v1/work-items']?.get?.operationId,
  create: contract.paths?.['/v1/work-items']?.post?.operationId,
  get: contract.paths?.['/v1/work-items/{workItemId}']?.get?.operationId,
  transition: contract.paths?.['/v1/work-items/{workItemId}/transitions']?.post?.operationId
};

if (!Array.isArray(statuses) || !Array.isArray(actions) || Object.values(operations).some((value) => typeof value !== 'string')) {
  throw new Error('frozen OpenAPI contract is missing the Work Queue primitives required by the web app');
}

const source = `/* Generated from packages/contracts/openapi.json. Do not edit. */\n` +
  `export const WORK_ITEM_STATUSES = ${JSON.stringify(statuses)} as const;\n` +
  `export type WorkItemStatus = typeof WORK_ITEM_STATUSES[number];\n\n` +
  `export const TRANSITION_ACTIONS = ${JSON.stringify(actions)} as const;\n` +
  `export type TransitionAction = typeof TRANSITION_ACTIONS[number];\n\n` +
  `export const WORK_QUEUE_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const;\n`;

await writeFile(outputPath, source, 'utf8');
