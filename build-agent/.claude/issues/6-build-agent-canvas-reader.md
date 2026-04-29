# #6 — build-agent: canvas_reader — normalize canvas input

**Created:** 2026-04-27 | **Updated:** 2026-04-27

## Parent

#4

## What to build

Implement canvas_reader.py — a pure normalization function with no I/O that accepts the raw canvas payload and a target_node_id and returns a clean MicroserviceContext struct. This is the single entry point for all canvas data into the pipeline; every downstream service consumes MicroserviceContext, never raw canvas JSON.

The function extracts the target node, derives its connections from edges (direction, peer label, peer type, protocol), infers the stack from node.config.language (Go → go-gin, Python → python-fastapi, JavaScript/Node → node-express), and normalizes _contracts and _endpoints from the freeform config bag. Position data and unrelated nodes are dropped.

Also deliver the Pydantic models for Canvas, DiagramNode, Connector, MicroserviceContext, and the BuildRequest schema.

## Acceptance criteria

- [ ] canvas_reader returns a MicroserviceContext with label, type, stack, endpoints, contracts, config fields, and a connections list
- [ ] Stack is correctly inferred from config.language for Go, Python, and Node
- [ ] options.stack in the request overrides the inferred stack
- [ ] Connections list includes direction (in/out), peer_label, peer_type, and protocol for each edge touching the target node
- [ ] Position, viewport, and nodes unrelated to the target are not included in the output
- [ ] Unit tests cover: full config node, missing language field, no edges, inbound + outbound edges, target_node_id not found in canvas

## Blocked by

- Blocked by #5
