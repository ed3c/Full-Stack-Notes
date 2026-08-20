import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { WorkQueueApi } from '../src/api.js';
import { WorkQueueScreen } from '../src/work-queue.js';
import { OPEN_ITEM } from './helpers.js';

afterEach(() => cleanup());

test('create flow is keyboard-operable and form/action controls have accessible names', async () => {
  const createdTitles: string[] = [];
  const api: WorkQueueApi = {
    list: async () => [],
    get: async () => OPEN_ITEM,
    create: async (request) => {
      createdTitles.push(request.title);
      return { ...OPEN_ITEM, title: request.title, description: request.description ?? null };
    },
    transition: async () => OPEN_ITEM
  };
  const user = userEvent.setup();
  render(<WorkQueueScreen api={api} idempotencyKeyFactory={() => 'keyboard-create-key-0001'} />);

  await screen.findByText('No work items yet.');
  const title = screen.getByLabelText('Title');
  const description = screen.getByLabelText('Description');
  assert.equal(title.getAttribute('name'), 'title');
  assert.equal(description.getAttribute('name'), 'description');
  assert.ok(screen.getByRole('button', { name: 'Create item' }));
  assert.ok(screen.getByRole('button', { name: 'Refresh' }));

  await user.type(title, 'Keyboard-created item');
  await user.keyboard('{Enter}');
  assert.ok(await screen.findByRole('heading', { name: 'Keyboard-created item' }));
  assert.deepEqual(createdTitles, ['Keyboard-created item']);
  assert.ok(screen.getByRole('group', { name: 'Actions for Keyboard-created item' }));
});

test('transition action can be triggered from the keyboard and remains server-confirmed', async () => {
  const transitions: string[] = [];
  const api: WorkQueueApi = {
    list: async () => [OPEN_ITEM],
    get: async () => OPEN_ITEM,
    create: async () => OPEN_ITEM,
    transition: async (_id, _version, action) => {
      transitions.push(action);
      return { ...OPEN_ITEM, status: 'IN_PROGRESS', version: 2 };
    }
  };
  const user = userEvent.setup();
  render(<WorkQueueScreen api={api} idempotencyKeyFactory={() => 'keyboard-transition-key-0001'} />);

  const claim = await screen.findByRole('button', { name: 'Claim' });
  claim.focus();
  assert.equal(document.activeElement, claim);
  await user.keyboard('{Enter}');

  assert.ok(await screen.findByText('IN PROGRESS'));
  assert.ok(screen.getByText('Version 2'));
  assert.deepEqual(transitions, ['CLAIM']);
});
