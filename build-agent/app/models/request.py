from typing import Literal
from pydantic import BaseModel

from app.models.canvas import Canvas


class BuildOptions(BaseModel):
    detail_level: Literal["minimal", "standard", "full"] = "standard"
    stack: str | None = None


class BuildRequest(BaseModel):
    target_node_id: str
    canvas: Canvas
    options: BuildOptions = BuildOptions()
