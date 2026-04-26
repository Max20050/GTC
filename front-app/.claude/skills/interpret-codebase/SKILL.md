---
name: interpret-codebase
description: >
  Use this skill when the user runs /interpret-codebase or asks to "read the codebase",
  "build the graph", "index the project", or "understand the repo". This skill makes the
  agent tour the entire codebase, understand it semantically, and write a structured
  knowledge graph to disk — producing a root node (level 1 map) and domain nodes
  (level 2 detail) that future agents can query cheaply instead of re-reading files.
  Trigger whenever the user wants to create or refresh the codebase knowledge graph.
---

# /interpret-codebase

Reads the codebase and writes a persistent knowledge graph to `.codebase-graph/`.
The graph has two levels: a root node (always loaded into context) and domain nodes
(fetched on demand per issue).

---

## Phase 1 — Orient

Before reading any files, get your bearings:

```bash
# List top-level structure
find . -maxdepth 2 -not -path '*/node_modules/*' -not -path '*/.git/*' \
       -not -path '*/__pycache__/*' -not -path '*/dist/*' -not -path '*/build/*'
```

Look for:
- Entry points (`index.*`, `main.*`, `app.*`, `server.*`, `worker.*`)
- Domain folders (`src/`, `lib/`, `modules/`, `services/`, `packages/`)
- Config files that reveal the stack (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`)
- Existing docs (`README.md`, `ARCHITECTURE.md`, `docs/`)

Read the README and any architecture docs first — they often summarize what you're about to discover.

---

## Phase 2 — Discover domains

Identify the major domains of the codebase. A domain is a self-contained area of
responsibility — not a folder, but a concept. Examples: `auth`, `payments`, `notifications`,
`data-pipeline`, `api-gateway`.

Look for natural boundaries:
- Folder names under `src/` or `lib/`
- Repeated prefixes in filenames
- Import clusters (files that import each other heavily are in the same domain)
- Named exports that other modules consume

Write down 3–8 domains. If the codebase is small, 2–3 is fine.

---

## Phase 3 — Read and understand

For each domain, read the key files. You don't need to read everything — focus on:

1. **The entry file** — usually `index.*` or the file named after the domain
2. **The main service or class** — where the core logic lives
3. **The model or schema** — what data shapes this domain owns
4. **Public exports** — what this domain exposes to others

For each file you read, answer:
- What does this file do in one sentence?
- What does it expose (functions, classes, endpoints, events)?
- What does it depend on (other domains, external services, libraries)?
- Any notes worth flagging (deprecated, critical path, known complexity)?

---

## Phase 4 — Write the graph

Create the graph directory and write two levels of nodes.

```bash
mkdir -p .codebase-graph/domains
```

### Root node (level 1)

Write `.codebase-graph/root.json`:

```json
{
  "summary": "One or two sentences. What does this app do? What stack?",
  "entry_points": ["src/index.ts", "src/jobs/worker.ts"],
  "domains": ["auth", "payments", "orders", "notifications"],
  "tech_stack": {
    "language": "TypeScript",
    "framework": "Express",
    "database": "Postgres + Redis",
    "external_services": ["Stripe", "SendGrid"]
  },
  "key_conventions": [
    "Services live in src/<domain>/service.ts",
    "DB queries go through src/db/queries/<domain>.ts",
    "All routes are registered in src/router.ts"
  ],
  "updated_at": "<ISO timestamp>"
}
```

**`summary`** — write this last, after you've read everything. It's what the dev agent
loads first to orient itself. Make it dense and honest.

**`key_conventions`** — the patterns a dev agent needs to know to write code that fits.
Where do files live? What's the naming convention? How are routes registered?

### Domain nodes (level 2)

For each domain, write `.codebase-graph/domains/<domain>.json`:

```json
{
  "name": "payments",
  "summary": "Handles Stripe integration. Exposes charge and refund. Webhooks handled here.",
  "files": {
    "entry": "src/payments/index.ts",
    "service": "src/payments/payments.service.ts",
    "model": "src/payments/payment.model.ts",
    "routes": "src/payments/payments.router.ts"
  },
  "exposes": ["charge(userId, amount)", "refund(paymentId)", "handleWebhook(event)"],
  "depends_on": ["auth", "orders", "stripe-sdk", "db"],
  "key_notes": [
    "Webhook signature verified with STRIPE_WEBHOOK_SECRET env var",
    "Refunds are async — status updated via webhook, not inline"
  ],
  "updated_at": "<ISO timestamp>"
}
```

**`key_notes`** — this is your semantic layer. Write things the next agent can't infer
from filenames alone. Gotchas, async flows, env dependencies, deprecated paths.

---

## Phase 5 — Write the root summary

Go back and write `root.json`'s `summary` field now that you've read everything.
It should answer: *"If another agent reads only this line before picking up an issue,
what do they absolutely need to know?"*

Example:
> "Node/Express e-commerce API. Auth via JWT (refresh tokens in Redis). Orders drive
> the payment flow — charge happens at order confirmation, refunds are async via Stripe
> webhooks. Postgres for persistence, BullMQ for background jobs."

---

## Phase 6 — Report

Tell the user:
- How many domains were found and named
- Any files or areas you skipped and why
- Anything surprising or worth flagging (circular deps, unclear ownership, missing tests)
- Where the graph was written

Example:
> "Graph written to `.codebase-graph/`. Found 5 domains: auth, payments, orders,
> notifications, admin. Skipped `src/legacy/` — looks unused, no imports pointing to it.
> Worth noting: payments and orders have a circular dependency through `OrderModel`."

---

## Output format

```
.codebase-graph/
├── root.json          ← level 1, always loaded
└── domains/
    ├── auth.json
    ├── payments.json
    ├── orders.json
    └── notifications.json
```

---

## Rules

- Write what you understand, not what you assume. If a file is unclear, say so in `key_notes`.
- Never hallucinate function names or file paths. Only write what you actually read.
- Keep `summary` fields under 3 sentences. Detail goes in `key_notes`.
- If the codebase has more than ~15 domains, group related ones (e.g., `billing` covers payments + invoices + subscriptions).
- Always write `updated_at` with the current ISO timestamp so the dev agent knows how fresh the graph is.