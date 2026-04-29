# #9 — build-agent: skill recommender + stack registry

**Created:** 2026-04-27 | **Updated:** 2026-04-27

## Parent

#4

## What to build

Implement skill_recommender.py and the STACK_REGISTRY in config.py, then wire the skills call into the build pipeline after plan generation.

skill_recommender accepts a MicroserviceContext and the stack slug, calls llm_client with the skills prompt (temperature 0.2), and parses the response into a list of SkillRecommendation (name, reason, docs_url).

STACK_REGISTRY is a plain dict in config.py with three entries at launch — python-fastapi, go-gin, node-express — each carrying preferred_libs, folder_convention, and prompt_template name.

If the skills call fails, the job completes with skills: [] and a warning in warnings[] rather than failing the whole job. The plan and prompt files are still returned.

Also deliver the skills.txt prompt template under app/prompts/.

## Acceptance criteria

- [ ] POST /build response now includes a non-empty skills[] list for supported stacks
- [ ] Each skill has name, reason, and docs_url fields
- [ ] STACK_REGISTRY has entries for python-fastapi, go-gin, and node-express
- [ ] If the skills call throws, the job lands in done (not failed) with skills: [] and a message in warnings[]
- [ ] GET /jobs/{job_id} step field shows recommending_skills while the skills call is in progress
- [ ] Unit tests cover: valid skills response parsing, failed LLM call returns empty skills + warning, unknown stack falls back gracefully

## Blocked by

- Blocked by #8
