from pydantic import BaseModel


class PlanStep(BaseModel):
    order: int
    title: str
    description: str


class PromptFile(BaseModel):
    filename: str
    content: str


class SkillRecommendation(BaseModel):
    name: str
    reason: str
    docs_url: str


class PlanResult(BaseModel):
    steps: list[PlanStep]
    prompts: list[PromptFile]
    assumptions: list[str] = []


class BuildResponse(BaseModel):
    plan: list[PlanStep]
    skills: list[SkillRecommendation] = []
    prompts: list[PromptFile]
    assumptions: list[str] = []
    warnings: list[str] = []
