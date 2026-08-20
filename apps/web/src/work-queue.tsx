import { memo, useCallback, useState, type FormEvent } from 'react';
import type { WorkQueueApi } from './api.js';
import type { TransitionAction, WorkItem } from './contracts.js';
import { useWorkQueue } from './use-work-queue.js';

export interface WorkQueueScreenProps {
  api: WorkQueueApi;
  idempotencyKeyFactory?: () => string;
}

export function WorkQueueScreen({ api, idempotencyKeyFactory }: WorkQueueScreenProps) {
  const model = useWorkQueue(api, idempotencyKeyFactory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalized = title.trim();
    if (normalized.length === 0) return;
    const ok = await model.create({
      title: normalized,
      description: description.trim().length === 0 ? null : description.trim()
    });
    if (ok) {
      setTitle('');
      setDescription('');
    }
  };

  const transition = useCallback((item: WorkItem, action: TransitionAction): void => {
    void model.transition(item, action);
  }, [model.transition]);

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Full Stack Notes · deterministic UI evidence</p>
        <h1>Operations Work Queue</h1>
        <p>Server state stays canonical. Pending work is visible; conflicts reconcile instead of pretending success.</p>
      </header>

      <section className="panel" aria-labelledby="create-heading">
        <h2 id="create-heading">Create work item</h2>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="work-title">Title</label>
          <input
            id="work-title"
            name="title"
            value={title}
            maxLength={200}
            required
            disabled={model.creating}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label htmlFor="work-description">Description</label>
          <textarea
            id="work-description"
            name="description"
            value={description}
            maxLength={4000}
            disabled={model.creating}
            onChange={(event) => setDescription(event.target.value)}
          />
          <button type="submit" disabled={model.creating || title.trim().length === 0}>
            {model.creating ? 'Creating…' : 'Create item'}
          </button>
        </form>
      </section>

      <section className="panel" aria-labelledby="queue-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Canonical server view</p>
            <h2 id="queue-heading">Queue</h2>
          </div>
          <button type="button" className="secondary" onClick={() => void model.refresh()}>Refresh</button>
        </div>

        {model.error !== null && <p role="alert" className="message error">{model.error}</p>}
        {model.notice !== null && <p role="status" className="message notice">{model.notice}</p>}
        {model.phase === 'loading' && model.items.length === 0 && <p role="status">Loading queue…</p>}
        {model.phase === 'empty' && model.items.length === 0 && <p className="empty">No work items yet.</p>}

        <WorkItemList items={model.items} pendingIds={model.pendingIds} onTransition={transition} />
      </section>
    </main>
  );
}

export interface WorkItemListProps {
  items: WorkItem[];
  pendingIds: ReadonlySet<string>;
  onTransition(item: WorkItem, action: TransitionAction): void;
  onRowRender?: (workItemId: string) => void;
}

export function WorkItemList({ items, pendingIds, onTransition, onRowRender }: WorkItemListProps) {
  if (items.length === 0) return null;
  return (
    <ul className="work-list" aria-label="Work items">
      {items.map((item) => (
        <WorkItemRow
          key={item.id}
          item={item}
          pending={pendingIds.has(item.id)}
          onTransition={onTransition}
          onRender={onRowRender}
        />
      ))}
    </ul>
  );
}

interface WorkItemRowProps {
  item: WorkItem;
  pending: boolean;
  onTransition(item: WorkItem, action: TransitionAction): void;
  onRender?: (workItemId: string) => void;
}

export const WorkItemRow = memo(function WorkItemRow({ item, pending, onTransition, onRender }: WorkItemRowProps) {
  onRender?.(item.id);
  const actions = actionsFor(item);
  return (
    <li className="work-row">
      <div className="work-copy">
        <div className="work-title-line">
          <h3>{item.title}</h3>
          <span className={`status status-${item.status.toLowerCase()}`}>{item.status.replace('_', ' ')}</span>
        </div>
        {item.description !== null && <p>{item.description}</p>}
        <p className="meta">Version {item.version}{pending ? ' · Updating…' : ''}</p>
      </div>
      <div className="actions" role="group" aria-label={`Actions for ${item.title}`}>
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={pending}
            onClick={() => onTransition(item, action)}
          >
            {labelFor(action)}
          </button>
        ))}
      </div>
    </li>
  );
});

function actionsFor(item: WorkItem): TransitionAction[] {
  switch (item.status) {
    case 'OPEN': return ['CLAIM', 'CANCEL'];
    case 'IN_PROGRESS': return ['COMPLETE', 'RELEASE', 'CANCEL'];
    case 'DONE':
    case 'CANCELLED':
      return [];
  }
}

function labelFor(action: TransitionAction): string {
  switch (action) {
    case 'CLAIM': return 'Claim';
    case 'COMPLETE': return 'Complete';
    case 'RELEASE': return 'Release';
    case 'CANCEL': return 'Cancel';
  }
}
