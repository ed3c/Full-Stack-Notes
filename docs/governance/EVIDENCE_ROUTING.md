# Evidence Routing — GitHub, Google Sheets, Google Docs and Existing Repositories

## Decision

`ed3c/Full-Stack-Notes` is the **role-specific routing and evidence authority**. It is not the owner of every reusable method, runtime configuration, learning note, or portfolio presentation.

```text
GitHub repository state     canonical
Google Sheets dashboard     projection
Google Docs case study      presentation/export
portfolio website           public projection
private repositories        restricted evidence source
```

No projection may promote, reinterpret, or overwrite the canonical evidence state.

## Why GitHub is the center

The hiring claim depends on objects that GitHub can bind to exact subjects:

- requirements and source snapshots;
- code, API/event schemas and migrations;
- issues, pull requests, reviews and changed paths;
- CI checks and artifacts;
- release/deployment metadata;
- runbooks, postmortems and receipts;
- immutable commit/image/environment identities;
- public/private disclosure boundaries.

A spreadsheet row or document paragraph cannot replace those relationships.

## Canonical object model

```text
Source
  └─ source_id + observed_at + license/authority class
       ↓
Requirement
  └─ FS-* stable ID + applicability + owner + controls
       ↓
Decision
  └─ ADR + alternatives + consequences
       ↓
Work item
  └─ GitHub issue + DAG relation + path/resource lease
       ↓
Candidate
  └─ draft PR + exact base/head + AI/manual provenance
       ↓
Deterministic evidence
  └─ check/test/schema/mutation/security result
       ↓
Runtime evidence
  └─ deployment/load/fault/incident receipt
       ↓
Human admission
  └─ approved claim class + portfolio/interview projection
```

The stable IDs survive document moves and UI changes. URLs are navigation, not identity.

## Google Sheets role

Use one role-specific sheet or tab named `Full Stack Seed Evidence`. It should be generated or reconciled from GitHub, not manually treated as authoritative.

Recommended columns:

```text
requirement_id
capability
priority
canonical_state
evidence_ceiling
owner
issue_url
pr_url
head_commit
ci_url
runtime_receipt_url
postmortem_url
interview_claim_class
last_reconciled_at
stale
notes_projection_only
```

### Allowed Sheet operations

- sort/filter capability gaps;
- create a weekly execution view;
- calculate coverage by evidence state;
- identify stale links and missing owners;
- show study/interview cadence;
- link directly back to GitHub issue, PR, receipt or document.

### Forbidden Sheet operations

- mark `LIVE_CLOSED` without a canonical runtime receipt;
- enter a performance number without the exact benchmark subject;
- close a requirement because a checkbox is checked;
- contain secrets, private repository paths, customer names or inaccessible evidence URLs;
- become the only location of an architecture decision, incident finding or prompt contract.

### Reconciliation rule

```text
GitHub change
→ projection job/manual reconciliation reads canonical state
→ Sheet row updates
→ stale flag clears with timestamp

Sheet manual edit to status
→ does not update GitHub
→ next reconciliation overwrites or flags disagreement
```

## Google Docs role

A Google Doc is useful for a recruiter-friendly case study or interview pre-read, but only as a generated/curated view.

Recommended sections:

```text
role and product problem
one-page architecture
critical trade-offs
one end-to-end feature
one failure/recovery story
one AI-generated defect caught and corrected
measured result with evidence links
truthful limitations and next decision
```

Every material claim links to its GitHub evidence. The Doc header records:

```text
source_repository
source_commit
exported_at
claim_classes_included
known_stale_after
```

Do not edit unique requirements, current status, metrics, or architecture truth only in the Doc. When the case study changes, update GitHub first and re-export.

## Existing repository routing

### `ed3c/skills-shared`

Authority:

- reusable Tech Lead orchestration;
- independent procedural Shadow review;
- proof-carrying refactor and evaluation methods;
- Git Town stacked-PR relationship vocabulary.

Consumption rule:

- pin a commit SHA in `manifests/sources.yaml`;
- keep only a thin repository-local binding here;
- never write Delivery Pulse queue, branch, receipt, credential or live state back into a shared `SKILL.md`.

### `ed3c/runtime-env`

Authority:

- secret-free variable names and requirement semantics;
- safe profiles and fixed workload contracts;
- local/runtime carrier policies and deterministic validation.

Consumption rule:

- pin an exact source commit/tree;
- project safe names only;
- credentials remain in GitHub environments, OS keychain, or cloud secret store;
- a resolved profile is not evidence that a workload ran.

### `ed3c/agent-architect-notes`

Authority:

- personal learning plan, interview knowledge and existing dashboard cadence.

Consumption rule:

- link reusable learning notes rather than copy them;
- do not use learning completion as Delivery Pulse implementation evidence;
- a role-specific Sheet tab may share the dashboard, but GitHub requirements remain canonical.

### `ed3c/website-design-compiler`

Authority:

- reference-to-original web design method and front-end design/performance experiments.

Consumption rule:

- import only admitted design decisions or public references;
- no runtime dependency;
- its bootstrap or future success cannot close Delivery Pulse frontend requirements automatically.

### `ed3c/skill-resume-site`

Authority:

- public résumé/portfolio projection and disclosure policy.

Consumption rule:

- publish a Delivery Pulse card only after its claim class and evidence URLs are admitted;
- display current limitations;
- no invented users, traffic, uptime, organizational impact or production status.

### Other public repositories

A public repository may provide reusable evidence only when:

```text
capability is applicable
source commit is pinned
evidence is accessible to the reviewer
owner and scope are explicit
consumer integration is tested
no source repository claim is promoted beyond its evidence ceiling
```

### Private repositories

Private work can support a confidential interview discussion, but public routing uses:

```text
private_evidence_id
capability_summary
claim_class
reviewer_access = NONE | ON_REQUEST | AUTHORIZED
sanitized_receipt_hash
public_limitation
```

Never publish an inaccessible private URL as if it were public proof. Do not disclose company/client names, proprietary architecture, paid-library inventory, credentials, identifiers or production data.

## Source classes

| Class | Meaning | Can define requirement? | Can prove runtime? |
|---|---|---:|---:|
| `JOB_DESCRIPTION` | hiring expectation supplied by employer | yes, after applicability review | no |
| `OFFICIAL_DOC` | current upstream documentation/specification | yes for named component/version | no |
| `UPSTREAM_REPO` | source/license/release evidence | yes for pinned subject | no consumer runtime proof |
| `ARTICLE` | explanatory proposal/opinion | candidate only | no |
| `PDF` | supplied architecture/research artifact | candidate only | no |
| `USER_REPO` | existing implementation/evidence | only after exact readback | only for its exact subject/environment |
| `ISSUE_PR` | work and review state | yes for scoped contract | only when linked receipt actually ran |
| `RUNTIME_RECEIPT` | exact live execution result | no new requirement | yes for declared lane only |

## Link policy

A canonical evidence link should be as specific as possible:

```text
preferred:
  commit-bound file and line
  PR with exact head SHA
  workflow run tied to head SHA
  release/image digest
  receipt file tied to environment and time

avoid as authority:
  repository homepage
  mutable main branch
  issue title without acceptance criteria
  latest documentation without observed date
  spreadsheet cell
  Google Doc paragraph
```

## Staleness and freshness

Every external source record has:

```text
source_id
url
source_type
observed_at
pinned_version_or_commit
license_expression
freshness_policy
next_review_at
supersedes
```

Suggested review cadence:

- runtime and framework releases: monthly or on security alert;
- dependency licenses: every lockfile/SBOM change;
- job requirement matrix: at each application or interview stage;
- architecture and SLO: each admitted release;
- Google Sheet projection: at least weekly during active work;
- Google Doc/portfolio projection: regenerate after every claim-state change.

## Public claim route

```text
exact evidence closes requirement
→ Shadow checks evidence ceiling and contradictions
→ human selects claim class
→ Full-Stack-Notes records admitted wording
→ Google Sheet projects state
→ Google Doc and skill-resume-site render admitted wording
```

Reverse promotion is forbidden. Editing a portfolio card or recruiter Doc cannot close a GitHub requirement.

## Recommended URLs to maintain

The repository should eventually expose these links from its root README:

```text
GitHub canonical repository
GitHub project/issue board
live MVP environment
public uptime/status page if operated
role-specific Google Sheet dashboard
exported Google Doc case study
skill-resume-site Delivery Pulse section
```

Only the GitHub repository is required at bootstrap. Live, Sheet, Doc and portfolio URLs remain `ABSENT` until they exist and follow this contract.
