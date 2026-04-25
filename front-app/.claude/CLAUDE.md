# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Graph-to-Code (GTC) is an architecture diagramming tool. The frontend is a React + TypeScript SPA built with Vite. It lets users build architecture diagrams on a canvas, then generates code/docs from them. There are 4 backend services: `users-auth` (auth, port 8080), `canvas-service` (canvas storage, port 8082), `app-service`, and `build-agent`. All are Go services. The frontend proxies API calls through Vite's dev server.

## Commands

```bash
npm run dev       # start dev server (proxies /canvas/* → localhost:8082, auth → localhost:8080)
npm run build     # tsc type-check + vite production build
npm run lint      # eslint
```

No test runner is configured yet.

## Git Workflow

Always commit to the parent repo root (not inside `front-app/`). Stage and commit from `graph-to-code-project/`:

```bash
git add -A
git commit -m "<type>: <description>"   # feat|fix|refactor|docs|chore|style
git pull --rebase origin master
git push origin master
```

## Architecture

### State management

All diagram state lives in a single Zustand store (`src/hooks/useDiagram.ts`). The store holds `nodes`, `connectors`, `regions`, `viewport`, and `selection`. It is the source of truth for the inspector and is mirrored to React Flow's internal state.

**Critical:** The canvas has two parallel state systems that must stay in sync:
1. **Zustand store** — the app's source of truth. Used by the inspector, auto-save, and generate features.
2. **React Flow state** (`useNodesState`/`useEdgesState` inside `Canvas.tsx`) — drives what is rendered on the canvas.

Changes originating in React Flow (drag, connect, delete) flow: RF event → `handleNodesChange`/`handleEdgesChange`/`onConnect` → update both RF state and Zustand store. Changes loaded from the backend flow: `useCanvasSync` → sets Zustand store → passes as `initialNodes`/`initialEdges` to `<Canvas>` on mount. The Canvas only reads `initialNodes`/`initialEdges` once at mount; it does not re-initialise if those props change.

### Canvas persistence

`src/hooks/useCanvasSync.ts` handles load and auto-save:
- On mount: `GET /canvas/{canvasId}` → populate Zustand + RF initial state. Creates a new canvas on 404.
- On change: Zustand subscription debounces 1500ms → `PUT /canvas/{canvasId}` (full replace, no diff).
- Auth: `Bearer` token read from `localStorage` key `auth_token`.

The canvas ID comes from the URL param `boardId`. An embedded canvas can use a composite ID like `{boardId}:{nodeId}` — `useCanvasSync` handles creation automatically.

### Canvas API contract

`src/lib/canvas-api.ts` — base URL is empty string (Vite proxy). The backend uses `from`/`to` for edge source/target; the frontend uses `sourceNodeId`/`targetNodeId`. Transformation happens in `useCanvasSync`.

Node `config` is `Record<string, unknown>`. All extended data (contracts, endpoints, embedded-canvas flags) should be stored as reserved underscore-prefixed keys (`_contracts`, `_endpoints`, `_hasEmbedded`) in config to avoid backend schema changes.

### React Flow integration

- Library: `@xyflow/react` v12.
- Custom node type `arch` maps to `NodeCard`. All nodes use this single type.
- Node handles use explicit IDs: `id="input"` (target, left) and `id="output"` (source, right). These IDs are required — without them `addEdge` deduplicates valid connections.
- All edges use `type: "smoothstep"`.
- `ZoneLayer` and `DrawZoneOverlay` are rendered as children of `<ReactFlow>` and use `useViewport()`/`useReactFlow()` which require being inside the ReactFlow provider context.
- Zones (regions) are rendered via `ZoneLayer` using viewport-transform math: `screenX = flowX * zoom + vpX`. They are NOT React Flow nodes.

### Inspector

`src/components/inspector/Inspector.tsx` reads `selection` from Zustand and renders either `NodeDetail` or `ConnectorDetail`. The `Section` helper component is exported from `NodeDetail` and reused in `ConnectorDetail`.

`NodeDetail` has a config key-value editor. For `aws-service` and `google-service` nodes, `service_name` and `region` fields render as `<select>` dropdowns with curated options. Service-specific field suggestions appear when a service name is selected (e.g., selecting "Lambda" shows runtime/memory/timeout hints).

### Drag-and-drop

Component palette items are draggable via `@dnd-kit/core`. The canvas is the drop target (`id="canvas-drop-zone"`). Drop position is communicated via `window.__canvasAddNode(type, clientX, clientY)` — a function the Canvas registers on `window` because `DndContext` wraps the whole page and the Canvas can't receive props directly from the drag handler.

### Zone drawing mode

Toggled by the "Zone" button in Topbar. State lives in `BoardPage` (`isDrawingZone`). When active, `panOnDrag={false}` is set on ReactFlow and `DrawZoneOverlay` (rendered inside ReactFlow) captures pointer events. Zones are in-memory only — not yet persisted to the backend.

### Route structure

```
/login, /register          — auth pages, no layout
/home                      — personal boards list
/boards/:boardId           — canvas (BoardPage)
/org/:orgId                — org overview (OrgPage, stub)
```

`ProtectedRoute` checks `localStorage` for `auth_token` and redirects to `/login` if absent.

## Open Issues

See GitHub issue #1 for the next major feature set: embedded canvas, data contracts (`_contracts`), and endpoint definitions (`_endpoints`) with a connection contract inspector.
