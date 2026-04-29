import json
from unittest.mock import patch

import pytest

from app.models.canvas import MicroserviceContext
from app.services.skill_recommender import recommend_skills

MODULE = "app.services.skill_recommender.llm_client"


def _ctx(stack: str = "python-fastapi") -> MicroserviceContext:
    return MicroserviceContext(
        label="Orders", type="microservice", stack=stack,
        endpoints=[], contracts=[], config={}, connections=[],
    )


def _skill(name: str) -> dict:
    return {"name": name, "reason": f"Useful for {name}.", "docs_url": f"https://docs.example.com/{name}"}


# --- valid response parses into SkillRecommendation list ---

def test_valid_response_parses():
    raw = json.dumps({"skills": [_skill("sqlalchemy"), _skill("alembic")]})
    with patch(f"{MODULE}.complete", return_value=raw):
        result = recommend_skills(_ctx(), "python-fastapi")

    assert len(result) == 2
    assert result[0].name == "sqlalchemy"
    assert result[0].docs_url == "https://docs.example.com/sqlalchemy"


# --- failed LLM call propagates exception to caller ---

def test_failed_llm_call_raises():
    with patch(f"{MODULE}.complete", side_effect=RuntimeError("network error")):
        with pytest.raises(RuntimeError, match="network error"):
            recommend_skills(_ctx(), "python-fastapi")


# --- unparseable JSON raises ValueError ---

def test_unparseable_json_raises():
    with patch(f"{MODULE}.complete", return_value="not json"):
        with pytest.raises(ValueError, match="unparseable JSON"):
            recommend_skills(_ctx(), "python-fastapi")


# --- bad response shape raises ValueError ---

def test_bad_shape_raises():
    with patch(f"{MODULE}.complete", return_value='{"wrong": []}'):
        with pytest.raises(ValueError, match="unexpected response shape"):
            recommend_skills(_ctx(), "python-fastapi")


# --- unknown stack falls back gracefully (no preferred_libs) ---

def test_unknown_stack_falls_back():
    raw = json.dumps({"skills": [_skill("some-lib")]})
    with patch(f"{MODULE}.complete", return_value=raw) as mock_complete:
        result = recommend_skills(_ctx(stack="ruby-rails"), "ruby-rails")

    assert len(result) == 1
    prompt = mock_complete.call_args[0][0]
    assert "none specified" in prompt


# --- preferred libs for known stacks are included in prompt ---

@pytest.mark.parametrize("stack,expected_lib", [
    ("python-fastapi", "sqlalchemy"),
    ("go-gin", "gin"),
    ("node-express", "express"),
])
def test_known_stack_preferred_libs_in_prompt(stack, expected_lib):
    raw = json.dumps({"skills": [_skill("x")]})
    with patch(f"{MODULE}.complete", return_value=raw) as mock_complete:
        recommend_skills(_ctx(stack=stack), stack)

    prompt = mock_complete.call_args[0][0]
    assert expected_lib in prompt
