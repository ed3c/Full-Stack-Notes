# Full Stack Seed Role Evidence Matrix

This matrix converts the job description into stable evidence obligations. It is not a résumé scorecard and does not transform a portfolio exercise into professional production experience.

## Status vocabulary

```text
DEFINED              requirement and proof contract exist
NOT_IMPLEMENTED      implementation is absent
NOT_EXERCISED        implementation may exist, but named runtime proof is absent
PARTIAL              some required proof exists; denominator remains open
CONTRACT_CLOSED      deterministic contract and controls pass on an exact subject
LIVE_CLOSED          named live/runtime proof passes on an exact environment
HUMAN_ADMIT_REQUIRED evidence is eligible for human review, not self-promoted
```

## Core role requirements

| ID | Hiring signal | Delivery Pulse evidence | Required acceptance proof | Current state |
|---|---|---|---|---|
| `FS-ROLE-001` | Own frontend-to-backend product delivery | initiative create → transition → event → risk projection → SSE update | Playwright trace correlated to BFF, Java transaction, Kafka event and browser update | `DEFINED` |
| `FS-ROLE-002` | Integrate Cursor/Copilot/Claude Code-style tools | public AI change packet, exact base, constraints, generated candidate, corrections and receipt | one admitted and one rejected/corrected candidate for each major plane | `DEFINED` |
| `FS-ROLE-003` | Turn product need into runnable implementation | PRD requirement IDs, UX states, OpenAPI/event contracts and acceptance tests | every source requirement reaches an owner, control and exact implementation subject | `DEFINED` |
| `FS-ROLE-004` | Act as a full-stack seed and teach others | reusable ADR, runbook, prompt packet, review checklist and demo walkthrough | another engineer/agent follows zero-context instructions and produces a valid receipt | `NOT_EXERCISED` |
| `FS-ROLE-005` | Find cross-team efficiency bottlenecks | Delivery Pulse handoff/SLA model plus measured developer-flow baseline | before/after lead-time or rework experiment with complete denominator | `NOT_EXERCISED` |
| `FS-ROLE-006` | Participate from idea through iteration | discovery note → decision → implementation → deploy → telemetry → iteration | one release and one evidence-backed product change after observing behavior | `NOT_IMPLEMENTED` |
| `FS-LEAD-001` | Self-directed, boundaryless ownership | issue discovery, risk register, explicit owner and convergence DAG | at least one defect found outside assigned slice, repaired without authority expansion | `NOT_EXERCISED` |
| `FS-PRODUCT-001` | Product and operations thinking | user/problem hypothesis, non-goals, SLO, support and rollback design | interview case links product decision to technical/operational trade-off | `DEFINED` |
| `FS-COMM-001` | Logical communication | architecture narrative, ADRs, postmortem and concise interview pack | five-minute and thirty-minute versions remain factually consistent | `NOT_EXERCISED` |

## Backend requirements

| ID | Hiring signal | Delivery Pulse evidence | Required acceptance proof | Current state |
|---|---|---|---|---|
| `FS-BE-001` | Strong Java or Go foundation | Java 21/Spring Boot core, Java 25 CI compatibility lane | typed domain model, error model, tests, profiling and code review | `NOT_IMPLEMENTED` |
| `FS-BE-002` | High-concurrency programming | virtual-thread request model, bounded DB/Kafka/SSE resources, cancellation | load result plus virtual-thread pinning, deadlock and saturation controls | `DEFINED` |
| `FS-BE-003` | Locks and asynchronous programming | optimistic version, selective row/advisory lock, deadline propagation | concurrent transition race proves one valid result and typed conflicts | `DEFINED` |
| `FS-BE-004` | Kafka/RabbitMQ experience | Kafka outbox/relay/inbox, consumer lag, retries and DLQ | duplicate, out-of-order, poison message, rebalance and replay receipts | `DEFINED` |
| `FS-BE-005` | Eventual consistency | command version and projection source version surfaced separately | stale projection is visible and converges without duplicate side effect | `DEFINED` |
| `FS-BE-006` | Service discovery/load balancing | Phase-2 multi-instance service deployment and readiness-based routing | instance loss during load preserves declared SLO or records breach/recovery | `NOT_IMPLEMENTED` |
| `FS-BE-007` | Circuit breaking/rate limiting | per-operation Resilience4j breaker; tenant/global BFF limits | half-open, retry storm, noisy-neighbour and overload controls | `DEFINED` |
| `FS-BE-008` | Core backend concepts | deadlines, idempotency, validation, authorization, backpressure, audit | contract/integration/negative tests and trace-linked failure evidence | `DEFINED` |

## Node.js requirements

| ID | Hiring signal | Delivery Pulse evidence | Required acceptance proof | Current state |
|---|---|---|---|---|
| `FS-NODE-001` | Strong Node.js engineering | Fastify BFF on Node 24 LTS | strict TypeScript, schema validation, abort/deadline and typed errors | `NOT_IMPLEMENTED` |
| `FS-NODE-002` | Event-loop and resource awareness | event-loop delay, open-handle, SSE cap and disconnect cleanup metrics | CPU-blocking and leaked-client negative controls; no residue after test | `DEFINED` |
| `FS-NODE-003` | Web/backend boundary judgment | BFF owns session/aggregation; Java owns domain writes | architecture test rejects direct BFF database imports/connections | `DEFINED` |

## Frontend requirements

| ID | Hiring signal | Delivery Pulse evidence | Required acceptance proof | Current state |
|---|---|---|---|---|
| `FS-FE-001` | Deep React capability | initiative table/detail/transition UI, stream status, error and stale states | component/route tests plus browser acceptance and profiler artifacts | `NOT_IMPLEMENTED` |
| `FS-FE-002` | Component architecture and reuse boundaries | domain-neutral primitives separated from product composites; no premature design system | duplicate/variant pressure documented before abstraction | `DEFINED` |
| `FS-FE-003` | State-management judgment | URL, server, local form and SSE cursor states have explicit owners | stale/duplicate/reconnect tests show no conflicting source of truth | `DEFINED` |
| `FS-FE-004` | Modern build and TypeScript engineering | Next.js 16.2 LTS, strict TS, generated contract client, lint/type/test/build gates | clean build from lockfile; no implicit `any`; generated output freshness | `DEFINED` |
| `FS-FE-005` | Automated testing | Vitest/component tests + Playwright cross-browser flows | loading/empty/error/permission/reconnect/mobile/reduced-motion coverage | `DEFINED` |
| `FS-FE-006` | Rendering strategy | server shell/list, client interaction/live state, streamed slow projection | trace proves no route-wide blocking on projection and no hydration mismatch | `DEFINED` |
| `FS-FE-007` | Critical rendering path and frame budgeting | route bundle report, React Profiler, browser performance trace | declared route/frame budget passes on exact device/browser scenario | `NOT_EXERCISED` |
| `FS-FE-008` | Performance monitoring attribution | Web Vitals + interaction ID + backend trace correlation | slow user action is attributable to browser, network, BFF, core, DB or async lag | `NOT_IMPLEMENTED` |

## Data and production requirements

| ID | Hiring signal | Delivery Pulse evidence | Required acceptance proof | Current state |
|---|---|---|---|---|
| `FS-DATA-001` | Database design and modelling | normalized command model, append-only transition audit, projection and indexes | migration, constraints, query plans, concurrency and tenant-isolation tests | `DEFINED` |
| `FS-DATA-002` | Safe schema evolution | expand/contract migration and application compatibility window | old/new app compatibility test plus rollback or forward-fix runbook | `NOT_IMPLEMENTED` |
| `FS-PROD-001` | Led a production E2E project | production-like deployment, SLO, on-call runbook, incident and iteration evidence | immutable deployment, traffic, failure/recovery and post-release decision receipts | `NOT_IMPLEMENTED` |
| `FS-PROD-002` | Operational ownership | health/readiness, alert, dashboard, capacity, backup/restore and rollback | game-day produces detection, mitigation, recovery, residue and postmortem evidence | `NOT_IMPLEMENTED` |
| `FS-PROD-003` | Secure delivery | tenant authz, CSRF/session, dependency/SBOM/secret/container checks | cross-tenant and privilege negative controls; high findings owned or blocked | `DEFINED` |

## AI-assisted engineering requirements

| ID | Hiring signal | Delivery Pulse evidence | Required acceptance proof | Current state |
|---|---|---|---|---|
| `FS-AI-001` | Express requirements and constraints to AI | machine-readable task packet with in/out scope, forbidden changes and tests | agent output stays within leased paths and frozen interfaces | `DEFINED` |
| `FS-AI-002` | Review and repair generated code | review log covers correctness, security, concurrency, performance and operations | planted AI-shaped defect is detected; corrected patch passes mutation control | `NOT_EXERCISED` |
| `FS-AI-003` | Scale an AI-assisted workflow | reusable prompt packet, PR template, evidence schema and agent read route | second capability follows same process without copying hidden context | `DEFINED` |
| `FS-AI-004` | Know AI limits | explicit no-authority boundaries for secrets, merge, deploy and semantic conflict | automation fails closed and hands off with exact missing evidence | `DEFINED` |

## Evidence scoring rule

Do not count the number of repositories, files, tests, prompts, or agents. Score one capability only when its complete evidence chain is present:

```text
source requirement
→ stable ID
→ architecture owner
→ implementation
→ positive control
→ negative/mutation control
→ exact runtime evidence when applicable
→ failure/recovery evidence
→ human-admitted interview claim
```

## Interview claim classes

```text
PROFESSIONAL
  personally performed in an employer/customer production setting and safe to disclose

PORTFOLIO_LIVE
  executed in a public or private production-like environment with exact receipts

PORTFOLIO_DETERMINISTIC
  implemented and tested locally/CI; no live claim

DESIGN_ONLY
  architecture or exercise plan exists; no implementation claim

NOT_DISCLOSABLE
  real experience exists but details must remain abstract and cannot use inaccessible proof as a public citation
```

Every answer must name its class. A portfolio game-day may demonstrate judgment; it must never be narrated as an employer incident.
