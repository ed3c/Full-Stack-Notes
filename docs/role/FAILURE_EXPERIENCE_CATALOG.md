# Failure Experience Catalog

The role requires more than happy-path implementation. This catalog defines failures a Tech Lead or hiring manager can probe. Portfolio drills are marked as simulations until executed and must never be presented as prior production incidents.

## Evidence format for every failure

Record: trigger -> user impact -> detection -> diagnosis -> containment -> fix -> regression prevention -> measured recovery -> remaining risk.

| ID | Failure | Why it matters | Drill / evidence target | State |
|---|---|---|---|---|
| F-01 | Duplicate create after client/proxy retry | Exposes missing idempotency and unsafe retry assumptions | Send same key concurrently/repeatedly; prove one resource and deterministic response | PROPOSED |
| F-02 | DB commit succeeds, event publish fails | Classic dual-write inconsistency | Stop broker during commit; prove outbox retains event and later recovers | PROPOSED |
| F-03 | Kafka redelivers message | At-least-once delivery is normal | Replay same event; prove projection is unchanged after first application | PROPOSED |
| F-04 | Two users update same work item | Lost update / race condition | Concurrent versioned transitions; prove one wins and one receives typed conflict | PROPOSED |
| F-05 | Downstream latency spike | Can consume all worker/event-loop capacity | Inject latency; measure timeout, queueing, saturation, and user-visible error behavior | PROPOSED |
| F-06 | Retry storm | Retries can amplify an outage | Inject 5xx/timeouts; prove bounded attempts, jitter, and no unsafe mutation duplication | PROPOSED |
| F-07 | Circuit breaker hides data correctness failure | Resilience mechanism can make semantics worse | Define allowed fallback; prove writes never return false success | PROPOSED |
| F-08 | Rate limiter has wrong scope | Global limit may punish all tenants; per-key limit may allow aggregate overload | Load distinct keys/tenants; capture fairness and saturation behavior | PROPOSED |
| F-09 | BFF becomes bottleneck | Full-stack seed role must understand edge aggregation cost | Load BFF vs direct service; profile event loop/CPU/memory and downstream wait | PROPOSED |
| F-10 | Node process receives termination during requests | Graceful shutdown matters in rolling deploys | Send traffic then SIGTERM; prove readiness drops and inflight requests drain/bound | PROPOSED |
| F-11 | DB connection pool exhaustion | Common cascading failure | Constrain pool + raise concurrency; observe bounded waits/timeouts and recovery | PROPOSED |
| F-12 | Missing/incorrect DB index | Functional correctness can hide production latency | Capture query plan before/after index under representative dataset | PROPOSED |
| F-13 | Migration breaks old/new app compatibility | Rolling deploys can run mixed versions | Exercise expand/contract migration sequence | PROPOSED |
| F-14 | Kafka consumer lag/rebalance | Eventual consistency becomes visible user lag | Throttle consumer / restart group; capture lag and convergence time | PROPOSED |
| F-15 | Poison event repeatedly fails | One bad record can block or burn resources | Inject malformed/domain-invalid event; demonstrate bounded retries and quarantine policy | PROPOSED |
| F-16 | Event schema incompatible change | Cross-team integration breaks despite local tests | Contract compatibility test rejects breaking event/API change | PROPOSED |
| F-17 | React stale response overwrites newer state | Async UI race creates wrong information | Delay older request; prove cancellation/versioning prevents stale overwrite | PROPOSED |
| F-18 | React rerender/performance regression | Deep React requirement includes render budget | Seed unstable props/state; profile and fix unnecessary renders with measured delta | PROPOSED |
| F-19 | Optimistic UI reports false success | Product correctness under failure | Fail command after local optimistic update; prove rollback/error state | PROPOSED |
| F-20 | Observability blind spot | Incident diagnosis fails without correlation | Remove/break trace propagation in drill; demonstrate detection test and repair | PROPOSED |
| F-21 | Secret enters AI prompt or generated code | AI-assisted development adds data/security risk | Seed fake secret pattern; prove secret scanning/redaction gate catches it | PROPOSED |
| F-22 | AI generates plausible but incorrect concurrency code | Core requirement is verification, not tool usage | Keep rejected AI patch + test that exposes race + corrected implementation | PROPOSED |
| F-23 | AI changes contract outside requested scope | Agent tools can create broad semantic drift | Diff/contract gate rejects unrelated API/schema change | PROPOSED |
| F-24 | Ambiguous product requirement creates incompatible interpretations | Seed engineer must turn ambiguity into spec | Record assumptions/questions/acceptance criteria before code; test against examples | PROPOSED |
| F-25 | Cross-team API ownership drift | Handoff reduction fails without explicit contracts | Simulate consumer/provider change; require version/compatibility review | PROPOSED |
| F-26 | Deploy health check is too shallow | Process-up is not service-ready | Break DB/broker dependency; prove readiness vs liveness semantics | PROPOSED |
| F-27 | Rollback cannot read new data/schema | Recovery path itself can fail | Run forward then rollback compatibility drill | PROPOSED |
| F-28 | Alert is noisy or misses user impact | Operational maturity requires actionable signals | Create symptom/SLO-style alert rule and test false-positive/negative cases | PROPOSED |
| F-29 | Incident communication lacks owner/timeline/decision log | Senior/seed behavior includes coordination | Run tabletop incident with timestamped decision log and handoff | PROPOSED |
| F-30 | Fix removes symptom but not recurrence | Postmortem quality matters | Require corrective actions spanning code, test, detection, and process | PROPOSED |

## Minimum interview-ready set

Before treating the repository as strong evidence, execute at least these ten drills: `F-01`, `F-02`, `F-03`, `F-04`, `F-05`, `F-11`, `F-14`, `F-17`, `F-20`, and one of `F-21..F-23`.

A stronger senior/seed signal includes `F-13`, `F-16`, `F-27`, and `F-29`, because they expose release, ownership, and cross-team reasoning rather than only coding skill.

## Real experience lane

Create a separate private evidence record for real prior failures that can legally be discussed. For each incident, remove employer-confidential identifiers and capture only the transferable engineering story. Do not backfill a simulated repo drill as if it happened at work.
