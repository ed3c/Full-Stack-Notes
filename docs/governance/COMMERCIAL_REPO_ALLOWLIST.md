# Commercially Governable Repository and Dependency List

Observed: **2026-08-19**. This is an engineering governance screen, not a legal opinion. The exact release/tag, transitive dependency graph, NOTICE files, trademarks, distribution model, and modifications must be reviewed again when a component is pinned.

## Policy classes

```text
PERMISSIVE_BASELINE
  MIT, Apache-2.0, BSD-2/3-Clause, PostgreSQL License or similarly admitted terms.
  May be used in the baseline after exact-version SBOM and notice checks.

RUNTIME_BOUNDARY
  License may be compatible with normal application use but source modification,
  redistribution, plugins or hosted-service behavior needs explicit review.

REVIEW_REQUIRED
  source-available, copyleft/network-copyleft, dual/multi-license, mixed-license,
  unknown subtrees, commercial feature split or materially changed upstream terms.

BLOCK_UNTIL_REVIEWED
  no license, unclear provenance, copied snippets/assets/models/data, or terms that
  conflict with the intended distribution/service model.
```

A permissive top-level repository does not automatically admit every bundled asset, image, font, model, plugin or transitive package.

## Admitted baseline candidates

| Component / repository | Intended role | Observed license | Class | Governance note |
|---|---|---|---|---|
| `nodejs/node` | Node.js runtime | MIT | `PERMISSIVE_BASELINE` | pin Node 24 LTS patch and official image digest |
| `facebook/react` | UI runtime | MIT | `PERMISSIVE_BASELINE` | pin React 19.2 patch via lockfile |
| `vercel/next.js` | React framework | MIT | `PERMISSIVE_BASELINE` | choose latest patched 16.2 Active LTS; record security advisory state |
| `fastify/fastify` | Node BFF framework | MIT | `PERMISSIVE_BASELINE` | validate plugin licenses separately |
| `spring-projects/spring-boot` | Java application framework | Apache-2.0 | `PERMISSIVE_BASELINE` | pin Spring Boot 4.1.x and BOM |
| `apache/kafka` | asynchronous event transport | Apache-2.0 | `PERMISSIVE_BASELINE` | broker/client/container image notices remain required |
| PostgreSQL | canonical database | PostgreSQL License | `PERMISSIVE_BASELINE` | permissive BSD-like terms; trademark rules remain separate |
| `valkey-io/valkey` | cache/rate-control assist | BSD-3-Clause | `PERMISSIVE_BASELINE` | selected instead of current Redis licensing complexity |
| `resilience4j/resilience4j` | breaker/retry/bulkhead/rate limiter | Apache-2.0 | `PERMISSIVE_BASELINE` | Java/runtime compatibility must be tested |
| `open-telemetry/opentelemetry-java` | instrumentation | Apache-2.0 | `PERMISSIVE_BASELINE` | Collector/exporter component licenses still scanned |
| `open-telemetry/opentelemetry-collector` | telemetry pipeline | Apache-2.0 | `PERMISSIVE_BASELINE` | pin distribution and components explicitly |
| `prometheus/prometheus` | metrics store/query | Apache-2.0 | `PERMISSIVE_BASELINE` | use as external runtime; internal Go APIs are not a supported library contract |
| `jaegertracing/jaeger` | trace exploration | Apache-2.0 | `PERMISSIVE_BASELINE` | image/SBOM pin required |
| `testcontainers/testcontainers-java` | integration-test infrastructure | MIT | `PERMISSIVE_BASELINE` | container dependencies retain their own licenses |
| `microsoft/playwright` | browser E2E | Apache-2.0 | `PERMISSIVE_BASELINE` | browser binaries and notices need artifact review |
| `Shopify/toxiproxy` | network fault injection | MIT | `PERMISSIVE_BASELINE` | test/runtime tool only; no production dependency |
| `flyway/flyway` core/PostgreSQL modules | SQL migration | Apache-2.0 files/modules observed | `PERMISSIVE_BASELINE_WITH_PIN` | repository reports additional/unknown license material; admit only exact modules after SBOM/file check |

## Runtime boundary candidates

| Component | Boundary | Why it is not a simple permissive-source row |
|---|---|---|
| OpenJDK / Eclipse Temurin | use an official binary/runtime; do not vendor or modify JVM source in this project | OpenJDK code is generally GPLv2 with Classpath Exception; normal application use differs from redistributing a modified runtime |
| Docker Desktop | developer tool only under its applicable commercial terms | product terms depend on organization/use; Docker Engine/container images have separate licenses |
| GitHub Actions marketplace actions | pin full commit SHA; inspect source and license | mutable tags and composite dependencies can introduce supply-chain/license changes |
| cloud managed PostgreSQL/Kafka/Valkey | service API boundary | service terms, data residency, egress and commercial cost are contract questions, not just source licenses |
| Cursor/Copilot/Claude Code or other AI tools | local/hosted development boundary | prompts, code retention, training, enterprise privacy and generated-code provenance require account/policy review |

## Explicit review-required or excluded defaults

| Component / repository | Observed state | Baseline decision |
|---|---|---|
| `liquibase/liquibase` current Community | Functional Source License with a future Apache-2.0 grant; commercial product split | **exclude from baseline**; use pinned Flyway Core or plain reviewed SQL migrations |
| `grafana/grafana` | AGPL-3.0-only by default with listed Apache exceptions | **not distributed in baseline**; Prometheus UI + Jaeger is sufficient initially; legal review before hosted/modified/distributed use |
| Grafana Loki/Mimir and extracted datasource plugins | AGPL-3.0 | **exclude from baseline** unless an explicit operational/legal decision is made |
| `redis/redis` 7.4–7.8 | RSALv2 or SSPLv1 | **exclude from baseline** |
| `redis/redis` 8.x+ | RSALv2 / SSPLv1 / AGPLv3 choice, plus module/optimization constraints | **exclude from baseline**; use Valkey BSD-3-Clause |
| Elasticsearch/Kibana distributions | mixed Elastic/SSPL/AGPL and commercial feature terms across versions/artifacts | **exclude until exact artifact and use model are reviewed** |
| any repository with no license | copyright defaults to no granted reuse rights | **block** |
| GPL/AGPL code copied into Apache-2.0 application source | reciprocal obligations can conflict with intended distribution | **block until legal architecture decision** |
| model weights, datasets, icons, fonts and screenshots | often use non-software or usage-restricted terms | **block until asset-specific provenance and redistribution rights exist** |

## Why Valkey and no Grafana in the MVP baseline

The selection is not a claim that other software cannot be used commercially. It reduces avoidable licensing ambiguity in a public Apache-2.0 portfolio:

```text
Redis current multi-license complexity
  → Valkey BSD-3-Clause

Grafana AGPL default
  → Prometheus built-in query/UI + Jaeger for the first proof

Liquibase current FSL
  → exact Flyway Core/PostgreSQL modules or plain SQL migrations
```

The system may later evaluate an external managed/Grafana service, but that is a service-contract decision with a separate issue and legal review.

## Required machine-readable record

Every direct dependency or runtime image eventually appears in `manifests/stack.yaml` with:

```yaml
name: component-name
source: canonical-upstream-url
version: exact-version
commit_or_digest: immutable-identity
license_expression: SPDX-or-REVIEW_REQUIRED
policy_class: PERMISSIVE_BASELINE
usage: library | runtime | build | test | service
modified: false
redistributed: true | false
notice_required: true | false
license_observed_at: 2026-08-19
review_after: date-or-trigger
owner: issue-or-team
```

## CI gates

The root verification flow should eventually enforce:

1. lockfile and image digest freshness;
2. SBOM generation for Java, Node and containers;
3. direct/transitive license inventory;
4. allowlist match and unknown-license failure;
5. NOTICE/attribution bundle generation where required;
6. secret and provenance scan;
7. dependency vulnerability scan;
8. diff report when a version, license or source URL changes.

No automatic tool may waive a license mismatch. It may block and route the exact finding to a human owner.

## Update triggers

Re-run review when any of these change:

```text
version/tag/commit/image digest
upstream LICENSE or NOTICE
transitive dependency graph
use as library versus process/service
modification or redistribution model
public versus private deployment
hosted multi-tenant service behavior
AI/model/data/asset provenance
company legal policy
```

A source observed on `main` is navigation evidence. Final admission binds the exact release artifact used by the build.
