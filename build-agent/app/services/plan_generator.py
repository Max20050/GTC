import json
from pathlib import Path
from typing import Literal

from app.models.canvas import MicroserviceContext
from app.models.response import PlanResult, PlanStep, PromptFile
from app.services import llm_client

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

_DETAIL_INSTRUCTIONS: dict[str, str] = {
    "minimal": (
        "Generate exactly 3 concise plan steps (one sentence each) and exactly 2 prompt files "
        "(scaffold and routes). Do not surface assumptions."
    ),
    "standard": (
        "Generate exactly 5 plan steps and 3 to 4 prompt files. "
        "Flag inferred decisions inline as [ASSUMED]. "
        "The assumptions array may be empty."
    ),
    "full": (
        "Generate as many plan steps as needed for a thorough plan, with full descriptions. "
        "Generate 5 to 7 prompt files. "
        "Every inferred decision must appear both inline as [ASSUMED] and in the assumptions array. "
        "The assumptions array must be non-empty when any decision was inferred."
    ),
}


def _load_template(name: str) -> str:
    return (_PROMPTS_DIR / name).read_text(encoding="utf-8")


def _build_context_summary(ctx: MicroserviceContext) -> str:
    lines = [
        f"Label: {ctx.label}",
        f"Type: {ctx.type}",
        f"Stack: {ctx.stack}",
        f"Endpoints: {json.dumps(ctx.endpoints)}",
        f"Contracts: {json.dumps(ctx.contracts)}",
        f"Config: {json.dumps(ctx.config)}",
    ]
    if ctx.connections:
        conn_lines = [
            f"  - {c.direction.upper()} {c.peer_label} ({c.peer_type})"
            + (f" via {c.protocol}" if c.protocol else "")
            for c in ctx.connections
        ]
        lines.append("Connections:\n" + "\n".join(conn_lines))
    else:
        lines.append("Connections: none")
    return "\n".join(lines)


def generate_plan(
    ctx: MicroserviceContext,
    detail_level: Literal["minimal", "standard", "full"] = "standard",
) -> PlanResult:
    system_prompt = _load_template("system.txt")
    plan_template = _load_template("plan.txt")

    context_summary = _build_context_summary(ctx)
    prompt = plan_template.format(
        context=context_summary,
        detail_level=detail_level,
        detail_instructions=_DETAIL_INSTRUCTIONS[detail_level],
    )

    raw = llm_client.complete(prompt, system_prompt=system_prompt, temperature=0.3)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"plan_generator: LLM returned unparseable JSON — {exc}\nRaw response:\n{raw}") from exc

    try:
        steps = [PlanStep(**s) for s in data["steps"]]
        prompts = [PromptFile(**p) for p in data["prompts"]]
        assumptions = data.get("assumptions", [])
    except (KeyError, TypeError) as exc:
        raise ValueError(f"plan_generator: unexpected response shape — {exc}\nParsed data:\n{data}") from exc

    return PlanResult(steps=steps, prompts=prompts, assumptions=assumptions)
