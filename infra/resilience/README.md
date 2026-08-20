# PR-6 Resilience Harness

Run the complete deterministic drill set with:

```bash
./infra/resilience/runtime.sh run
```

The harness requires Docker Compose, Java 21, Maven, Node.js 24, npm, Python 3, and curl. It materializes the immutable PR-5 BFF/React inputs through the existing integration lock, downloads the pinned OpenTelemetry Java agent through Maven Central, executes inherited correctness regressions, starts the live fault topology, runs failure/load drills, and tears down volumes/processes on exit.

Evidence is written under `${RUNTIME_EVIDENCE_DIR}` (default `.runtime/pr6/evidence`). Runtime process logs live under `.runtime/pr6/logs`.

The topology and evidence ceiling are defined in `docs/runbooks/PR6_RESILIENCE_RUNBOOK.md`.
