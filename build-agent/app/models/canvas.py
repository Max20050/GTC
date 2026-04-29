from typing import Any, Literal
from pydantic import BaseModel


class NodePosition(BaseModel):
    x: float = 0
    y: float = 0


class DiagramNode(BaseModel):
    id: str
    type: str = "microservice"
    data: dict[str, Any] = {}


class EdgeData(BaseModel):
    protocol: str | None = None


class Connector(BaseModel):
    id: str
    source: str
    target: str
    data: EdgeData = EdgeData()


class Canvas(BaseModel):
    nodes: list[DiagramNode]
    edges: list[Connector]


class Connection(BaseModel):
    direction: Literal["in", "out"]
    peer_label: str
    peer_type: str
    protocol: str | None = None


class MicroserviceContext(BaseModel):
    label: str
    type: str
    stack: str
    endpoints: list[dict[str, Any]]
    contracts: list[dict[str, Any]]
    config: dict[str, Any]
    connections: list[Connection]
