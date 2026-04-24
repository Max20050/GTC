# CLAUDE.md — Architecture Diagram Builder with AI Documentation

## Project Overview

A web application where users visually design system architecture diagrams (microservices, databases, queues, gateways, etc.) on a canvas, then generate AI-powered documentation (CLAUDE.md, README, API specs, etc.) that can be used directly by Claude Code or similar tools to scaffold the backend.

---

## General Shape

### Layout (3-Panel)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOPBAR: project breadcrumb · node/connector/region counts · actions    │
├──────────────┬──────────────────────────────────┬───────────────────────┤
│              │                                  │                       │
│  LEFT PANEL  │        CANVAS (main)             │   RIGHT PANEL         │
│  Component   │   drag-and-drop diagram area     │   Inspector /         │
│  Palette     │   with zoom + pan                │   Node Detail         │
│              │                                  │                       │
│  (collapsible│                                  │   (context-sensitive) │
│   sidebar)   │                                  │                       │
└──────────────┴──────────────────────────────────┴───────────────────────┘
│  STATUSBAR: live · autosaved · zoom controls · keyboard hints           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key UI Regions

1. **Topbar** — fixed height ~44px
   - Left: app logo + project path breadcrumb (`workspace / project-name / branch`)
   - Center: metadata chips (`N nodes · N connectors · N regions`)
   - Right: `History`, `Share`, `Simulate`, `+ Deploy` buttons

2. **Left Sidebar** — ~200px wide, scrollable
   - Grouped component palette with keyboard shortcut badges
   - Groups: COMPUTE, DATA, EDGE & EXTERNAL, REGIONS
   - Each item: icon + label + shortcut key (right-aligned)
   - Search bar at top
   - Group headers with count badges

3. **Canvas** — flex-grows to fill remaining space
   - Dark grid background (`#0d0f12` base, subtle dot/line grid)
   - Draggable, pannable, zoomable (zoom shown in status bar, `43%` etc.)
   - Nodes organized into **region swimlanes** (labeled boxes: `EDGE`, `API TIER`, `DATA PLANE`, `3RD PARTY`)
   - Connector lines between nodes with protocol labels (HTTP REST, gRPC, SQL, Pub/Sub, NoSQL, WebSocket)
   - Mini-map in top-right corner of canvas (overview thumbnail)
   - Multi-select, lasso, snap-to-grid

4. **Right Panel** — ~360px wide, context-sensitive inspector
   - Shows selected node/connector details
   - Sections: METHOD, AUTH, THROUGHPUT, RETRY, TIMEOUT, ABOUT, HEADERS, REQUEST body
   - Header shows connector type badge + endpoint name + breadcrumb

5. **Statusbar** — fixed ~28px
   - Left: `● live · autosaved 42s ago`
   - Center: keyboard hints (`⌘+scroll to zoom · drag background to pan`)
   - Right: version + project URI (`v2026.4.18 · fluxarch://projects/...`)

---

## Node Types

### Compute
| Label | Shortcut | Icon |
|---|---|---|
| Microservice | S | rectangle icon |
| Serverless | F | lambda-style |
| Scheduled job | T | clock |
| Gateway / LB | G | diamond/shield |
| Auth provider | A | lock |

### Data
| Label | Shortcut | Icon |
|---|---|---|
| SQL database | D | cylinder |
| Document store | N | stacked docs |
| Cache / KV | K | lightning bolt |
| Message queue | Q | three dots |
| Object storage | O | bucket |

### Edge & External
| Label | Shortcut | Icon |
|---|---|---|
| Client app | C | monitor |
| CDN | E | globe |
| 3rd-party | X | external link |

---

## Connector Types

Each connector has a **color-coded protocol** rendered as a legend at the bottom of the canvas:

| Protocol | Color |
|---|---|
| HTTP REST | teal/cyan |
| gRPC | blue |
| SQL | green |
| NoSQL | orange |
| Pub/Sub | yellow |
| WebSocket | magenta/pink |

Connectors render as bezier curves or straight lines with optional arrowheads.  
Label overlaid at the midpoint of the line (e.g. `HTTPS · API`, `gRPC`, `Pub/Sub · partitioned`).

---

## Node Card Anatomy

Each node on the canvas is a compact card (~120×60px):

```
┌────────────────────────────────┐
│ [icon]  service-name           │  ← title
│         tech · version         │  ← subtitle (e.g. "React · Vite", "Go 1.22 · gRPC")
│  ● cc  ● cc                    │  ← connection port dots (left/right sides)
└────────────────────────────────┘
```

- Ports (small dots) on left/right or top/bottom edges for connecting
- Status indicator dot (green = healthy)
- Color-coded left border or header band per compute/data/external type
- Version badges in muted monospace text

---

## Right Panel — Inspector Detail

When a **connector** is selected:

```
CONNECTOR  [REST badge]
POST /payments
API Gateway › payments-svc

METHOD      POST  /v1/payments
AUTH        Bearer JWT (scope: payments:write)
THROUGHPUT  160 req/s · p95 42ms
RETRY       exponential · max 3
TIMEOUT     2,000 ms
ABOUT       Create a new payment intent. Idempotent
            via `Idempotency-Key` header.

HEADERS
  Authorization    Bearer <jwt>      [req]
  Idempotency-Key  <uuid v4>         [req]
  Content-Type     application/json  [req]

REQUEST
  {
    "amount_cents": 12500,
    "currency": "USD",
    "source_account_id": "acc_0f2a...",
    "destination": {
      "type": "external_card",
      ...
    }
  }
```

When a **node** is selected, show:
- Service name, tech stack, version
- Replicas / scaling config
- Health check endpoint
- Environment / region
- Outgoing/incoming connector list

---

## AI Documentation Generation Panel

A separate modal or slide-over triggered by a **"Generate Docs"** button:

```
┌─────────────────────────────────────────────────────────────┐
│  Generate Documentation                              [×]     │
│                                                             │
│  Output format:  ○ CLAUDE.md  ○ README.md  ○ OpenAPI YAML  │
│                  ○ Terraform  ○ Docker Compose              │
│                                                             │
│  Scope:  ○ Full diagram  ○ Selected nodes (3)               │
│                                                             │
│  Include:  ☑ API specs   ☑ Data models   ☑ Auth flows       │
│            ☑ Env vars    ☐ Mermaid diagram                  │
│                                                             │
│  [ Generate with Claude ]                                   │
│                                                             │
│  ──────────────────────────────────────────────────────     │
│  [Preview pane — syntax-highlighted generated output]       │
│                                                             │
│  [ Copy ]  [ Download ]  [ Open in Claude Code ]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Visual Style

### Color Palette

```css
:root {
  /* Backgrounds */
  --bg-app:        #0a0c0f;   /* outer shell */
  --bg-canvas:     #0d0f12;   /* diagram canvas */
  --bg-panel:      #111318;   /* sidebars */
  --bg-card:       #161920;   /* node cards */
  --bg-card-hover: #1c2028;
  --bg-inspector:  #111318;

  /* Borders */
  --border-subtle: #1e2229;
  --border-default:#2a303a;
  --border-active: #3d4655;

  /* Text */
  --text-primary:  #e8eaed;
  --text-secondary:#8b95a3;
  --text-muted:    #4a5260;
  --text-code:     #a8d8b0;   /* monospace/code */

  /* Accents */
  --accent-blue:   #4a9eff;   /* selected state, primary CTA */
  --accent-cyan:   #00d4aa;   /* HTTP REST connectors */
  --accent-green:  #34d058;   /* SQL, healthy status */
  --accent-orange: #f0883e;   /* NoSQL */
  --accent-yellow: #e3b341;   /* Pub/Sub */
  --accent-pink:   #d2a8ff;   /* WebSocket */
  --accent-red:    #ff6b6b;   /* errors */

  /* Node type accent strips */
  --node-compute:  #4a9eff;
  --node-data:     #34d058;
  --node-external: #f0883e;
  --node-region:   #ffffff08; /* very faint region swimlane fill */
}
```

### Typography

```css
/* Display / UI labels */
font-family: 'Geist Mono', 'JetBrains Mono', monospace;  /* for code, versions, badges */
font-family: 'Inter', 'DM Sans', sans-serif;              /* for UI labels, descriptions */

/* Key sizing */
--font-xs:   10px;  /* badges, shortcuts, status bar */
--font-sm:   11px;  /* node subtitles, muted labels */
--font-base: 13px;  /* default UI text */
--font-md:   15px;  /* panel section values */
--font-lg:   20px;  /* inspector title */
--font-xl:   24px;  /* modal headings */
```

### Component Styles

**Node cards:**
- `border-radius: 6px`
- `border: 1px solid var(--border-subtle)`
- Left accent strip: `3px solid var(--node-{type})`
- Box shadow: `0 2px 8px rgba(0,0,0,0.4)`
- Selected: `border-color: var(--accent-blue)`, `box-shadow: 0 0 0 2px rgba(74,158,255,0.3)`

**Region swimlanes:**
- Dashed border: `1px dashed var(--border-default)`
- Background: `var(--node-region)` (near-transparent tint)
- Label: uppercase, `--font-xs`, `letter-spacing: 0.12em`, `--text-muted`

**Sidebar palette items:**
- Height: `32px`, padding: `0 12px`
- Icon: `16px`, left-aligned
- Shortcut badge: right-aligned, `background: var(--bg-card)`, `border-radius: 3px`, `padding: 1px 5px`
- Hover: `background: var(--bg-card-hover)`

**Inspector panel:**
- Section labels: uppercase, `--font-xs`, `letter-spacing: 0.1em`, `--text-muted`
- Values: `--font-base`, `--text-primary`, monospace for technical values
- `[req]` badge: `background: #ff6b6b22`, `color: #ff6b6b`, `border-radius: 3px`
- Method badge (POST): `background: #34d05820`, `color: #34d058`
- Code block: `background: var(--bg-app)`, `border-radius: 4px`, `padding: 12px`, monospace

**Buttons:**
- Primary (`+ Deploy`): `background: var(--accent-blue)`, `color: white`, `border-radius: 6px`
- Secondary (`History`, `Share`): `background: transparent`, `border: 1px solid var(--border-default)`, hover lifts border color
- Simulate: similar to secondary with play icon

**Connector lines:**
- Stroke width: `1.5px` default, `2.5px` selected
- Opacity: `0.7` default, `1.0` hover/selected
- Arrow marker at endpoint: small filled triangle

**Canvas grid:**
- Dot grid: `radial-gradient` pattern, `rgba(255,255,255,0.04)` dots, `24px` spacing
- Or subtle line grid at `24px` intervals

**Topbar:**
- Height: `44px`
- `border-bottom: 1px solid var(--border-subtle)`
- Breadcrumb uses `/` separator in `--text-muted`
- Chip style: `background: var(--bg-card)`, `border: 1px solid var(--border-subtle)`, `border-radius: 20px`, `padding: 2px 10px`

---

## Canvas Interaction Model

| Action | Input |
|---|---|
| Pan | Drag background / middle mouse |
| Zoom | ⌘+scroll or `+`/`-` buttons |
| Select node | Click |
| Multi-select | Shift+click or lasso drag |
| Move node | Drag node card |
| Connect nodes | Drag from port dot to another node |
| Delete | Backspace / Delete key |
| Add component | Drag from palette OR keyboard shortcut |
| Fit to screen | `⌘+Shift+F` |
| Undo/redo | `⌘+Z` / `⌘+Shift+Z` |

---

## State Shape (Frontend)

```typescript
interface DiagramState {
  id: string;
  name: string;
  nodes: Node[];
  connectors: Connector[];
  regions: Region[];
  viewport: { x: number; y: number; zoom: number };
}

interface Node {
  id: string;
  type: 'microservice' | 'serverless' | 'scheduled_job' | 'gateway' |
        'auth_provider' | 'sql_db' | 'document_store' | 'cache' |
        'message_queue' | 'object_storage' | 'client_app' | 'cdn' | 'third_party';
  label: string;
  sublabel?: string;        // e.g. "Go 1.22 · gRPC"
  position: { x: number; y: number };
  size: { w: number; h: number };
  regionId?: string;
  meta: Record<string, unknown>; // tech, version, replicas, etc.
}

interface Connector {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  protocol: 'http_rest' | 'grpc' | 'sql' | 'nosql' | 'pubsub' | 'websocket';
  label?: string;
  meta: {
    method?: string;
    path?: string;
    auth?: string;
    throughput?: string;
    retry?: string;
    timeout?: number;
    headers?: Header[];
    requestSchema?: object;
    responseSchema?: object;
  };
}

interface Region {
  id: string;
  label: string;             // "API TIER", "DATA PLANE", etc.
  bounds: { x: number; y: number; w: number; h: number };
}
```

---

## AI Documentation Generation

When the user clicks **"Generate Docs"**, serialize `DiagramState` to JSON and send to Claude API with a prompt like:

```
You are a backend architect. Given the following system architecture diagram JSON, generate a [CLAUDE.md / README.md / OpenAPI YAML / ...].

The output should include:
- Service descriptions and responsibilities
- API endpoint specifications (method, path, auth, request/response schemas)
- Data model descriptions
- Inter-service communication patterns
- Environment variable requirements
- Deployment topology

Diagram JSON:
<diagram_json>
```

Return the generated markdown/YAML and display it in the preview pane with syntax highlighting.

---

## File Structure (Suggested)

```
src/
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx           # main pan/zoom container (react-flow or custom)
│   │   ├── NodeCard.tsx         # individual node renderer
│   │   ├── ConnectorLine.tsx    # SVG bezier connector
│   │   ├── RegionSwimlane.tsx   # dashed region box
│   │   └── MiniMap.tsx          # overview thumbnail
│   ├── sidebar/
│   │   ├── ComponentPalette.tsx # left panel with draggable items
│   │   └── PaletteItem.tsx
│   ├── inspector/
│   │   ├── Inspector.tsx        # right panel shell
│   │   ├── ConnectorDetail.tsx  # connector inspector view
│   │   └── NodeDetail.tsx       # node inspector view
│   ├── topbar/
│   │   └── Topbar.tsx
│   ├── statusbar/
│   │   └── Statusbar.tsx
│   └── generate/
│       ├── GenerateModal.tsx    # doc generation modal
│       └── DocPreview.tsx       # syntax-highlighted output
├── hooks/
│   ├── useDiagram.ts            # diagram state management
│   ├── useCanvas.ts             # pan/zoom logic
│   └── useGenerateDocs.ts       # Claude API integration
├── lib/
│   ├── diagram-to-prompt.ts     # serialize diagram → LLM prompt
│   └── claude-api.ts            # Anthropic API client
├── types/
│   └── diagram.ts               # TypeScript types (see State Shape above)
└── styles/
    └── tokens.css               # CSS variables (see Color Palette above)
```

---

## Recommended Libraries

| Purpose | Library |
|---|---|
| Canvas engine | `react-flow` (Xyflow) — handles nodes, edges, pan/zoom |
| Syntax highlighting | `shiki` or `prism-react-renderer` |
| State management | `zustand` |
| Drag and drop (palette) | `@dnd-kit/core` |
| Icons | `lucide-react` |
| Animations | `framer-motion` |
| API client | `@anthropic-ai/sdk` |

---

## Notes for Claude Code

- Start with `react-flow` — it handles 90% of the canvas complexity (nodes, edges, viewport, selection)
- Custom node types in react-flow map directly to the `Node.type` enum above
- The right panel is purely read/write from the selected element in diagram state — no separate state needed
- The generate modal calls `POST /api/generate` which proxies to Anthropic (keep API key server-side)
- All colors and spacing come from `tokens.css` — no hardcoded values in components