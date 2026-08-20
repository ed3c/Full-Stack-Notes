# Full Stack Seed Engineer — Job Gap Matrix

This matrix translates the supplied role expectations into evidence that can survive technical follow-up. States are **claim-scoped**: a component may be verified while its load, production, or human-admission claim remains open.

| ID | Role expectation | Evidence required | Canonical repository proof | Current evidence state |
|---|---|---|---|---|
| FS-01 | End-to-end product delivery | One user outcome crossing UI, BFF, service, DB, async path, tests, runnable evidence | Operations Work Queue; PR #33 / #21 | `RUNTIME_EVIDENCE` — one pinned deterministic happy path; not production |
| FS-02 | Java backend depth | Domain model, concurrency, transactions, idempotency, persistence, tests | `services/work-service`; PR #25/#32 | `VERIFIED` |
| FS-03 | Node.js proficiency | Typed BFF, validation, timeout/retry policy, rate limiting, graceful shutdown, tests | `apps/bff`; PR #28 | `VERIFIED` — deterministic single-process scope |
| FS-04 | React depth | Component/state/error boundaries, typed API client, async-race tests, render/perf evidence | `apps/web`; PR #29 | `VERIFIED` for correctness; browser/load/Web-Vitals evidence remains open/deferred |
| FS-05 | Database design | Schema, constraints, migrations, indexes/query plan, transaction semantics | PostgreSQL schema + Java integration evidence | `VERIFIED` for schema/transaction semantics; F-12 query-plan evidence remains open |
| FS-06 | High concurrency | Reproducible races plus saturation behavior | Java concurrency tests; #22 F-11 lane | `VERIFIED` for lost-update/idempotency races; saturation `FALSIFICATION_IN_PROGRESS` |
| FS-07 | Message queue | Durable publish, at-least-once consumption, duplicate handling, lag/recovery | PR #32 + integrated PR #33 | `RUNTIME_EVIDENCE` for one happy path; measured outage/lag convergence remains #22 |
| FS-08 | Eventual consistency | Explicit consistency contract and stale/pending behavior | outbox/audit semantics + React async-state tests | `VERIFIED` for component semantics; measured async convergence remains #22 |
| FS-09 | Circuit breaking/timeouts | Bounded retry/deadline policy and measurable failure recovery | BFF policy PR #28; full drills #22 | `VERIFIED` for BFF timeout/retry semantics; runtime recovery remains #22 |
| FS-10 | Rate limiting | Algorithm/scope rationale, rejection behavior, load/fairness evidence | BFF local token bucket PR #28 | `VERIFIED` single-process rejection semantics; distributed fairness deferred #27 |
| FS-11 | Load balancing/service discovery concepts | Two service instances behind explicit LB, health/removal/failover observation | PR #34 / #22 | `IMPLEMENTED / FALSIFICATION_IN_PROGRESS`; latest exact-head run fails before drill admission |
| FS-12 | Production ownership | CI/CD, rollout/rollback, dashboards, incident evidence from real operations | local/CI runbooks + #22/#23/#27 | `NOT_ADMITTED` as production experience; simulation/runtime work cannot manufacture production ownership |
| FS-13 | AI-assisted engineering | Prompt/constraint provenance, generated diff review, rejected output examples | governance + #22 AI verification target | `IMPLEMENTED` process scaffolding; interview admission pending exact verification evidence |
| FS-14 | Ability to verify AI output | Test/static/security evidence catching a plausible AI error | #22 minimum drill set | `IMPLEMENTED / FALSIFICATION_IN_PROGRESS`; not admitted yet |
| FS-15 | Product/spec thinking | Ambiguous idea -> problem statement -> acceptance criteria -> shipped behavior | #16-#21 issue/PR chain | `VERIFIED` as repository delivery/spec traceability; not a claim about prior employer work |
| FS-16 | Cross-team boundary reduction | Contract-first API/event ownership and change protocol | `packages/contracts` + Stack PR DAG | `VERIFIED` in repository workflow |
| FS-17 | Full-stack seed/mentoring | Reusable playbook plus evidence another engineer/team used it | #23/#27 human lane | `PROPOSED / HUMAN_EVIDENCE_REQUIRED` |
| FS-18 | Process improvement | Before/after metric for a real workflow bottleneck | future engineering-flow experiment / #23 | `PROPOSED` |
| FS-19 | Communication/logical reasoning | ADR tradeoffs, failure/debug records, PR reviews, concise packet | architecture docs + PR/issue audits | `VERIFIED` as repository artifacts; human interview admission pending #23 |
| FS-20 | Full product lifecycle | idea -> contract -> implementation -> run -> failure/feedback -> iteration | state machine + merged PR #24-#33 | `RUNTIME_EVIDENCE` for portfolio implementation/run; production lifecycle and human admission remain open |

## What is closed versus still open

### Closed at current evidence ceiling

- Contract-first full-stack architecture and ownership boundaries.
- Java transaction/idempotency/optimistic-concurrency behavior.
- Node BFF typed boundary, request correlation, bounded retry/deadline, local rate limiting, and graceful-shutdown semantics.
- React stale-response/conflict/error-state correctness.
- Transactional outbox, at-least-once duplicate integrity, audit projection and DLT component behavior.
- One deterministic pinned React -> BFF -> Java -> PostgreSQL -> outbox -> Kafka -> audit-consumer runtime path.

### Not closed

- #22 resilience/load/observability admission: DB pool saturation/recovery, two-instance load balancing/failover, Kafka lag convergence, correlated synchronous/asynchronous fault telemetry, load distribution/error/saturation receipts, and one AI-verification drill.
- F-12 representative query-plan/index evidence.
- Production SLO/capacity/on-call/incident ownership.
- Real mentoring/organizational adoption.
- Before/after process improvement metric.
- #30 release-shape-dependent third-party license/NOTICE/SBOM obligations.

## Admission rules

### Technical capability

A capability may move to `VERIFIED` only when automated checks and the relevant deterministic edge/failure behavior exist. Code presence alone is `IMPLEMENTED`.

### Runtime behavior

A capability may move to `RUNTIME_EVIDENCE` only when a reproducible run records environment, exact subject, command/workflow, input, result, and immutable artifact/receipt. One happy-path runtime receipt does not imply resilience/load evidence.

### Production experience

Local Docker, CI, synthetic load, chaos/failure drills, and portfolio users are useful engineering evidence but are not equivalent to owning a real production system. Production claims require real project/employer evidence the user is allowed to discuss.

### Mentoring and organizational adoption

A document saying "this can scale to the organization" is not evidence. Admission requires a genuine human adoption signal: review, usage, contribution, training feedback, or measurable workflow change.

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

#23 owns final admission. It may package existing evidence but cannot promote unsupported production, mentoring, adoption, or organizational claims.