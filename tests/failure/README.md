# Failure Drill Index

PR-6 executes the minimum interview-ready failure set from `docs/role/FAILURE_EXPERIENCE_CATALOG.md`.

Re-executed deterministic regressions: `F-01`, `F-03`, `F-04`, `F-17`.

Live fault drills: `F-02`, `F-05`, `F-11`, `F-11-LB`, `F-14`, `F-20`, `F-23`.

Every admitted receipt uses the same shape: trigger, expected behavior, observed behavior, recovery, residual risk, result, and evidence kind. The final `resilience-summary.json` is emitted only after every required receipt exists.
