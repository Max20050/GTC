# Canvas Service — API Reference

All endpoints except `/health` require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Base URL: `http://localhost:8082`

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth) |
| POST | `/canvas/` | Create a new canvas |
| GET | `/canvas/{canvas_id}` | Fetch a canvas |
| PUT | `/canvas/{canvas_id}` | Full replace of a canvas |
| DELETE | `/canvas/{canvas_id}` | Delete a canvas |

---

## 1. Create a board

POST `/canvas/`

The canvas is a single document that holds all nodes and edges. Send an empty arrays to start a blank board.

```http
POST /canvas/
Authorization: Bearer <token>
Content-Type: application/json

{
  "canvas_id": "project_abc",
  "nodes": [],
  "edges": []
}
```

**Response `201`**
```json
{
  "canvas_id": "project_abc",
  "nodes": [],
  "edges": []
}
```

---

## 2. Fetch the board

GET `/canvas/{canvas_id}`

```http
GET /canvas/project_abc
Authorization: Bearer <token>
```

**Response `200`** — returns the full canvas document.

---

## 3. Add nodes and connectors

The canvas is replaced in full on every `PUT`. The frontend should always send the complete current state of nodes and edges — not just the delta.

PUT `/canvas/{canvas_id}`

### Node types

| `type` | Description |
|--------|-------------|
| `microservice` | A backend service |
| `database` | SQL / NoSQL database |
| `queue` | Message broker (Kafka, RabbitMQ, SQS…) |
| `cache` | Redis, Memcached, etc. |
| `aws-service` | Any AWS managed service |
| `google-service` | Any GCP managed service |
| `ai-model-provider` | OpenAI, Anthropic, Vertex AI, etc. |
| `serverless` | Lambda, Cloud Functions, etc. |

### Edge protocols

| `protocol` | `config` keys |
|------------|---------------|
| `http-rest` | `method`, `headers`, `payload`, `expected_response` |
| `tcp` | *(free-form)* |
| `message-queue` | `queue_name`, `action` (`"publish"` \| `"consume"`) |
| `database` | `query` |
| `websocket` | *(free-form)* |
| `streaming` | *(free-form)* |

### Example — two nodes connected by an HTTP call

```http
PUT /canvas/project_abc
Authorization: Bearer <token>
Content-Type: application/json

{
  "canvas_id": "project_abc",
  "nodes": [
    {
      "id": "node_1",
      "type": "microservice",
      "label": "Auth Service",
      "position": { "x": 100, "y": 200 },
      "config": {
        "language": "Go",
        "port": 8080
      }
    },
    {
      "id": "node_2",
      "type": "database",
      "label": "UserDB",
      "position": { "x": 400, "y": 200 },
      "config": {
        "engine": "PostgreSQL",
        "version": "15",
        "port": 5432
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "from": "node_1",
      "to": "node_2",
      "label": "Fetch user",
      "protocol": "database",
      "config": {
        "query": "SELECT * FROM users WHERE id = $1"
      }
    }
  ]
}
```

### Example — adding a queue with publish and consume edges

```http
PUT /canvas/project_abc
Authorization: Bearer <token>
Content-Type: application/json

{
  "canvas_id": "project_abc",
  "nodes": [
    {
      "id": "node_1",
      "type": "microservice",
      "label": "Order Service",
      "position": { "x": 100, "y": 200 },
      "config": {}
    },
    {
      "id": "node_2",
      "type": "queue",
      "label": "Orders Queue",
      "position": { "x": 400, "y": 200 },
      "config": {
        "broker": "RabbitMQ",
        "exchange": "orders"
      }
    },
    {
      "id": "node_3",
      "type": "microservice",
      "label": "Notification Service",
      "position": { "x": 700, "y": 200 },
      "config": {}
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "from": "node_1",
      "to": "node_2",
      "label": "Publish order event",
      "protocol": "message-queue",
      "config": {
        "queue_name": "order.created",
        "action": "publish"
      }
    },
    {
      "id": "edge_2",
      "from": "node_2",
      "to": "node_3",
      "label": "Consume order event",
      "protocol": "message-queue",
      "config": {
        "queue_name": "order.created",
        "action": "consume"
      }
    }
  ]
}
```

### Example — HTTP REST connector with headers and payload

```http
PUT /canvas/project_abc
Authorization: Bearer <token>
Content-Type: application/json

{
  "canvas_id": "project_abc",
  "nodes": [
    {
      "id": "node_1",
      "type": "microservice",
      "label": "API Gateway",
      "position": { "x": 100, "y": 200 },
      "config": {}
    },
    {
      "id": "node_2",
      "type": "ai-model-provider",
      "label": "OpenAI",
      "position": { "x": 400, "y": 200 },
      "config": {
        "model": "gpt-4o"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "from": "node_1",
      "to": "node_2",
      "label": "Chat completion",
      "protocol": "http-rest",
      "config": {
        "method": "POST",
        "headers": {
          "Authorization": "Bearer $OPENAI_KEY",
          "Content-Type": "application/json"
        },
        "payload": {
          "model": "gpt-4o",
          "messages": [{ "role": "user", "content": "Hello" }]
        },
        "expected_response": {
          "choices": []
        }
      }
    }
  ]
}
```

---

## 4. Delete a board

DELETE `/canvas/{canvas_id}`

```http
DELETE /canvas/project_abc
Authorization: Bearer <token>
```

**Response `200`**
```json
{ "deleted": "project_abc" }
```

---

## Error responses

All errors follow the same shape:

```json
{ "error": "<message>" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Missing or invalid JWT |
| 404 | Canvas not found |
| 405 | Method not allowed |
| 500 | Internal server error |
