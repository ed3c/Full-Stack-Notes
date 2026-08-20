# PR-5 Integrated Runtime

This harness assembles the four already-verified implementation nodes without changing their ownership boundaries:

- current branch base: PR #32 (`work-service`, transactional outbox, Kafka relay, audit consumer);
- pinned sibling PR #28 exact head: Node.js BFF;
- pinned sibling PR #29 exact head: React work queue;
- frozen PR-0 OpenAPI and event contracts.

The exact component SHAs live in `stack-lock.json`. `prepare-sources.sh` downloads immutable GitHub snapshots into `.runtime/pr5/sources/`; generated runtime material is not committed.

## One-command scenario

Prerequisites: Docker Compose, Java 21, Maven, Node.js 24, npm, Python 3, curl, and tar.

```bash
./infra/integration/runtime.sh run
```

The command performs these gates in order:

1. materialize pinned BFF/web sources;
2. reject frozen-contract or sibling-ownership drift;
3. build Java, Node, and React production artifacts;
4. start real PostgreSQL 18 and Apache Kafka 4.2.1;
5. start audit-consumer, work-service, and BFF processes;
6. drive the real React component through create -> claim -> complete using live HTTP;
7. verify PostgreSQL state, transactional outbox publication, Kafka provenance, audit projection, and request/trace correlation;
8. write machine-readable receipts under `.runtime/pr5/evidence/` and shut the topology down.

For interactive inspection:

```bash
./infra/integration/runtime.sh up
./infra/integration/runtime.sh verify
./infra/integration/runtime.sh logs
./infra/integration/runtime.sh down
```

## Determinism and cleanup

- Each `run` begins with `docker compose down -v`, so PostgreSQL and Kafka state start empty.
- The scenario uses a fixed title, mutation keys, and request IDs.
- Component source refs are full commit SHAs, not moving branches.
- Service logs remain under `.runtime/pr5/logs/` after cleanup.
- CI uploads receipts and logs as an artifact keyed by the PR head SHA.

## Evidence ceiling

A passing run proves one happy-path portfolio runtime through React component code, BFF, Java, PostgreSQL, Kafka, and the audit projection. The React step uses the repository's existing JSDOM component harness with real network calls; it is not browser/Web-Vitals evidence. Broker outage, restart recovery, load, latency, multi-broker durability, immutable image supply chain, production traffic, SLOs, and professional production ownership remain outside PR-5 and belong to #22/#27 or human evidence.
