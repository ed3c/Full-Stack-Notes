# Full Stack Seed Engineer — Job Gap Matrix

This matrix translates the supplied job description into evidence that can survive technical follow-up. It does not assert prior experience that has not been documented.

| ID | Role expectation | Evidence required | Planned repository proof | Current state |
|---|---|---|---|---|
| FS-01 | End-to-end product delivery | One user outcome crossing UI, BFF, service, DB, async path, tests, deployment/run evidence | Operations Work Queue vertical slice | PROPOSED |
| FS-02 | Java backend depth | Domain model, concurrency, transactions, idempotency, persistence, tests, profiling/debug evidence | `services/work-service` | PROPOSED |
| FS-03 | Node.js proficiency | Typed BFF, validation, timeout/retry policy, rate limiting, graceful shutdown, tests | `apps/bff` | PROPOSED |
| FS-04 | React depth | Component architecture, state/error boundaries, typed API client, test strategy, render/perf evidence | `apps/web` | PROPOSED |
| FS-05 | Database design | Schema rationale, indexes, constraints, migrations, query-plan evidence, transaction semantics | PostgreSQL schema + ADR + run artifacts | PROPOSED |
| FS-06 | High concurrency | Reproducible race/concurrency tests, lost-update prevention, saturation behavior | optimistic concurrency + load/failure tests | PROPOSED |
| FS-07 | Message queue | Durable publish, at-least-once consumption, duplicate handling, lag/recovery drill | outbox + Kafka + audit consumer | PROPOSED |
| FS-08 | Eventual consistency | Explicit consistency contract and stale/pending UI behavior | command state + audit projection | PROPOSED |
| FS-09 | Circuit breaking/timeouts | Failure policy with bounded retries, timeout budget, measurable recovery | BFF/Java resilience drills | PROPOSED |
| FS-10 | Rate limiting | Algorithm/scope rationale and rejection telemetry | BFF limiter + load test | PROPOSED |
| FS-11 | Load balancing/service discovery concepts | Deployment topology and failure analysis; optional runnable multi-instance test | architecture ADR + runtime drill | PROPOSED |
| FS-12 | Production ownership | CI/CD, rollout/rollback, dashboards, incident drill, postmortem evidence | deployment and incident runbook artifacts | PROPOSED — not production experience |
| FS-13 | AI-assisted engineering | Prompt/constraint record, generated diff review, validation, rejected output examples | AI change provenance + review evidence | PROPOSED |
| FS-14 | Ability to verify AI output | Tests/static analysis/security review catching a seeded or real AI error | AI verification drill | PROPOSED |
| FS-15 | Product/spec thinking | Ambiguous idea -> problem statement -> acceptance criteria -> shipped behavior | issue/RFC/evidence chain | FOUNDATION_DESIGN |
| FS-16 | Cross-team boundary reduction | Contract-first API/event ownership and change protocol | `packages/contracts` + stacked PR DAG | FOUNDATION_DESIGN |
| FS-17 | Full-stack seed/mentoring | Reusable playbook plus evidence another engineer/team successfully used it | adoption/mentoring record | PROPOSED — requires human evidence |
| FS-18 | Process improvement | Before/after metric for one workflow bottleneck | engineering-flow experiment | PROPOSED |
| FS-19 | Communication/logical reasoning | ADR tradeoffs, incident timeline, PR reviews, concise interview packet | docs + PR history | PROPOSED |
| FS-20 | Full product lifecycle | idea -> contract -> implementation -> release/run -> feedback -> iteration | repository state machine | PROPOSED |

## Admission rules

### Technical capability

A capability may move to `VERIFIED` only when automated checks and the relevant failure/edge scenario exist. Code presence alone is `IMPLEMENTED`.

### Runtime behavior

A capability may move to `RUNTIME_EVIDENCE` only when a reproducible run records environment, command/workflow, input, result, and artifact path.

### Production experience

Local Docker, CI, staging, synthetic load, chaos/failure drills, and portfolio users are useful engineering evidence but are not equivalent to owning a real production system. Production claims must cite real employer/project evidence the user is allowed to discuss.

### Mentoring and organizational adoption

A document saying "this can scale to the organization" is not evidence. Admission requires a human adoption signal: review, usage, contribution, training feedback, or measurable workflow change.

## Interview evidence packet target

For each admitted capability, prepare a compact packet:

1. problem and user impact;
2. architecture decision and rejected alternative;
3. invariant/contract;
4. failure encountered or deliberately injected;
5. debugging evidence;
6. fix/tradeoff;
7. measured result;
8. what would change at 10x scale;
9. exact repository/CI evidence link.
