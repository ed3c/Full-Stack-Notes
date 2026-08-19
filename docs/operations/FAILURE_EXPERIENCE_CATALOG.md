# Failure Experience Catalog

This catalogue defines the failures a Full Stack Seed Engineer should be able to explain, reproduce safely, detect, mitigate, recover from, and prevent.

It does **not** claim that the portfolio owner experienced these failures at an employer. Each completed exercise must be labelled `PORTFOLIO_LIVE`, `PORTFOLIO_DETERMINISTIC`, or `PROFESSIONAL` according to the evidence rules in the role matrix.

## Receipt contract

Every game-day or incident exercise records:

```text
scenario_id
hypothesis
exact commit/image/environment
traffic and dataset denominator
fault start/end and injection mechanism
expected invariant
actual user/system impact
detection signal and alert latency
mitigation decision
recovery and data reconciliation
rollback or forward-fix identity
cleanup and residual risk
follow-up issue/owner
interview claim class
```

A fault script without execution, detection, recovery and residue evidence remains `NOT_EXERCISED`.

## P0 — correctness, isolation and data-loss risks

| ID | Failure to experience | Injection / reproduction | Invariant | Detection and recovery evidence |
|---|---|---|---|---|
| `FAIL-001` | duplicate command from user/network retry | submit same idempotency key concurrently and after timeout | one business mutation; identical retry returns original result | idempotency hit metric, one aggregate/audit/outbox version, response hash |
| `FAIL-002` | idempotency key reused for a different payload | same tenant/key with changed transition body | reject conflict; never return unrelated prior success | typed 409, audit/security event, no mutation |
| `FAIL-003` | concurrent conflicting transitions | two actors use the same expected aggregate version | at most one admitted version; loser gets current state/version | concurrency test, unique constraint/version evidence, trace pair |
| `FAIL-004` | transaction commits domain row but loses event | terminate relay/app around commit; inspect outbox | domain mutation and outbox event are atomic | database reconciliation query and eventual publish receipt |
| `FAIL-005` | event published more than once | force relay acknowledgement loss or reset publication metadata | consumer side effect is idempotent | repeated event ID, one inbox/projection result, duplicate metric |
| `FAIL-006` | out-of-order events | deliver aggregate version N+1 before N | projection never regresses; gap becomes visible | source-version guard, gap metric, replay/rebuild result |
| `FAIL-007` | poison event blocks partition | semantic-invalid event for one initiative | unrelated valid records continue or terminal policy is explicit | bounded retries, terminal topic receipt, lag recovery, replay approval |
| `FAIL-008` | cross-tenant data access | actor from tenant A requests/mutates tenant B ID | zero data or side-effect leakage | negative API/SQL tests, audit record, no sensitive payload in response/log |
| `FAIL-009` | authorization drift between BFF and core | allow at BFF, deny/omit at core in planted variant | core remains final authorization boundary | core denial, mutation test kills BFF-only authorization |
| `FAIL-010` | incompatible schema deployment | run old app against expanded schema and new app during rollout | compatibility window holds or deployment blocks before traffic | migration/app matrix, rollback or forward-fix receipt |
| `FAIL-011` | partial restore or stale backup | restore declared backup into isolated environment | restore point and missing interval are explicit; no false completeness | restore drill, integrity/reconciliation queries, RPO/RTO result |
| `FAIL-012` | sensitive data emitted to logs/traces | inject token/email/free text into test request | secrets and restricted fields never persist in evidence systems | redaction test, scan result, purge/rotation runbook if planted leak escapes |

## P1 — availability, overload and distributed recovery

| ID | Failure to experience | Injection / reproduction | Invariant | Detection and recovery evidence |
|---|---|---|---|---|
| `FAIL-101` | PostgreSQL latency/timeout | Toxiproxy latency and connection reset | command ends inside caller deadline; no fabricated success | dependency span, timeout classification, connection cleanup, breaker/bulkhead state |
| `FAIL-102` | database pool exhaustion | reduce pool and drive concurrent slow transactions | bounded wait/rejection; application remains observable | pool saturation, queue/wait histogram, load-shed response, recovery without restart |
| `FAIL-103` | deadlock | inverse lock order in controlled transactions | one victim retries only if safe; no indefinite wait | database deadlock signal, bounded retry, final consistency |
| `FAIL-104` | lock convoy / hot aggregate | many updates to one initiative versus distributed IDs | hot key is isolated; unrelated initiatives retain service | per-key latency comparison, conflict/load-shed policy |
| `FAIL-105` | virtual-thread pinning | planted synchronized blocking call under load | pinned work is detected and corrected; scarce resources remain bounded | JFR/pinning diagnostic, before/after throughput and latency |
| `FAIL-106` | unbounded Java concurrency | planted fan-out without semaphore | control fails; admitted implementation caps in-flight work | resource/latency curve, rejection or cancellation, no OOM/thread illusion |
| `FAIL-107` | Node event-loop blocking | CPU-heavy handler or synchronous work | event-loop delay alert fires; work is rejected/offloaded | event-loop lag, request tail latency, corrected implementation |
| `FAIL-108` | leaked SSE clients/open handles | abrupt browser disconnect and network flap | connection, timer and subscription are released | active-connection/open-handle count returns to baseline |
| `FAIL-109` | Kafka broker/network interruption | Toxiproxy pause/reset or container stop | core transaction still completes truthfully; async freshness degrades visibly | outbox backlog, producer error, lag/freshness alert, catch-up receipt |
| `FAIL-110` | consumer rebalance storm | repeatedly restart/scale consumer | no duplicate side effect; lag and recovery are bounded | rebalance duration/count, inbox proof, catch-up denominator |
| `FAIL-111` | retry storm | dependency emits transient errors to many requests | retries obey global/local budget and do not amplify overload | retry ratio, breaker/open state, rejected workload, recovery curve |
| `FAIL-112` | circuit-breaker half-open stampede | recover dependency after prolonged failure | half-open probes are bounded; normal traffic resumes gradually | probe count, dependency load, transition timeline |
| `FAIL-113` | noisy tenant | one tenant saturates request/SSE budget | other tenants retain declared capacity and latency | tenant/global limiter metrics, fairness result, typed 429 |
| `FAIL-114` | cache outage or stale cache | stop Valkey / freeze invalidation | domain writes remain correct; staleness/degradation is explicit | fallback path, cache-error metric, no DB corruption, recovery warm-up |
| `FAIL-115` | load balancer sends traffic to unready instance | delay startup/migration/readiness | unready instance receives no user traffic | readiness transition, routing evidence, zero false 200s |
| `FAIL-116` | instance termination during request | SIGTERM with in-flight command/SSE | bounded drain; committed state is correct; clients get typed/recoverable outcome | shutdown spans, in-flight count, replay/idempotency result |
| `FAIL-117` | telemetry backend unavailable | stop collector/Prometheus/Jaeger | product remains functional inside declared overhead; telemetry loss is visible | exporter queue/drop metric, no unbounded memory growth, recovery |

## P1 — frontend and user-visible consistency

| ID | Failure to experience | Reproduction | User invariant | Evidence |
|---|---|---|---|---|
| `FAIL-201` | hydration mismatch | planted server/client time or random value | production build has no mismatch and preserves content | console/Playwright negative control, corrected deterministic render |
| `FAIL-202` | stale optimistic transition | server rejects expected version after optimistic UI update | UI rolls back/reconciles and shows current server state | browser trace and visible conflict state |
| `FAIL-203` | duplicate SSE event | replay same event/cursor on reconnect | timeline shows one logical transition | client dedup/version test and screenshot/trace |
| `FAIL-204` | SSE replay gap/expired cursor | reconnect outside retained replay window | UI marks stale and performs bounded snapshot resync | typed reset event, snapshot/version consistency |
| `FAIL-205` | over-render/jank | update one row in large list | unchanged rows do not render; target interaction remains within budget | React Profiler/render-count and browser trace |
| `FAIL-206` | large bundle/regression | add heavy dependency to one route | CI budget blocks unexplained route growth | bundle diff, owning issue or removal |
| `FAIL-207` | memory/subscription leak | navigate/reconnect repeatedly | memory and listener counts return near baseline | heap/listener trace and cleanup assertion |
| `FAIL-208` | inaccessible error or modal flow | keyboard/screen-reader traversal | focus, name, role, escape and announcement remain valid | accessibility scan plus manual keyboard receipt |
| `FAIL-209` | offline/slow network action ambiguity | throttle, disconnect during transition | UI never claims success without server result; retry is idempotent | browser network trace, pending/unknown/reconciled states |
| `FAIL-210` | stale service worker/client asset after deploy | serve old client against new BFF/core contract | compatibility or forced refresh path is explicit | old/new contract E2E matrix |

## P1 — deployment and operational process

| ID | Failure to experience | Reproduction | Process invariant | Evidence |
|---|---|---|---|---|
| `FAIL-301` | failed migration | invalid/long-lock migration in isolated environment | rollout stops before incompatible app receives traffic | migration timeout/lock result, rollback/forward-fix decision |
| `FAIL-302` | application rollback with irreversible data change | deploy change then request rollback | rollback eligibility is assessed before deployment | expand/contract evidence or explicit forward-fix |
| `FAIL-303` | config drift | alter one environment variable/config map | startup/check gate detects drift before hidden behavior | config fingerprint, blocked rollout, corrected projection |
| `FAIL-304` | secret rotation breaks dependency | rotate synthetic credential during traffic | old/new overlap and revocation sequence is known | rotation timeline, auth failures, recovery and no secret logging |
| `FAIL-305` | alert without actionable context | trigger alert missing runbook/trace link | alert is repaired or rejected, not counted as coverage | alert review, improved annotation and successful game-day |
| `FAIL-306` | runbook is wrong or stale | zero-context operator follows it | commands are bounded, current and produce required receipts | operator feedback, corrected runbook, exact version pin |
| `FAIL-307` | rollback succeeds technically but leaves residue | roll back app while queue/outbox contains new events | cleanup/reconciliation is part of rollback completion | queue/schema/data residue report and owner |
| `FAIL-308` | dependency/license policy changes | upgrade to component with changed license | build/governance gate blocks or records legal decision | SBOM/license diff, approved pin or replacement |

## P1 — AI-assisted engineering failures

| ID | Failure to experience | Planted candidate | Required reviewer behavior | Evidence |
|---|---|---|---|---|
| `FAIL-AI-001` | AI bypasses domain boundary | BFF writes PostgreSQL directly | reject through architecture test and review | rejected diff, violated rule, repaired route |
| `FAIL-AI-002` | AI adds retry to non-idempotent write | generic retry annotation/wrapper | identify double-write risk and redesign contract | review finding, duplicate negative control |
| `FAIL-AI-003` | AI swallows cancellation/timeout | catches exception and returns fallback success | reject false success and preserve deadline semantics | mutation test, corrected typed failure |
| `FAIL-AI-004` | AI uses unbounded concurrency | `Promise.all`/parallel stream over unbounded input | add admission limit, backpressure and resource test | load comparison and reviewer explanation |
| `FAIL-AI-005` | AI introduces SQL/auth injection or tenant omission | string SQL / missing tenant predicate | block as high-risk; add negative/security control | scanner/test plus corrected implementation |
| `FAIL-AI-006` | AI exposes secret/PII in logs | logs request headers/body | redact, narrow logging and add leakage test | rejected candidate and scan receipt |
| `FAIL-AI-007` | AI makes frontend state dual-authoritative | duplicates server entity in global/local stores | choose one owner and test stale/reconnect path | state map and corrected browser test |
| `FAIL-AI-008` | AI generates tests that assert mocks only | unit test never executes real DB/Kafka/browser boundary | add Testcontainers/contract/E2E lane and falsifier | hollow-test mutation fails; real boundary passes |
| `FAIL-AI-009` | AI changes API/event schema silently | generated field rename/break | compatibility gate blocks and requires version/migration decision | schema diff and explicit ADR |
| `FAIL-AI-010` | AI claims completion from green CI | summary promotes deterministic PASS to production | Shadow blocks claim and opens runtime evidence issue | Shadow receipt and corrected status |

## P2 — scale and advanced design exercises

These are useful only after the MVP is closed; doing them first creates breadth without proof.

| ID | Exercise | Why it matters |
|---|---|---|
| `FAIL-401` | partition hot spot and repartition plan | demonstrates ordering-versus-scale judgment |
| `FAIL-402` | multi-region read lag and failover decision | demonstrates RPO/RTO and consistency trade-offs |
| `FAIL-403` | backfill/rebuild risk projection during live writes | demonstrates snapshot/version/watermark handling |
| `FAIL-404` | audit retention and deletion conflict | demonstrates compliance, lineage and data lifecycle |
| `FAIL-405` | dependency brownout with partial success | demonstrates degraded-mode product decisions |
| `FAIL-406` | cost runaway from traces/SSE/Kafka retention | demonstrates product-operational cost control |

## Interview preparation template

For each completed failure, prepare this concise structure:

```text
Context
  What user/system promise was at risk? State the evidence class.

Trigger
  What changed or failed? How was it detected?

Invariant
  What was never allowed to become false?

Diagnosis
  Which traces, metrics, logs, query plans or reproductions ruled causes in/out?

Decision
  Why mitigation/rollback/forward-fix was selected over alternatives?

Recovery
  How correctness and service were restored and residue reconciled?

Prevention
  Which contract, test, budget, alert, runbook or ownership rule changed?

Learning
  What assumption was wrong, and what would be done earlier next time?
```

Do not present only the technical fix. The hiring signal is judgment under uncertainty, communication across boundaries, preservation of user promises, and prevention of recurrence.

## Minimum interview-ready set

Before claiming strong coverage for this role, close at least these ten distinct stories:

```text
1. concurrent write / stale version
2. duplicate message and idempotent consumer
3. poison event and controlled replay
4. database saturation or deadlock
5. retry/circuit-breaker amplification
6. Node event-loop or SSE resource leak
7. React stale state or render-performance regression
8. schema migration and rollback/forward-fix
9. cross-tenant authorization defect
10. AI-generated defect caught by reviewer and falsifier
```

At least two should be authentic professional stories when the résumé claims production leadership. Portfolio exercises can fill skill gaps but cannot replace the truth of prior employment history.
