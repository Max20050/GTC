build-agent — Service Design Plan
What it does
A Python microservice that reads a microservice definition (from canvas or DB), calls an LLM internally to reason about it, and returns a structured build artifact: an implementation plan, skill recommendations, and Claude (or any other LLM ) Code prompt files — all in one synchronous API response.

Architecture Overview
Caller Service
     │
     ▼
POST /build
     │
     ▼
┌─────────────────────────────────────┐
│           build-agent               │
│                                     │
│  1. Fetch microservice from DB/API  │
│  2. Normalize + enrich the schema   │
│  3. Call Claude API (plan + skills) │
│  4. Render output artifacts         │
│  5. Return structured response      │
└─────────────────────────────────────┘

API Contract
Request
httpPOST /build
Content-Type: application/json

{
  "microservice_id": "uuid",
  "canvas_id": "uuid",           // optional, for context
  "options": {
    "stack": "python-fastapi",   // or node-express, go-gin, etc.
    "detail_level": "full"       // minimal | standard | full
  }
}
Response
json{
  "microservice_id": "uuid",
  "plan": {
    "markdown": "# Implementation Plan\n...",
    "steps": [ { "order": 1, "title": "...", "description": "..." } ]
  },
  "skills": [
    { "name": "auth-jwt", "reason": "...", "docs_url": "..." }
  ],
  "prompts": [
    {
      "filename": "01_scaffold.md",
      "target": "claude-code",
      "content": "..."
    }
  ]
}

Project Structure
build-agent/
├── app/
│   ├── main.py                  # FastAPI app, /build endpoint
│   ├── models/
│   │   ├── request.py           # BuildRequest schema
│   │   ├── response.py          # BuildResponse schema
│   │   └── canvas.py            # Microservice/Canvas schema
│   ├── services/
│   │   ├── canvas_reader.py     # Fetches + normalizes from DB/API
│   │   ├── claude_client.py     # Anthropic API wrapper
│   │   ├── plan_generator.py    # Builds implementation plan
│   │   ├── skill_recommender.py # Recommends skills by stack
│   │   └── prompt_builder.py    # Assembles Claude Code prompts
│   ├── prompts/
│   │   ├── system.txt           # Base system prompt for Claude
│   │   ├── plan.txt             # Plan generation prompt template
│   │   └── skills.txt           # Skill recommendation prompt template
│   └── config.py                # Settings (env vars, stack registry)
├── tests/
├── Dockerfile
├── docker-compose.yml
└── pyproject.toml

Core Logic: The Build Pipeline
Step 1 — Fetch & Normalize (canvas_reader.py)
Reads the microservice from the DB/API. Since detail can be sparse or rich, this layer fills gaps with sensible defaults so downstream steps always get a consistent schema. Fields like routes, ports, containers, envs are all optional but typed.
Step 2 — Generate Plan (plan_generator.py + Claude)
Sends the normalized schema to Claude with a structured prompt. Claude reasons about what needs to be built and returns a step-by-step implementation plan. If little detail was provided, Claude infers reasonable defaults and flags assumptions explicitly in the plan.
Step 3 — Recommend Skills (skill_recommender.py + Claude)
A second focused Claude call with the stack and plan as context. Returns a ranked list of libraries, patterns, or tools relevant to the microservice — e.g. for python-fastapi: sqlalchemy, alembic, pydantic-settings, httpx, pytest-asyncio.
Step 4 — Build Prompts (prompt_builder.py)
Assembles numbered .md prompt files designed to be fed sequentially into Claude Code. Each file maps to a plan step: scaffold, models, routes, tests, Dockerfile, etc. These are opinionated and stack-specific.

Claude API Strategy
Two sequential calls, not one, to keep concerns clean:
CallPurposeTemperatureplan_callImplementation plan + assumptions0.3skills_callSkill/library recommendations0.2
Both use a shared system prompt that includes: the stack, the canvas schema, and explicit instructions to flag missing info rather than silently hallucinate it.

Key Design Decisions
Sparse input handling — When a microservice has only a name and description, Claude is prompted to make reasonable inferences and mark them as [ASSUMED] in the plan. The caller can then ask the user to confirm before proceeding.
Opinionated stacks — A STACK_REGISTRY dict in config.py maps stack slugs to preferred libraries, folder conventions, and prompt templates. New stacks are added there, not scattered in code.
Prompt files as first-class output — The .md prompt files are numbered and self-contained. A human or automation can feed them one by one to Claude Code without knowing anything about the original canvas.
Docker/K8s ready — Single Dockerfile, env-based config via pydantic-settings, health check at GET /health, no local state.

What to build first

canvas_reader.py with a mock DB client — unblocks everything else
claude_client.py with the two-call structure
plan_generator.py + prompt templates
The /build endpoint wiring it all together
skill_recommender.py + stack registry
prompt_builder.py for Claude Code output files