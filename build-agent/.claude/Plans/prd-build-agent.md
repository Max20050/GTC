## Problem Statement

As a developer using the Graph-to-Code canvas, I design microservice architectures visually — but turning a canvas node into working code requires manually translating node config, endpoints, data contracts, and architectural connections into an implementation plan. This process is slow, inconsistent, and requires deep knowledge of the target stack. There is no automated path from "I drew this service" to "here is what to build and how to build it."

## Solution

A dedicated Python microservice (build-agent) that accepts a microservice node and its canvas context, reasons about what needs to be built using an LLM, and returns three structured artifacts: a step-by-step implementation plan, a ranked list of recommended libraries and tools for the target stack, and a set of numbered Claude Code prompt files that can be fed sequentially into an AI coding assistant to scaffold the service. The frontend replaces its current prototype generate hook with a polling-based integration that shows live progress and surfaces the artifacts in the UI.

## User Stories

1. As a developer, I want to click a "Build" button on a canvas microservice node and receive a structured implementation plan, so that I know exactly what to build without having to reason about it from scratch.
2. As a developer, I want the build job to run asynchronously and show me live progress steps, so that I am not staring at a spinner with no feedback for 15-30 seconds.
3. As a developer, I want to see which step the agent is on ("Generating plan...", "Recommending skills..."), so that I know the job is progressing and roughly how long it will take.
4. As a developer, I want the implementation plan to include ordered steps with titles and descriptions, so that I can understand the build sequence at a glance.
5. As a developer, I want the plan to explicitly flag inferred decisions as [ASSUMED], so that I can review and correct assumptions before starting implementation.
6. As a developer, I want a ranked list of recommended libraries and tools for my stack, so that I do not have to research the ecosystem before writing my first line of code.
7. As a developer, I want numbered Claude Code prompt files as output, so that I can feed them one-by-one into an AI coding assistant and scaffold the service incrementally.
8. As a developer, I want the number and depth of prompt files to reflect the detail level I chose, so that I can get a quick scaffold or a thorough one depending on my needs.
9. As a developer, I want the agent to infer my stack from the language field I set in the node inspector, so that I do not have to specify it again in the build options.
10. As a developer, I want to choose between minimal, standard, and full detail levels, so that I can control how much output the agent generates.
11. As a developer, I want the full canvas context (connected services, protocols, data contracts, endpoints) to be used when generating the plan, so that the output reflects the real architecture and not just the target node in isolation.
12. As a developer, I want to see partial results if the skills call fails, so that I still get the implementation plan and prompt files even when one step of the pipeline errors.
13. As a developer, I want a retry button when the skills recommendation fails, so that I can re-trigger the full pipeline without having to reconfigure anything.
14. As a developer, I want the build endpoint to require authentication, so that only users logged into the platform can trigger LLM calls and I am not exposed to cost abuse.
15. As a developer, I want the LLM provider to be configurable via environment variables, so that the team can switch between Anthropic Claude and Google Gemini without a code change.
16. As a developer building on the platform, I want a /health endpoint that requires no auth, so that container orchestration and load balancers can probe the service without credentials.
17. As a platform operator, I want the stack registry to be a plain config dict, so that I can add new stacks (e.g. node-express, go-gin) without touching service logic.
18. As a platform operator, I want the in-memory job store to have a clean interface, so that I can swap it for a Redis-backed store later without changing any call sites.
19. As a developer, I want the assumptions array in the full detail level response, so that I have a single place to review every decision the LLM made on my behalf.
20. As a developer, I want warnings surfaced in the response envelope rather than swallowed, so that I always know when the output is partial and why.

## Implementation Decisions

### Modules Built

**build-agent (new Python service)**
- `canvas_reader` - pure normalization function. Accepts the raw canvas payload and target node ID, extracts the target node, derives its connections from edges (direction, peer label, peer type, protocol), infers the stack from the node's language config field, and returns a clean MicroserviceContext struct. No I/O. All downstream services consume this context, never the raw canvas.
- `llm_client` - thin wrapper around LiteLLM's completion() call. Accepts a prompt, system prompt, and temperature. Provider and model are resolved from environment variables at startup. No business logic lives here.
- `plan_generator` - accepts a MicroserviceContext and detail level, calls llm_client with the plan prompt, and parses the structured JSON response into a PlanResult (steps + prompt files). This is the heavy reasoning call.
- `skill_recommender` - accepts a MicroserviceContext, the plan result, and the stack, calls llm_client with the skills prompt, and parses the response into a SkillResult. Independent of the plan call internals.
- `job_store` - in-memory dict keyed by UUID. Exposes create, update, and get methods. State machine: pending → running → done / failed. Designed so the dict can be replaced with a Redis client without changing method signatures.
- `main` - FastAPI app. Three routes: POST /build (spawn background task, return job ID), GET /jobs/{job_id} (return current job state), GET /health (no auth).
- `config` - pydantic-settings Settings class for env vars, plus STACK_REGISTRY dict with entries for python-fastapi, go-gin, and node-express. Each entry carries preferred libs, folder convention string, and prompt template name.
- Pydantic models for BuildRequest, Canvas, MicroserviceContext, JobState, BuildResponse, PlanStep, SkillRecommendation, PromptFile.

**front-app (modified)**
- `useBuildAgent` hook - replaces `useGenerateDocs`. Posts to /build with target_node_id and full canvas payload. Polls GET /jobs/{job_id} every 2 seconds. Exposes { status, step, result, error } to the UI.
- Generate UI - updated to show step label during running state, render plan steps and prompt files on completion, and surface a retry button when warnings is non-empty.

### API Contract

**POST /build**
- Auth: Bearer JWT
- Body: { target_node_id, canvas: { nodes, edges }, options: { detail_level: "minimal" | "standard" | "full" } }
- Response: { job_id }

**GET /jobs/{job_id}**
- Auth: Bearer JWT
- Response (running): { job_id, status: "running", step: "generating_plan" | "recommending_skills" }
- Response (done): { job_id, status: "done", result: { plan, skills, prompts, assumptions, warnings } }
- Response (failed): { job_id, status: "failed", error: string }

**GET /health**
- No auth. Response: { status: "ok" }

### LLM Call Strategy

Two sequential calls per job:
1. Plan call (temperature 0.3) - receives MicroserviceContext summary and detail level. Returns structured JSON with plan steps and numbered prompt files. Prompt files have four sections: Goal, Context, Instructions, Constraints.
2. Skills call (temperature 0.2) - receives MicroserviceContext and stack. Returns a ranked list of libraries with name, reason, and docs URL.

If the plan call fails, the job fails. If the skills call fails, the job completes with skills: [] and a warning in warnings[].

### detail_level Behaviour

- minimal - 3 plan steps (1 sentence each), 2 prompt files (scaffold + routes), no assumption surfacing.
- standard - 5 plan steps, 3-4 prompt files, assumptions flagged inline as [ASSUMED].
- full - unlimited plan steps with full descriptions, 5-7 prompt files, dedicated assumptions[] array in the response.

### Auth Strategy

JWT verified locally on every request (except /health) using the shared RSA public key from the users-auth service. No network call to users-auth per request. user_id extracted from token claims for logging.

### Stack Inference

Stack inferred from node.config.language: Go → go-gin, Python → python-fastapi, JavaScript/Node → node-express. The options.stack field overrides inference. If neither is present, the LLM infers a reasonable stack and marks it [ASSUMED].

## Testing Decisions

**What makes a good test:** tests verify observable outputs given inputs. They do not assert on internal calls, intermediate state, or implementation details.

**Modules to test:**

- `canvas_reader` - unit tests. Pure function, no I/O. Test cases: node with full config, node with missing language field, node with no edges, node with inbound and outbound edges, target_node_id not found in canvas.
- `job_store` - unit tests. State machine transitions: pending → running → done, pending → running → failed, getting a non-existent job ID.
- `plan_generator` - unit tests with mocked llm_client. Valid LLM response parses into PlanResult correctly, unparseable response raises correct error, detail_level controls prompt instruction.
- `skill_recommender` - unit tests with mocked llm_client. Valid response parses correctly, bad response raises, empty skills list handled gracefully.

**Prior art:** The front-app has existing tests (useDiagram.test.ts, ConnectorDetail.test.tsx) that test observable state changes - the same philosophy applies here.

## Out of Scope

- Redis-backed or persistent job store
- Streaming LLM responses to the frontend
- Targeted retry endpoint for the skills call only (retry re-runs the full pipeline)
- Task-namespaced API routes (e.g. /tasks/build)
- Service-to-service calls to canvas-service (canvas data passed inline by the caller)
- Support for stacks beyond python-fastapi, go-gin, and node-express at launch
- Rate limiting or per-user LLM cost controls
- Webhook callbacks when a job completes
- Multi-node batch generation (one target node per job)

## Further Notes

- The build-agent is intended to grow into a general-purpose agent service. The flat API structure and generic JobStore are intentional.
- LiteLLM handles provider differences so adding a new provider is a one-line env var change.
- The in-memory JobStore loses in-flight jobs on restart. Acceptable for v1 - jobs are short-lived and the user can retry.
- Prompt files are LLM-generated (not Jinja2 templates) so their content is specific to the actual microservice schema. This is the core quality differentiator.
