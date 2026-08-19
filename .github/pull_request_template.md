## Requirement and exact subject

- Requirement IDs:
- Issue / parent / convergence owner:
- Base commit:
- Head commit:
- Relation: `SIBLING | TRUE_CHILD | CONVERGENCE | PROCESS_DEPENDENCY | EXTERNAL_EVIDENCE`
- Owned paths:

## Product/system problem

What user or system promise is being changed or protected?

## In scope

-

## Out of scope / forbidden delta

-

## Interfaces and invariants

- OpenAPI/event/schema identifiers:
- Transaction/state invariant:
- Concurrency/idempotency invariant:
- Security/tenant invariant:
- Resource/deadline/retry budget:

## Implementation

Describe the smallest coherent delta and why the selected boundary is correct.

## Verification

| Lane | Command / artifact | Exact result | Evidence ceiling |
|---|---|---|---|
| format/lint/type |  | `PASS/FAIL/NOT_EXERCISED` | deterministic |
| unit/contract |  |  | deterministic |
| integration |  |  | integration |
| browser |  |  | browser |
| security/license |  |  | deterministic |
| performance/load |  |  | runtime |
| fault/recovery |  |  | runtime |
| deployment |  |  | production-like |

### Positive control

-

### Negative / mutation / disagreement control

-

### Cleanup and residue

-

## AI-assisted provenance

- Tool/model/mode:
- Sanitized task packet:
- Generated paths:
- Human corrections/rejections:
- Planted or plausible weak candidate killed by:

Generated code is a candidate; this section is not an admission signal by itself.

## Tech Lead controller check

- [ ] requirement IDs, owners and acceptance are frozen
- [ ] task/branch DAG reflects real byte dependencies
- [ ] one writer owns every changed path
- [ ] retries, cancellation, cleanup and handoff are bounded
- [ ] local gates pass on the exact head
- [ ] shared indexes/AGENTS/README are updated only by convergence owner

## Independent Shadow Architect check

- [ ] same immutable candidate was reviewed independently
- [ ] applicability and contradictions were checked
- [ ] evidence ceiling and denominator are truthful
- [ ] no production/professional/adoption claim is inferred from docs or CI
- [ ] critical findings are fixed or have an open owner
- [ ] forbidden delta, rollback and residue were checked

## Claim eligibility

Current maximum claim class:

- [ ] `DESIGN_ONLY`
- [ ] `PORTFOLIO_DETERMINISTIC`
- [ ] `PORTFOLIO_LIVE`
- [ ] `PROFESSIONAL` — requires truthful external experience, not created by this PR

## Human gates

- [ ] Human Admit for merge
- [ ] Human Admit for deployment/release, if applicable
- [ ] Human Admit for public résumé/interview wording
