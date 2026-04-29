from app.models.canvas import Canvas, Connection, DiagramNode, MicroserviceContext

_LANGUAGE_TO_STACK: dict[str, str] = {
    "go": "go-gin",
    "python": "python-fastapi",
    "javascript": "node-express",
    "node": "node-express",
    "typescript": "node-express",
}


def _infer_stack(language: str | None) -> str:
    if not language:
        return "[ASSUMED]"
    return _LANGUAGE_TO_STACK.get(language.lower(), "[ASSUMED]")


def _node_label(node: DiagramNode) -> str:
    return node.data.get("label", node.id)


def read_canvas(canvas: Canvas, target_node_id: str, stack_override: str | None = None) -> MicroserviceContext:
    node_map = {n.id: n for n in canvas.nodes}

    target = node_map.get(target_node_id)
    if target is None:
        raise ValueError(f"Node '{target_node_id}' not found in canvas")

    data = target.data
    config: dict = {k: v for k, v in data.items() if k not in ("label", "_endpoints", "_contracts", "language")}

    language = data.get("language")
    stack = stack_override or _infer_stack(language)

    endpoints: list = data.get("_endpoints") or []
    contracts: list = data.get("_contracts") or []

    connections: list[Connection] = []
    for edge in canvas.edges:
        if edge.source == target_node_id:
            peer = node_map.get(edge.target)
            if peer:
                connections.append(Connection(
                    direction="out",
                    peer_label=_node_label(peer),
                    peer_type=peer.type,
                    protocol=edge.data.protocol,
                ))
        elif edge.target == target_node_id:
            peer = node_map.get(edge.source)
            if peer:
                connections.append(Connection(
                    direction="in",
                    peer_label=_node_label(peer),
                    peer_type=peer.type,
                    protocol=edge.data.protocol,
                ))

    return MicroserviceContext(
        label=_node_label(target),
        type=target.type,
        stack=stack,
        endpoints=endpoints if isinstance(endpoints, list) else [],
        contracts=contracts if isinstance(contracts, list) else [],
        config=config,
        connections=connections,
    )
