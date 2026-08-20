# Evidence Schema

The repository separates claims from proof so an architecture narrative cannot silently become a resume claim.

## Evidence state

`PROPOSED -> CONTRACTED -> IMPLEMENTED -> VERIFIED -> RUNTIME_EVIDENCE -> HUMAN_ADMITTED`

| State | Minimum requirement |
|---|---|
| `PROPOSED` | Requirement/capability is identified. |
| `CONTRACTED` | Acceptance criteria, interface, invariant, and failure semantics are recorded. |
| `IMPLEMENTED` | Code/configuration exists on a reviewable commit. |
| `VERIFIED` | Required automated checks pass. |
| `RUNTIME_EVIDENCE` | Reproducible execution artifact records the scenario and observed result. |
| `HUMAN_ADMITTED` | Reviewer accepts the artifact as support for the exact claim. |

No state may be skipped because an AI agent reports success.

## Evidence record

Each admitted capability should have a small machine/human-readable record under `docs/evidence/runs/<run-id>/` or an immutable CI artifact containing equivalent fields:

```yaml
run_id: FS-XX-YYYYMMDD-NNN
requirement_ids: [FS-XX]
failure_ids: [F-XX]
claim: "Exact capability claim"
evidence_state: RUNTIME_EVIDENCE
source_commit: "git sha"
source_pr: "PR URL/number"
environment:
  runtime: "runtime/tool versions"
  topology: "services used"
  hardware: "relevant CPU/memory details when performance is claimed"
scenario:
  preconditions: "state before run"
  input: "request/load/fault input"
  command_or_workflow: "reproducible execution entrypoint"
expected: "observable acceptance criteria"
observed: "actual result"
artifacts:
  - "test report/log/trace/metric/screenshot/artifact path"
review:
  shadow_architect: "PASS | FINDINGS"
  human_admission: "PENDING | ACCEPTED | REJECTED"
known_gaps: []
```

## Claim classes

- `PORTFOLIO_SIMULATION`: code/run produced specifically for this portfolio.
- `REAL_PROJECT_PUBLIC`: real system evidence that is publicly shareable.
- `REAL_PROJECT_PRIVATE`: real prior evidence kept private and sanitized for interview discussion.
- `PROCESS_ADOPTION`: evidence another human/team used the workflow or artifact.

A portfolio simulation may prove technical capability; it does not prove prior production ownership, customer traffic, employer impact, or organizational adoption.

## Failure evidence

For every failure drill, capture:

`trigger -> user impact -> detection -> diagnosis -> containment -> fix -> regression prevention -> recovery result -> residual risk`

A test that only asserts an error code is insufficient when the failure claim concerns concurrency, durability, recovery, or operational diagnosis.

## AI-assisted change evidence

For material AI-assisted changes, record enough to show engineering judgment:

- requested scope and constraints;
- changed files/semantic boundary;
- tests/static analysis/security/license checks;
- incorrect or out-of-scope generated output rejected by the engineer;
- final human-reviewed diff;
- any unresolved uncertainty.

The target claim is controlled acceleration with verification, not raw code-generation volume.

## Shadow Architect closure audit

Before human admission, the monitor asks:

1. Is the requirement linked to exact implementation paths?
2. Is there an invariant or contract that can be falsified?
3. Are the relevant failure modes executed, not merely documented?
4. Does telemetry explain the failure and recovery path?
5. Is the evidence tied to a source commit and reproducible workflow?
6. Does the claim exceed what the artifact proves?
7. Are Google Docs/Sheets projections consistent with GitHub truth?

Any `no` creates a finding and blocks `HUMAN_ADMITTED`.
