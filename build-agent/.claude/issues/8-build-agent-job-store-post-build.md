# #8 — build-agent: job store + POST /build endpoint

**Created:** 2026-04-27 | **Updated:** 2026-04-27

## Parent

#4

## What to build

Wire the pipeline into a working async API. Implement job_store.py (in-memory dict with a clean interface designed for a future Redis swap), JWT auth middleware, and the two HTTP endpoints: POST /build and GET /jobs/{job_id}.

POST /build validates the JWT, spawns a background task that runs canvas_reader → plan_generator, updates job state at each step (pending → running with step label → done/failed), and immediately returns a job_id. GET /jobs/{job_id} returns the current job state including the full result when done.

At the end of this slice, the full plan pipeline is demoable end-to-end: submit a build job, poll for progress, receive a completed response with plan steps and prompt files.

## Acceptance criteria

- [ ] POST /build returns { job_id } immediately without waiting for LLM calls to complete
- [ ] GET /jobs/{job_id} returns pending, then running with step=generating_plan, then done with full result
- [ ] done response embeds the full BuildResponse (plan, prompts, assumptions, warnings) — no separate fetch needed
- [ ] Both endpoints reject requests with missing or invalid JWT with 401
- [ ] GET /health remains unauthenticated
- [ ] job_store exposes create, update, and get methods; the internal dict is not accessed directly from routes
- [ ] Unit tests cover job store state transitions: pending→running→done, pending→running→failed, unknown job ID

## Blocked by

- Blocked by #7
