import pytest

from app.models.canvas import Canvas, Connector, DiagramNode, EdgeData
from app.services.canvas_reader import read_canvas


def make_node(id: str, type: str = "microservice", **data) -> DiagramNode:
    return DiagramNode(id=id, type=type, data=data)


def make_edge(id: str, source: str, target: str, protocol: str | None = None) -> Connector:
    return Connector(id=id, source=source, target=target, data=EdgeData(protocol=protocol))


# --- full config node ---

def test_full_config_node():
    node = make_node(
        "svc-1",
        label="Orders",
        language="Python",
        _endpoints=[{"path": "/orders", "method": "GET"}],
        _contracts=[{"name": "OrderPayload"}],
        port=8080,
    )
    canvas = Canvas(nodes=[node], edges=[])
    ctx = read_canvas(canvas, "svc-1")

    assert ctx.label == "Orders"
    assert ctx.stack == "python-fastapi"
    assert ctx.endpoints == [{"path": "/orders", "method": "GET"}]
    assert ctx.contracts == [{"name": "OrderPayload"}]
    assert ctx.config == {"port": 8080}
    assert ctx.connections == []


# --- missing language field ---

def test_missing_language_infers_assumed():
    node = make_node("svc-1", label="Unknown")
    canvas = Canvas(nodes=[node], edges=[])
    ctx = read_canvas(canvas, "svc-1")

    assert ctx.stack == "[ASSUMED]"


# --- stack override ---

def test_stack_override_takes_precedence():
    node = make_node("svc-1", label="Svc", language="Python")
    canvas = Canvas(nodes=[node], edges=[])
    ctx = read_canvas(canvas, "svc-1", stack_override="go-gin")

    assert ctx.stack == "go-gin"


# --- no edges ---

def test_no_edges_produces_empty_connections():
    node = make_node("svc-1", label="Svc", language="Go")
    canvas = Canvas(nodes=[node], edges=[])
    ctx = read_canvas(canvas, "svc-1")

    assert ctx.connections == []


# --- inbound and outbound edges ---

def test_inbound_and_outbound_edges():
    target = make_node("svc-target", type="microservice", label="Target", language="Node")
    caller = make_node("svc-caller", type="microservice", label="Caller")
    db = make_node("db-1", type="database", label="Postgres")

    edges = [
        make_edge("e1", source="svc-caller", target="svc-target", protocol="HTTP"),
        make_edge("e2", source="svc-target", target="db-1", protocol="TCP"),
    ]
    canvas = Canvas(nodes=[target, caller, db], edges=edges)
    ctx = read_canvas(canvas, "svc-target")

    assert len(ctx.connections) == 2

    inbound = next(c for c in ctx.connections if c.direction == "in")
    assert inbound.peer_label == "Caller"
    assert inbound.peer_type == "microservice"
    assert inbound.protocol == "HTTP"

    outbound = next(c for c in ctx.connections if c.direction == "out")
    assert outbound.peer_label == "Postgres"
    assert outbound.peer_type == "database"
    assert outbound.protocol == "TCP"


# --- target node not found ---

def test_target_node_not_found_raises():
    canvas = Canvas(nodes=[], edges=[])
    with pytest.raises(ValueError, match="not found in canvas"):
        read_canvas(canvas, "missing-id")


# --- language variants ---

@pytest.mark.parametrize("language,expected_stack", [
    ("Go", "go-gin"),
    ("go", "go-gin"),
    ("Python", "python-fastapi"),
    ("python", "python-fastapi"),
    ("JavaScript", "node-express"),
    ("Node", "node-express"),
    ("TypeScript", "node-express"),
])
def test_language_to_stack_mapping(language, expected_stack):
    node = make_node("svc-1", label="Svc", language=language)
    canvas = Canvas(nodes=[node], edges=[])
    ctx = read_canvas(canvas, "svc-1")
    assert ctx.stack == expected_stack
