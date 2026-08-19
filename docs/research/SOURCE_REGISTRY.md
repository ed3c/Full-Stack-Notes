# Source Registry

External sources inform decisions; they do not substitute for executable evidence. Register sources here before treating them as support for an ADR, technology decision, issue, or interview claim.

## Source classes

- `OFFICIAL_DOC`: authoritative product/runtime/framework documentation.
- `UPSTREAM_REPO`: source repository and license material.
- `ARTICLE`: explanatory or opinionated engineering article.
- `PDF`: paper/report/specification distributed as PDF.
- `BENCHMARK`: reproducible or reported performance/evaluation source.

## Current foundation sources

| ID | Type | Source | Used for | Evidence role |
|---|---|---|---|---|
| SRC-001 | OFFICIAL_DOC | https://docs.spring.io/spring-boot/index.html | Spring Boot stable baseline | decision support only |
| SRC-002 | OFFICIAL_DOC | https://docs.spring.io/spring-boot/system-requirements.html | Java compatibility baseline | decision support only |
| SRC-003 | OFFICIAL_DOC | https://nodejs.org/en/about/previous-releases | Node.js LTS selection | decision support only |
| SRC-004 | OFFICIAL_DOC | https://react.dev/versions | React version selection | decision support only |
| SRC-005 | OFFICIAL_DOC | https://www.postgresql.org/about/press/presskit18/base/ | PostgreSQL 18 baseline | decision support only |
| SRC-006 | OFFICIAL_DOC | https://www.postgresql.org/about/licence/ | PostgreSQL license | license decision support |
| SRC-007 | OFFICIAL_DOC | https://kafka.apache.org/community/downloads/ | Kafka supported release baseline | decision support only |
| SRC-008 | UPSTREAM_REPO | https://github.com/spring-projects/spring-boot | Spring Boot upstream/license | dependency review input |
| SRC-009 | UPSTREAM_REPO | https://github.com/nodejs/node | Node runtime upstream/license | dependency/runtime review input |
| SRC-010 | UPSTREAM_REPO | https://github.com/facebook/react | React upstream/license | dependency review input |
| SRC-011 | UPSTREAM_REPO | https://github.com/fastify/fastify | Fastify upstream/license | dependency review input |
| SRC-012 | UPSTREAM_REPO | https://github.com/apache/kafka | Kafka upstream/license | dependency/runtime review input |
| SRC-013 | UPSTREAM_REPO | https://github.com/open-telemetry/opentelemetry-java | OpenTelemetry Java upstream/license | observability review input |
| SRC-014 | UPSTREAM_REPO | https://github.com/testcontainers/testcontainers-java | Testcontainers upstream/license | test-tool review input |
| SRC-015 | UPSTREAM_REPO | https://github.com/microsoft/playwright | Playwright upstream/license | browser-test review input |
| SRC-016 | UPSTREAM_REPO | https://github.com/prometheus/prometheus | Prometheus upstream/license | observability runtime review input |
| SRC-017 | UPSTREAM_REPO | https://github.com/jaegertracing/jaeger | Jaeger upstream/license | tracing runtime review input |
| SRC-018 | UPSTREAM_REPO | https://github.com/aquasecurity/trivy | Trivy upstream/license | security/license tooling review input |

## Article/PDF intake record

When an article or PDF is supplied later, add a row plus a record with this shape:

```yaml
source_id: SRC-NNN
type: ARTICLE | PDF
url_or_repo_path: "stable URL/path"
title: "source title"
author_or_org: "publisher"
claim_used: "exact architecture/engineering claim being evaluated"
linked_requirement_ids: [FS-XX]
linked_failure_ids: [F-XX]
linked_adr_or_issue: "ADR/issue URL or path"
license_or_usage_notes: "when code/assets are reused"
closure_test: "what executable evidence would show our system actually addresses the source's problem"
status: REGISTERED | EVALUATED | SUPERSEDED
```

## Closure invariant

The chain is:

`source claim -> requirement/failure ID -> ADR/contract -> implementation PR -> executable test/failure drill -> runtime artifact -> review admission`

A source is not marked "closed" merely because its recommendation appears in Markdown. The referenced system behavior must be executable and falsifiable.
