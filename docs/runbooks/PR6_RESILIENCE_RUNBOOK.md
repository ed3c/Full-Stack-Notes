# PR-6 Resilience / Observability Runbook

Status target: `RUNTIME_EVIDENCE` for deterministic local/CI drills only.

This runbook is a **simulation record**, not a claim of prior production incident ownership. It exists to make the failure mechanism, detection path, recovery action, and evidence ceiling reviewable.

## Topology

```text
React regression tests

Live HTTP/load drills
  -> Node BFF :3000
  -> Toxiproxy :18080
  -> Nginx load balancer :18081
       -> work-service-1 :8081 --\
       -> work-service-2 :8082 ----> PostgreSQL :55432
                                  -> transactional outbox
                                  -> Kafka :19092
                                  -> audit-consumer
                                  -> audit.audit_event

work-service-* + audit-consumer
  -> OpenTelemetry Java agent 2.30.0
  -> OTel Collector 0.159.0
       -> Jaeger 2.20.0 (traces)
       -> Prometheus 3.13.2 (metrics)
       -> evidence file exporters
```

Toxiproxy is pinned to `2.12.0`. Nginx is an explicit edge between BFF and the two Java instances; it is not service-mesh or Kubernetes evidence.

## Discovery / health model

The PR-6 mechanism intentionally uses the smallest explicit model that can be falsified:

- discovery: static Nginx upstream membership (`8081`, `8082`);
- readiness before admission: harness probes each Java instance directly with `GET /v1/work-items?limit=1`;
- liveness: process PID + direct HTTP probe;
- endpoint removal: Nginx passive health (`max_fails=1`, `fail_timeout=2s`) and upstream retry;
- re-admission: after restart/readiness and fail timeout, the endpoint becomes eligible again;
- proof: Nginx access log records `$upstream_addr`, `$upstream_status`, request ID, and timing.

This proves the load-balancing/removal mechanism locally. It does not claim dynamic registry, cloud load balancer, Kubernetes readiness gates, or production rollout experience.

## Failure state machine

```text
HEALTHY
  |-- F-05 latency toxic ------------> BOUNDED_TIMEOUT ------> toxic removed ------> HEALTHY
  |-- F-11 DB lock/load -------------> POOL_SATURATED ------> lock released ------> HEALTHY
  |-- kill work-service-1 -----------> ONE_ENDPOINT_DOWN ---> restart/readmit -----> HEALTHY
  |-- F-02 stop Kafka ---------------> OUTBOX_PENDING ------> broker restart ------> PUBLISHED
  |                                                                  |
  |                                                                  v
  |                                                         AUDIT_CONVERGED
  |-- F-14 stop audit-consumer -----> CONSUMER_LAG --------> restart -------------> LAG_ZERO
```

## Executed minimum set

PR-6 re-executes deterministic tests for F-01, F-03, F-04, and F-17, then runs live faults for F-02, F-05, F-11, F-14, F-20, and F-23. Every receipt must contain:

`trigger -> expected -> observed -> recovery -> residualRisk`.

### F-01 duplicate create

Concurrent identical idempotent create calls must produce one resource and one replay. Executed through the Java/PostgreSQL integration test again in PR-6.

### F-02 broker outage after command commit

Kafka is stopped before a create. The HTTP command must still commit successfully; its outbox row must remain pending. After Kafka restart the same durable row must publish and appear once in the audit projection.

### F-03 redelivery

The audit integration test delivers the same event twice and proves one projection with preserved correlation.

### F-04 concurrent transition

Two versioned transitions race. Exactly one succeeds and the other receives a version conflict; no lost update is admitted.

### F-05 downstream latency

Toxiproxy injects 2500 ms downstream latency between BFF and Nginx. The BFF absolute 1500 ms deadline must bound failure and return a typed timeout. Removing the toxic must restore success.

### F-11 DB pool exhaustion + two-instance routing

Both Java instances run with Hikari max pool size 2. A deterministic PostgreSQL `ACCESS EXCLUSIVE` lock holds the query while 16-way HTTP concurrency consumes/waits for connections. Evidence records latency/error distribution, Hikari saturation signal, and recovery.

A separate sub-drill terminates `work-service-1` during traffic. Before the fault both upstream ports must appear in Nginx access logs; during the fault requests must remain successful through instance 2; after restart instance 1 must reappear.

### F-14 consumer lag / restart

The audit consumer is stopped, three events are published, Kafka group lag is measured, then the consumer restarts. Receipt records convergence time until all projections exist and lag reaches zero.

### F-17 stale React response

The PR-3 async-state regression suite is re-executed from the immutable React snapshot. JSDOM proves the client-state invariant, not browser/Web-Vitals timing.

### F-20 observability blind spot

The drill correlates:

- Jaeger service traces,
- Prometheus runtime/HTTP metrics,
- Nginx/process logs with `X-Request-Id`,
- outbox/audit records with request/event correlation.

Transactional outbox scheduling is treated as a **trace boundary**. PR-6 does not invent a fake single distributed trace across a context that was not persisted; request ID / event ID is the canonical join key for the async hop.

### F-23 plausible AI contract drift

A temporary seeded patch removes the required `Idempotency-Key` from `createWorkItem`. The existing frozen-stack contract/ownership gate must reject it. The canonical file is restored and the gate must pass again. This is an AI-error simulation, not a real model incident.

## Load receipt

Baseline and saturation runs record:

- environment;
- request count;
- concurrency;
- duration;
- throughput;
- status distribution;
- error rate;
- min/mean/p50/p95/p99/max latency.

No result from GitHub Actions is generalized into a production capacity or SLO claim.

## Incident/tabletop record

Scenario: work queue writes continue while Kafka is unavailable, followed by audit lag after consumer restart.

| Phase | Simulated operator action | Evidence / decision |
|---|---|---|
| Detect | Observe pending outbox and failed broker connectivity | Do not fail already-committed user command |
| Contain | Preserve durable outbox; do not bypass event contract | Avoid dual-write workaround or manual DB edits |
| Recover | Restart broker, then measure outbox publication | Require same event ID / one audit projection |
| Secondary failure | Stop audit consumer and allow lag to accumulate | Measure lag instead of assuming eventual consistency is fast |
| Recover consumer | Restart group and time convergence to zero lag | Keep residual single-broker/single-partition limitation explicit |
| Review | Correlate traces, metrics, logs, request IDs, Kafka offsets | Do not label the simulation a production incident |

## Evidence ceiling

PR-6 can admit deterministic runtime resilience evidence only. It cannot admit:

- production traffic, SLO compliance, or capacity planning;
- multi-broker Kafka durability;
- cloud/Kubernetes discovery and rollout behavior;
- real incident command or on-call ownership;
- organization-wide adoption;
- browser Web-Vitals unless a real browser measurement is added and separately evidenced.
