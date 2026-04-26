---
name: query-graph
description: >
  Use this skill when the user runs /query-graph or when a dev agent needs to understand
  the codebase before implementing a GitHub issue, fixing a bug, or making a change.
  This skill loads the knowledge graph built by /interpret-codebase and uses it to find
  exactly which files and domains are relevant — without reading the whole codebase.
  Trigger whenever an agent needs codebase context for a specific task. Also trigger if
  the user asks "where does X live?", "what depends on Y?", or "which files should I read?"
---

# /query-graph

Reads the knowledge graph from `.codebase-graph/` to answer a specific question about
the codebase — returning targeted file pointers instead of requiring a full codebase scan.

---

## Step 1 — Check the graph exists

```bash
ls .codebase-graph/root.json 2>/dev/null && echo "exists" || echo "missing"
```

If missing, tell the user:
> "No graph found. Run `/interpret-codebase` first to build it."

If it exists but `updated_at` is more than a few days old, flag it:
> "Graph was built on `<date>`. If files have changed since then, consider re-running
> `/interpret-codebase` to refresh it."

---

## Step 2 — Load the root node

```bash
cat .codebase-graph/root.json
```

Read it fully. This is your map. Before doing anything else, answer internally:

- What does this app do?
- What are the domains?
- What conventions govern where code lives?

This step costs almost nothing and gives you the orientation a fresh agent would otherwise
spend many file reads acquiring.

---

## Step 3 — Match the task to domains

Given the issue or question, identify which domains are likely involved.

Look for signals in the task description:
- Feature keywords → match to domain names or summaries in the root
- Entity names (`Order`, `User`, `Invoice`) → match to domain models
- Endpoint paths (`/payments/refund`) → match to domain routes
- Error messages → often include file paths or service names directly

If unsure, load the root's `domains` list and eliminate by exclusion — which domains
definitely *don't* touch this task?

Usually 1–3 domains are relevant. If you're finding more than 3, the task is likely
larger than a single issue — flag this to the user.

---

## Step 4 — Load domain nodes

For each relevant domain:

```bash
cat .codebase-graph/domains/<domain>.json
```

From each domain node, extract:
- **`files`** — the exact paths to read
- **`depends_on`** — other domains this one touches (load those too if the task crosses a boundary)
- **`key_notes`** — read these carefully, they contain things you can't infer from filenames

Build a reading list: the minimum set of files needed to understand the task context.

---

## Step 5 — Read only the relevant files

Now read the files from your list. Not the whole codebase — just these.

For each file:
- Understand what it does in the context of the task
- Note any function signatures, types, or patterns you'll need to match
- Flag anything that contradicts your expectations (the graph might be stale)

If a file reveals new dependencies not in the graph, follow those too — but limit yourself
to one degree of expansion. If you're pulling in 6+ files you didn't expect, the graph
is probably stale. Note this and proceed with what you have.

---

## Step 6 — Return context

Summarize what you found for the next step (implementing the issue, writing tests, etc.):

```
Relevant domains: payments, orders

Files to work with:
- src/payments/payments.service.ts  — main logic, charge() and refund() live here
- src/payments/payment.model.ts     — PaymentStatus enum, Payment type
- src/orders/order.model.ts         — Order type, needed because charge() takes an Order

Key notes:
- Refunds are async — don't return success inline, update status via webhook handler
- STRIPE_WEBHOOK_SECRET must be set in env for webhook verification
- Follow the existing pattern in charge() when adding new payment methods

Conventions:
- New functions go in payments.service.ts, exported from payments/index.ts
- DB updates use src/db/queries/payments.ts, not direct ORM calls
```

This summary is what gets passed to the implementation step in the workflow. Keep it
concrete — file paths, function names, patterns to follow.

---

## Edge cases

**Task doesn't match any domain clearly**
Read domain summaries one by one until you find the closest match. If genuinely unclear,
read the entry points listed in `root.json` and trace from there.

**Graph is stale (file not found, import missing)**
Note it, read the actual file to get current state, continue. After the task is done,
suggest the user re-run `/interpret-codebase` to refresh.

**Task is cross-cutting (touches 4+ domains)**
Flag it before loading everything:
> "This looks like it touches auth, payments, orders, and notifications — that's a larger
> change than a typical issue. Want me to map out the full impact before we start?"

**No graph at all**
Don't try to substitute by reading the whole codebase. Tell the user to run
`/interpret-codebase` first. The whole point of this skill is targeted reads.

---

## Rules

- Never read files not in your list unless a dependency forces it.
- Never guess at file paths — only use what the graph gives you.
- If the graph is stale, say so. Don't silently work around it.
- The output of this skill is a reading list + context summary, not an implementation.
  Hand off to the implementation step once context is assembled.