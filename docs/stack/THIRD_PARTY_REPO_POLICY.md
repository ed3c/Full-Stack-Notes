# Third-Party Repository and License Policy

Goal: prefer components that are commercially usable without source-disclosure obligations on this repository, while still checking the exact version and transitive dependency graph before release.

This file is an engineering governance record, not legal advice.

## Preferred permissive baseline

| Component / upstream repo | Intended use | Top-level license observed | Commercial-use posture | Gate |
|---|---|---|---|---|
| `spring-projects/spring-boot` | Java application framework | Apache-2.0 | Preferred | verify pinned artifact + notices |
| `nodejs/node` | Node runtime | MIT for Node core; bundled third-party notices also apply | Preferred with notice review | retain upstream notices in distributed runtime/image |
| `facebook/react` | UI library | MIT | Preferred | verify package metadata |
| `fastify/fastify` | Node BFF framework | MIT | Preferred | verify package metadata |
| `apache/kafka` | message broker/client ecosystem | Apache-2.0 | Preferred | verify image/binary NOTICE contents |
| PostgreSQL | relational database | PostgreSQL License (permissive/BSD-like) | Preferred | preserve notices where required |
| `open-telemetry/opentelemetry-java` and related OTel projects | telemetry instrumentation | Apache-2.0 | Preferred | verify exact language packages |
| `testcontainers/testcontainers-java` | integration-test infrastructure | MIT | Preferred | test-only unless explicitly promoted |
| `microsoft/playwright` | browser E2E | Apache-2.0 | Preferred | browser binaries have their own terms/notices |
| `prometheus/prometheus` | metrics | Apache-2.0 | Preferred | runtime/tooling deployment only |
| `jaegertracing/jaeger` | tracing backend | Apache-2.0 | Preferred | runtime/tooling deployment only |
| `aquasecurity/trivy` | vulnerability/license scanning | Apache-2.0 | Preferred | CI/tooling use |

## Dependency admission checklist

Before merging a new dependency:

1. Record upstream repository and exact package/artifact coordinates.
2. Record the exact version selected.
3. Read the upstream `LICENSE` and `NOTICE` files for that version/tag when available.
4. Inspect transitive dependencies from the real lockfile/SBOM, not only the top-level project license.
5. Flag GPL/AGPL/SSPL/source-available/field-of-use/custom commercial terms for explicit review before distribution or service deployment.
6. Record whether the dependency is linked/embedded, build-only, test-only, CLI tooling, container runtime, or external service.
7. Record replacement cost and an alternative.
8. Run automated license scanning; review `UNKNOWN` classifications manually.
9. Keep required attribution/NOTICE material in release artifacts.
10. Re-run the gate on major-version or license changes.

## License risk states

- `PERMISSIVE_BASELINE`: MIT/BSD/PostgreSQL/Apache-style top-level license with no known reciprocal requirement for the planned use.
- `NOTICE_REQUIRED`: permissive, but redistribution/NOTICE obligations must be carried through.
- `REVIEW_REQUIRED`: reciprocal, source-available, dual-license, unusual additional terms, uncertain transitive license, or unknown scanner result.
- `BLOCKED_FOR_MVP`: cannot establish a commercially acceptable use path without extra legal/product constraints.

`REVIEW_REQUIRED` does not automatically mean unusable. It means an agent must not silently decide that licensing is safe.

## Commercial tooling

Cursor, GitHub Copilot, Claude Code, cloud services, and desktop/container products may be proprietary commercial tools rather than repository dependencies. Track them separately with:

- account/plan terms;
- data retention/training settings;
- organization policy;
- source-code and secret handling;
- model/provider routing;
- auditability/export capability;
- cost limits.

Do not infer that an open-source client makes a hosted service commercially unrestricted.

## AI-generated code provenance

For material AI-assisted changes, PR evidence should record:

- tool/model family when disclosure is allowed;
- requested scope and constraints;
- human-reviewed diff boundaries;
- tests/security/license checks run;
- generated code or dependency suggestions that were rejected and why.

The engineering claim to prove is not "AI wrote the code". It is "the engineer constrained, reviewed, tested, and safely integrated accelerated output."

## Sources checked for the baseline

- Spring Boot repository license: https://github.com/spring-projects/spring-boot
- Node.js license: https://github.com/nodejs/node/blob/main/LICENSE
- React repository license: https://github.com/facebook/react
- Fastify license: https://github.com/fastify/fastify/blob/main/LICENSE
- Kafka license: https://github.com/apache/kafka/blob/trunk/LICENSE
- PostgreSQL license: https://www.postgresql.org/about/licence/
- OpenTelemetry Java license: https://github.com/open-telemetry/opentelemetry-java/blob/main/LICENSE
- Testcontainers Java: https://github.com/testcontainers/testcontainers-java
- Playwright: https://github.com/microsoft/playwright
- Prometheus: https://github.com/prometheus/prometheus
- Jaeger: https://github.com/jaegertracing/jaeger
- Trivy: https://github.com/aquasecurity/trivy/blob/main/LICENSE
