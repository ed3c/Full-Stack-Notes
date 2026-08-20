import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import type { TransitionAction, WorkItem } from '../src/contracts.js';
import { WorkItemList } from '../src/work-queue.js';
import { OPEN_ITEM } from './helpers.js';

afterEach(() => cleanup());

test('pending change for one row does not rerender an unchanged sibling row', () => {
  const second: WorkItem = {
    ...OPEN_ITEM,
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Second item'
  };
  const items = [OPEN_ITEM, second];
  const renders = new Map<string, number>();
  const onRender = (id: string) => renders.set(id, (renders.get(id) ?? 0) + 1);
  const onTransition = (_item: WorkItem, _action: TransitionAction) => undefined;

  const view = render(
    <WorkItemList items={items} pendingIds={new Set()} onTransition={onTransition} onRowRender={onRender} />
  );
  assert.equal(renders.get(OPEN_ITEM.id), 1);
  assert.equal(renders.get(second.id), 1);

  view.rerender(
    <WorkItemList items={items} pendingIds={new Set([second.id])} onTransition={onTransition} onRowRender={onRender} />
  );

  assert.equal(renders.get(OPEN_ITEM.id), 1);
  assert.equal(renders.get(second.id), 2);
});
