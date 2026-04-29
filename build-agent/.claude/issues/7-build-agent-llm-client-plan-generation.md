# #7 — build-agent: LLM client + plan generation

**Created:** 2026-04-27 | **Updated:** 2026-04-27

## Parent

#4

## What to build

Implement llm_client.py and plan_generator.py. llm_client is a thin LiteLLM wrapper that accepts a prompt, system prompt, and temperature — provider and model are resolved from environment variables (LLM_MODEL, ANTHROPIC_API_KEY, GEMINI_API_KEY) at startup with no business logic of its own.

plan_generator accepts a MicroserviceContext and detail_level, calls llm_client with the plan prompt, and parses the structured JSON response into a PlanResult containing plan steps and numbered prompt files. This is the heavy reasoning call (temperature 0.3). Prompt files are LLM-generated with four sections: Goal, Context, Instructions, Constraints.

detail_level controls verbosity: minimal = 3 steps + 2 prompt files, standard = 5 steps + 3-4 files, full = unlimited steps + 5-7 files + assumptions[] array.

Also deliver the system.txt and plan.txt prompt templates under app/prompts/.

## Acceptance criteria

- [ ] llm_client.complete() calls LiteLLM with the configured model and returns the response string
- [ ] Provider and model are read from environment variables with no hardcoded defaults
- [ ] plan_generator returns a PlanResult with steps (order, title, description) and prompts (filename, content)
- [ ] detail_level minimal/standard/full produces the correct step count and prompt file count
- [ ] full detail_level response includes a non-empty assumptions[] array when the LLM flags inferred decisions
- [ ] Unparseable LLM response raises a descriptive error
- [ ] Unit tests use a mocked llm_client and cover: valid response parsing, bad response error, each detail_level variant

## Blocked by

- Blocked by #6
