# React Work Queue UI

This application is the presentation/client-state owner for the Operations Work Queue. It consumes the frozen HTTP contract and must not import BFF or Java implementation bytes.

## Runtime / dependency subject

- React `19.2.0`
- React DOM `19.2.0`
- Vite `8.2.1`
- `@vitejs/plugin-react` `6.0.5`
- TypeScript `6.0.3`
- React Testing Library `16.3.2`
- jsdom `30.0.1`

The committed lockfile becomes the exact transitive-dependency subject. Repository-wide third-party policy remains authoritative.

## Ownership boundary

```text
browser UI (apps/web)
  -> frozen HTTP contract
  -> BFF runtime boundary
  -> Java domain owner
```

The web app owns presentation, accessible interactions, pending/error/conflict states, and stale-response rejection. It does not own the workflow invariant, retry policy, database access, Kafka behavior, or server truth.

## Generated contract boundary

`scripts/generate-contract.mjs` reads `packages/contracts/openapi.json` and generates `src/contract-generated.ts` for operation IDs and finite domain/API enums used by the UI. CI regenerates this file and fails if the committed output differs.

This is intentionally a small generator, not a second schema system. Runtime response parsing still fails closed when the server violates the frozen shape.

## Async state machine

```text
initial -> loading -> empty | ready

create:
ready/empty -> creating -> confirmed server item
                     \-> error (no false insertion)

transition:
ready -> pending(item) -> confirmed server item
                    \-> 409 -> re-read canonical item -> conflict notice
                    \-> error (canonical item unchanged)

refresh:
request epoch N -> response accepted only when
  N is newest load AND no newer confirmed mutation changed data revision
```

### Stale-data invariant

An older list response cannot overwrite a newer refresh result or a confirmed mutation. `loadEpoch` rejects out-of-order refreshes and `dataRevision` rejects a response whose request started before a later confirmed write.

### Pending/optimistic invariant

The UI does not paint a mutation as confirmed before the server returns a contract-valid `WorkItem`. Pending state is explicit (`Creating…`, `Updating…`). On failure the prior canonical item remains visible.

### Conflict invariant

HTTP 409 is never rendered as success. The UI re-reads the affected item and shows the latest canonical version plus an explicit conflict notice.

## Component boundaries

- `HttpWorkQueueApi`: HTTP/contract adapter only.
- `useWorkQueue`: async state machine and stale/conflict guards.
- `WorkQueueScreen`: page orchestration and form state.
- `WorkItemList`: list ownership and stable row identity.
- `WorkItemRow`: memoized item presentation/actions.

## Seeded render regression

A seeded anti-pattern recreated every row prop/object when one item's pending state changed, rerendering unrelated rows. The closure test measures row render counts. The fix preserves canonical item object identity and memoizes `WorkItemRow`; when item B becomes pending, unchanged item A remains at one render while B advances to two.

This is deterministic component evidence, not a browser FPS/Web Vitals or production performance claim. Browser profiling remains downstream.

## Accessibility scope

The create fields use explicit labels, native form semantics, native buttons, status/error live roles, and keyboard-submit behavior. Component tests verify the core create path can be completed with keyboard input and accessible role/name queries.

This does not replace later real-browser accessibility or performance evidence.

## Evidence ceiling

A passing PR-3 CI may admit `VERIFIED` for deterministic React component/client-state behavior only. It does not prove full React->BFF->Java runtime integration, browser performance under load, production traffic, or production UX outcomes. Those remain downstream in #21/#22.
