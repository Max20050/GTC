import json
from unittest.mock import patch

import pytest

from app.models.canvas import MicroserviceContext
from app.services.plan_generator import generate_plan

MODULE = "app.services.plan_generator.llm_client"


def _ctx(**kwargs) -> MicroserviceContext:
    defaults = dict(label="Orders", type="microservice", stack="python-fastapi",
                    endpoints=[], contracts=[], config={}, connections=[])
    return MicroserviceContext(**(defaults | kwargs))


def _make_response(steps: list[dict], prompts: list[dict], assumptions: list[str] | None = None) -> str:
    payload: dict = {"steps": steps, "prompts": prompts}
    if assumptions is not None:
        payload["assumptions"] = assumptions
    return json.dumps(payload)


def _step(order: int) -> dict:
    return {"order": order, "title": f"Step {order}", "description": f"Do step {order}."}


def _prompt(n: int) -> dict:
    return {
        "filename": f"0{n}_thing.md",
        "content": "## Goal\ng\n\n## Context\nc\n\n## Instructions\ni\n\n## Constraints\nco",
    }


# --- valid response parses into PlanResult ---

def test_valid_response_parses():
    raw = _make_response([_step(1), _step(2), _step(3)], [_prompt(1), _prompt(2)])
    with patch(f"{MODULE}.complete", return_value=raw):
        result = generate_plan(_ctx(), detail_level="minimal")

    assert len(result.steps) == 3
    assert result.steps[0].order == 1
    assert result.steps[0].title == "Step 1"
    assert len(result.prompts) == 2
    assert result.prompts[0].filename == "01_thing.md"


# --- unparseable JSON raises descriptive error ---

def test_unparseable_json_raises():
    with patch(f"{MODULE}.complete", return_value="not json at all"):
        with pytest.raises(ValueError, match="unparseable JSON"):
            generate_plan(_ctx())


# --- bad response shape raises descriptive error ---

def test_bad_shape_raises():
    with patch(f"{MODULE}.complete", return_value='{"wrong_key": []}'):
        with pytest.raises(ValueError, match="unexpected response shape"):
            generate_plan(_ctx())


# --- minimal detail level ---

def test_minimal_detail_level():
    raw = _make_response([_step(i) for i in range(1, 4)], [_prompt(1), _prompt(2)])
    with patch(f"{MODULE}.complete", return_value=raw) as mock_complete:
        result = generate_plan(_ctx(), detail_level="minimal")

    assert len(result.steps) == 3
    assert len(result.prompts) == 2
    assert result.assumptions == []
    # verify detail_level string was injected into the prompt
    call_args = mock_complete.call_args[0][0]
    assert "minimal" in call_args


# --- standard detail level ---

def test_standard_detail_level():
    raw = _make_response([_step(i) for i in range(1, 6)], [_prompt(i) for i in range(1, 5)])
    with patch(f"{MODULE}.complete", return_value=raw) as mock_complete:
        result = generate_plan(_ctx(), detail_level="standard")

    assert len(result.steps) == 5
    assert len(result.prompts) == 4
    call_args = mock_complete.call_args[0][0]
    assert "standard" in call_args


# --- full detail level includes assumptions ---

def test_full_detail_level_with_assumptions():
    assumptions = ["Port inferred as 8080 [ASSUMED]", "Auth strategy assumed to be JWT [ASSUMED]"]
    raw = _make_response(
        [_step(i) for i in range(1, 8)],
        [_prompt(i) for i in range(1, 7)],
        assumptions=assumptions,
    )
    with patch(f"{MODULE}.complete", return_value=raw) as mock_complete:
        result = generate_plan(_ctx(), detail_level="full")

    assert len(result.assumptions) == 2
    assert "Port inferred" in result.assumptions[0]
    call_args = mock_complete.call_args[0][0]
    assert "full" in call_args


# --- full detail level with no assumptions still works ---

def test_full_detail_level_empty_assumptions():
    raw = _make_response([_step(i) for i in range(1, 6)], [_prompt(i) for i in range(1, 6)], assumptions=[])
    with patch(f"{MODULE}.complete", return_value=raw):
        result = generate_plan(_ctx(), detail_level="full")

    assert result.assumptions == []


# --- context summary includes connection info ---

def test_context_with_connections_included_in_prompt():
    from app.models.canvas import Connection
    ctx = _ctx(connections=[Connection(direction="in", peer_label="Gateway", peer_type="gateway", protocol="HTTP")])
    raw = _make_response([_step(1)], [_prompt(1)])
    with patch(f"{MODULE}.complete", return_value=raw) as mock_complete:
        generate_plan(ctx, detail_level="minimal")

    prompt_text = mock_complete.call_args[0][0]
    assert "Gateway" in prompt_text
    assert "HTTP" in prompt_text
