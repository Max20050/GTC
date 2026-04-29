import json
from pathlib import Path

from app.config import STACK_REGISTRY
from app.models.canvas import MicroserviceContext
from app.models.response import SkillRecommendation
from app.services import llm_client
from app.services.plan_generator import _build_context_summary

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def recommend_skills(ctx: MicroserviceContext, stack: str) -> list[SkillRecommendation]:
    registry_entry = STACK_REGISTRY.get(stack, {})
    preferred_libs = ", ".join(registry_entry.get("preferred_libs", [])) or "none specified"

    template = (_PROMPTS_DIR / "skills.txt").read_text(encoding="utf-8")
    prompt = template.format(
        context=_build_context_summary(ctx),
        stack=stack,
        preferred_libs=preferred_libs,
    )

    raw = llm_client.complete(prompt, temperature=0.2)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"skill_recommender: LLM returned unparseable JSON — {exc}") from exc

    try:
        return [SkillRecommendation(**s) for s in data["skills"]]
    except (KeyError, TypeError) as exc:
        raise ValueError(f"skill_recommender: unexpected response shape — {exc}") from exc
