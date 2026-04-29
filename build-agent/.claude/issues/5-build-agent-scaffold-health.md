# #5 — build-agent: project scaffold + /health endpoint

**Created:** 2026-04-27 | **Updated:** 2026-04-27

## Parent

#4

## What to build

Bootstrap the build-agent Python service so it can be built, run, and probed. This is the foundation every other slice builds on. Deliver a bare FastAPI app with a single unauthenticated GET /health endpoint, a pyproject.toml with all top-level dependencies declared, a Dockerfile, and a docker-compose.yml for local development.

## Acceptance criteria

- [ ] GET /health returns { "status": "ok" } with no auth required
- [ ] pyproject.toml declares dependencies: fastapi, uvicorn, litellm, pydantic, pydantic-settings, python-jose
- [ ] Dockerfile builds and runs the service
- [ ] docker-compose.yml starts the service locally
- [ ] App reads config (port, env) from environment variables via pydantic-settings

## Blocked by

None - can start immediately
