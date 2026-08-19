# Technology Selection

Selection date: 2026-08-20.

The stack is chosen to maximize direct overlap with the target Full Stack Seed Engineer role while keeping the MVP small enough to understand end-to-end. Exact versions are pinned only where they improve reproducibility; dependency updates require CI and license review.

## Chosen stack

| Layer | Choice | Why this choice | What it must prove |
|---|---|---|---|
| Java runtime | Java 21 LTS baseline | Modern production Java with virtual-thread capability while remaining conservative and widely deployable | threading/concurrency reasoning, profiling, transactions, domain correctness |
| Java framework | Spring Boot 4.1.x | Current stable production framework; strong HTTP, data, Kafka, actuator/observability ecosystem | production backend structure without hiding domain invariants |
| Java data access | Spring `JdbcClient` / explicit SQL | Keeps schema, constraints, queries, and transaction boundaries visible | database design depth rather than ORM-only familiarity |
| BFF runtime | Node.js 24 LTS | Production LTS line and direct job requirement | event-loop behavior, async control, timeout/retry, graceful shutdown |
| BFF framework | Fastify | Small typed/performant HTTP surface with explicit lifecycle/hooks | API shaping, validation boundary, rate-limit/resilience hooks |
| UI | React 19.2 + TypeScript | Direct job requirement and current React major/minor line | component boundaries, server/client state, error/loading states, performance reasoning |
| Frontend build | Vite | Minimal modern build setup; avoids framework-level rendering magic during foundation | build tooling, bundle behavior, testable SPA boundary |
| Transactional DB | PostgreSQL 18 | Mature relational semantics, strong constraints/index/query-plan story | modeling, transactions, locking/versioning, migrations, query evidence |
| Messaging | Apache Kafka 4.3.1 | Directly exercises async decoupling, at-least-once delivery and lag/recovery | outbox, idempotent consumer, eventual consistency, broker failure |
| API contract | OpenAPI 3.1 checked into repo | Contract-first parallel frontend/BFF/backend work | boundary ownership and compatibility review |
| Event contract | versioned JSON schema/envelope checked into repo | Makes event compatibility reviewable | schema evolution and replay safety |
| Java integration tests | JUnit + Testcontainers | Real DB/broker integration rather than mocks only | transaction/concurrency/recovery behavior |
| Frontend unit tests | Vitest + Testing Library | Fast component/state tests | render/state correctness |
| Browser E2E | Playwright | Cross-browser automation and user-path evidence | end-to-end product behavior |
| Telemetry | OpenTelemetry + Prometheus + Jaeger | Open standards and permissive projects; enough to correlate sync/async failures | traces, metrics, correlation and incident diagnosis |
| Security/license scanning | Trivy + lockfile/SBOM checks | Single scanner can cover vulnerabilities and license signals | dependency and release hygiene |
| CI | GitHub Actions | Canonical repo-native evidence path | repeatable gates and immutable run references |

## Why Java instead of Go for this portfolio

The role accepts Java or Go. Java is selected because it creates a tighter bridge from an Android/JVM background while still forcing backend-specific learning: server concurrency, JDBC transactions, connection pools, Kafka, process lifecycle, and distributed failure semantics. Adding Go would increase breadth but weaken depth for the first MVP.

## Why Node is a BFF, not a second source of domain truth

The role explicitly requires Node.js and Java/Golang. Splitting domain ownership across Node and Java would create artificial complexity. Node owns edge concerns and frontend-facing API composition; Java owns transactional business invariants. This creates a meaningful boundary that can be defended in system-design interviews.

## Why explicit SQL

The interview requirement includes database design/modeling. Explicit SQL keeps constraints, indexes, transaction isolation, and query plans visible. An ORM can be introduced later only when its benefit is demonstrated by a concrete use case.

## Concurrency model to demonstrate

- Node: event loop + asynchronous I/O; show the cost of CPU-heavy work and unbounded concurrency.
- Java: servlet/request concurrency with bounded resources; compare platform-thread and optional virtual-thread behavior under I/O load.
- PostgreSQL: optimistic version checks plus database constraints; discuss when pessimistic locking would be justified.
- Kafka: partition ordering and consumer-group concurrency; show that more consumers do not bypass partition/order constraints.

## Frontend engineering proof

The UI work is not admitted by "React page renders". It needs:

- component responsibility boundaries;
- explicit server-state strategy and request cancellation/staleness behavior;
- typed API boundary;
- loading/empty/error/pending/confirmed states;
- accessibility checks on core flow;
- rerender/profile evidence for one seeded regression;
- browser-level metric or trace evidence tied to a user action.

## Deliberately deferred

- Kubernetes/service mesh: too much infrastructure before the product and failure semantics are proven.
- GraphQL: no demonstrated aggregation problem requiring it.
- microservice decomposition beyond work-service + audit consumer: split only where asynchronous ownership creates a real boundary.
- Redis: add only when a measured cache/rate-limit/distributed-coordination need appears.
- managed cloud services: add after local/CI behavior is reproducible so cloud configuration does not replace engineering evidence.

## Official baselines checked on 2026-08-20

- Spring Boot stable documentation: https://docs.spring.io/spring-boot/index.html
- Spring Boot system requirements: https://docs.spring.io/spring-boot/system-requirements.html
- Node release/LTS status: https://nodejs.org/en/about/previous-releases
- React versions: https://react.dev/versions
- PostgreSQL 18 information: https://www.postgresql.org/about/press/presskit18/base/
- Apache Kafka supported downloads: https://kafka.apache.org/community/downloads/
