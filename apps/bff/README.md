# Node.js BFF

This service owns web-edge policy for the Operations Work Queue. It does **not** own Java domain invariants or write PostgreSQL directly.

## Runtime and dependency pins

- Node.js `24.19.0` (LTS line selected for this portfolio node)
- npm `11.17.0`
- Fastify `5.10.0` — MIT
- TypeScript `6.0.3` — Apache-2.0
- `@types/node` `24.3.0` — MIT / DefinitelyTyped package

The committed `package-lock.json` is the exact transitive dependency subject and CI installs it with `npm ci --ignore-scripts`.

Lockfile sanity review found no missing license metadata. Current license classes are MIT, BSD-3-Clause, ISC, and Apache-2.0. Dependency/version changes must repeat the repository-wide third-party review; this is an engineering record, not legal advice.

## Boundary

```text
browser / future React app
        |
        v
   apps/bff (this service)
        |
        | HTTP + X-Request-Id + Idempotency-Key + If-Match
        v
services/work-service (Java domain owner)
        |
        v
    PostgreSQL
```

Forbidden: `apps/bff` importing PostgreSQL drivers, opening a database connection, or reimplementing the work-item state machine.

## Policy

### Request correlation

A valid incoming `X-Request-Id` is propagated to Java. Otherwise the BFF generates a UUID. The same ID is returned on the BFF response.

### Timeout and retry

The downstream request has one absolute deadline (`UPSTREAM_TIMEOUT_MS`, default 1500 ms). Retries cannot extend that deadline.

- GET: may retry network failures and HTTP 502/503/504.
- mutation: the client requires `Idempotency-Key`; only then is retry eligibility allowed.
- retryable mutation attempts preserve the same request ID and idempotency key.
- max attempts: `UPSTREAM_MAX_ATTEMPTS`, default 2, hard-capped at 3.
- 4xx/domain conflicts are never retried.
- timeout is surfaced as a bounded typed edge failure, never false success.

### Rate limit

The MVP uses a **process-local IP token bucket** (`RATE_LIMIT_CAPACITY`, `RATE_LIMIT_REFILL_PER_SECOND`). Health/readiness are exempt. Bucket cardinality is bounded and stale entries are pruned.

This is deliberately not a claim of distributed fairness. Shared-state/tenant-aware limits remain deferred in issue #27 until multi-instance evidence needs them.

### Graceful shutdown

On `SIGTERM` or `SIGINT`:

1. readiness flips to draining;
2. new work receives 503;
3. Fastify closes and drains in-flight work;
4. `SHUTDOWN_TIMEOUT_MS` bounds the drain; timeout forces non-zero exit;
5. registered signal listeners have an explicit disposal path for clean test/process lifecycle ownership.

## Commands

```bash
npm ci --ignore-scripts
npm run verify
npm start
```

Environment:

```text
WORK_SERVICE_BASE_URL=http://127.0.0.1:8080
PORT=3000
UPSTREAM_TIMEOUT_MS=1500
UPSTREAM_MAX_ATTEMPTS=2
UPSTREAM_RETRY_BASE_DELAY_MS=25
RATE_LIMIT_CAPACITY=20
RATE_LIMIT_REFILL_PER_SECOND=10
SHUTDOWN_TIMEOUT_MS=5000
```

## Verified evidence

Exact-head verification before this documentation-only update:

- implementation head: `3b0f650a64c657e66fd396ecf0ef5944e4ace44d`
- workflow: `node-bff-ci`
- run: `32296356649`
- deterministic `npm ci`: PASS
- TypeScript + tests: PASS (`10/10`)
- frozen shared contract validator: PASS
- direct-database boundary gate: PASS

This README update changes documentation only; the PR metadata carries the exact implementation/run receipt.

## Evidence ceiling

Passing this package's CI proves deterministic BFF policy behavior and real HTTP client integration against a test upstream. It does not prove Java+BFF end-to-end runtime, multi-instance distributed rate limiting, production traffic, saturation recovery, or production operations. Those remain downstream in #21/#22.
