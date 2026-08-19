# Shadow Architect Ledger

## Monitor contract

The Shadow Architect is a read-only pre-side-effect and close-gate reviewer. It does not edit Builder paths, merge, deploy, resolve semantic conflicts, expose secrets, change repository visibility, or promote deterministic evidence into runtime/production evidence.

This ledger records public findings and verdicts only. It does not contain private reasoning.

## Candidate receipt

```yaml
candidate_id: FS-CONTROL-PLANE-BOOTSTRAP-001
repository: ed3c/Full-Stack-Notes
base_subject: a88bc30741bdf54ad9c54203b126221232baa9cc
head_subject: TO_BE_BOUND_TO_FINAL_DRAFT_PR_HEAD
semantic_delta:
  - define Full Stack Seed role evidence model
  - define Delivery Pulse MVP architecture and requirement DAG
  - define failure, AI-review, licensing and evidence-routing controls
forbidden_delta:
  - production or professional-experience promotion
  - repository visibility change
  - credential or private-repository disclosure
  - automatic merge, deployment or release authority
required_gates:
  - JSON/YAML/OpenAPI/schema parse and semantic checks
  - internal route/link and requirement reachability
  - source/license freshness policy
  - planted false-promotion and hollow-evidence controls
runtime_lanes:
  application: NOT_IMPLEMENTED
  ci: NOT_EXERCISED
  database: NOT_EXERCISED
  kafka: NOT_EXERCISED
  browser: NOT_EXERCISED
  load: NOT_EXERCISED
  failure_injection: NOT_EXERCISED
  deployment: NOT_EXERCISED
  organizational_adoption: NOT_EXERCISED
terminal_state: BLOCK
```

The exact `head_subject` must be updated after the candidate stops moving. A branch name alone is not an admissible subject.

## Global objective

> Produce credible, inspectable evidence that the candidate can own a production-shaped product across React, Node.js, Java, data, asynchronous systems, resilience, operations, and governed AI-assisted development—without fabricating professional experience or confusing design artifacts with executed proof.

## Findings

| ID | Severity | Finding | Why it matters | Required owner / close gate | State |
|---|---|---|---|---|---|
| `SHADOW-001` | critical | Delivery Pulse application code is absent | architecture cannot prove engineering ability | vertical-slice implementation issue; browser-to-event acceptance receipt | `OPEN` |
| `SHADOW-002` | critical | No deterministic root gate exists | documents/contracts can drift or become hollow | CI/verification owner; positive + mutation controls | `OPEN` |
| `SHADOW-003` | critical | No exact runtime deployment or rollback receipt exists | production claim is ineligible | deployment/game-day owner; immutable image/environment receipt | `OPEN` |
| `SHADOW-004` | critical | No performance baseline or complete denominator exists | frame/SLO numbers are hypotheses only | performance issue with hardware, dataset, mix, duration and errors | `OPEN` |
| `SHADOW-005` | critical | Repository cannot manufacture prior professional production leadership | job explicitly values real production ownership | user must supply truthful professional stories; portfolio claims remain separately classified | `OPEN_HUMAN_EVIDENCE` |
| `SHADOW-006` | high | Next.js web plus separate Fastify BFF may become an unjustified extra hop | duplicated web responsibilities can increase latency and operational surface | ADR after Slice 1 comparing integrated Next edge versus separate BFF | `OPEN` |
| `SHADOW-007` | high | Kafka and an asynchronous worker can become résumé-driven infrastructure | broker complexity must close a real consistency/lag/replay requirement | keep only after outbox, duplicate, poison, lag and replay controls pass | `OPEN` |
| `SHADOW-008` | high | Java 21 baseline and Java 25 CI lane need compatibility proof | dual runtime claims can hide unsupported dependencies | Gradle toolchain and CI matrix on exact dependencies | `OPEN` |
| `SHADOW-009` | high | framework and license choices can change after the observed source date | current correctness is time-dependent | pinned stack manifest, SBOM/license diff and scheduled freshness review | `OPEN` |
| `SHADOW-010` | high | Google Sheet/Doc URLs are absent | navigation request is not yet closed, but creating them now risks a second truth | create only after canonical fields and first admitted evidence exist | `DEFERRED_WITH_REASON` |
| `SHADOW-011` | high | private repository evidence routing is policy-only | accidental disclosure or inaccessible proof is possible | sanitized evidence registry and disclosure test before projection | `OPEN` |
| `SHADOW-012` | medium | initial SLO and frame budgets are uncalibrated | arbitrary targets can reward test-shaping | measure baseline, justify threshold and freeze workload before optimization | `OPEN` |
| `SHADOW-013` | medium | service discovery/load balancing is not exercised by Compose | one-process documentation cannot prove distributed routing | Phase-2 multi-instance failure receipt; do not add Kubernetes before Slice 1 | `OPEN` |
| `SHADOW-014` | medium | source articles/PDFs supplied later may contradict current architecture | current design must not silently absorb every proposal | register applicability and contradiction decision per source ID | `OPEN` |
| `SHADOW-015` | medium | AI-assisted evidence may become prompt theatre | prompt length/tool count do not prove review judgment | planted defects, rejected candidates, mutation tests and human review | `OPEN` |
| `SHADOW-016` | medium | failure catalogue is broad and can delay the first vertical slice | breadth without a working product weakens evidence | execute the ten minimum stories in dependency order; keep P2 deferred | `OPEN` |

## Applicability review

### Admitted requirements

- React component/state/rendering/performance judgment;
- Node.js BFF/event-loop/SSE/resource management;
- Java concurrency, transactions, locks and async processing;
- PostgreSQL modelling and schema evolution;
- Kafka decoupling, ordering boundary and eventual consistency;
- rate limiting, circuit breaking, load balancing and service readiness;
- AI task specification, review, correction and workflow scaling;
- product ambiguity, cross-team bottleneck discovery, teaching and lifecycle ownership.

### Not automatically admitted

- Go implementation in addition to Java;
- microservice count as a hiring metric;
- Kubernetes/service mesh before a measured need;
- multi-region writes, event sourcing or GraphQL;
- autonomous AI deployment/merge authority;
- Google Docs/Sheets as canonical sources;
- any claim of users, traffic, uptime, savings, production leadership or organizational adoption without direct evidence.

## Contradiction checks

```text
job says Java OR Go
  → architecture selects Java; adding Go is not required

job says Node.js AND React
  → web and BFF have explicit responsibilities; duplication remains an ADR risk

job says production experience
  → portfolio can show production-shaped judgment but cannot retroactively create employment history

job says AI-tool fluency
  → evidence focuses on constraint quality, review, falsification and correction; not tool logos or prompt volume

job says distributed systems
  → start with one domain writer and explicit async boundary; do not equate service count with distributed-system understanding
```

## Evidence ceiling

At candidate bootstrap, the maximum truthful statement is:

> The repository contains a reviewable, requirement-linked plan and contract for a production-shaped Full Stack Seed portfolio MVP.

Forbidden statements include:

```text
MVP is built
production architecture is validated
system meets the proposed SLOs
failure recovery works
AI workflow improves productivity
team adoption is proven
candidate has professional Java/Node/React production experience because this repository exists
```

## Close sequence

```text
freeze requirements/contracts
→ implement synchronous vertical slice
→ deterministic and browser gates
→ add outbox/Kafka/projection/SSE
→ duplicate/order/poison controls
→ observability and performance baseline
→ fault/rollback game-day
→ independent Shadow re-evaluation on exact subjects
→ Human Admit for public/interview claims
```

## Current verdict

```text
CONTROL_PLANE_STRUCTURE: CANDIDATE
GLOBAL_OBJECTIVE: BLOCKED
DETERMINISTIC_ADMISSION: BLOCKED_PENDING_GATES
RUNTIME_ADMISSION: NOT_EXERCISED
PORTFOLIO_PROMOTION: NOT_ELIGIBLE
MERGE_AUTHORITY: HUMAN_ADMIT_REQUIRED
```
