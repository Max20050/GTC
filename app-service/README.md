# Workspace Service

Manages organizations, teams, boards, and membership/roles. Part of the Graph-to-Code project.

---

## Tech Stack

- **Go** + **Gin** — HTTP framework
- **GORM** — ORM for PostgreSQL
- **JWT (RS256)** — token verification via RSA public key (issued by the Users Service)

---

## Getting Started

### 1. Prerequisites

- Go 1.23+
- Docker & Docker Compose
- RSA public key from the Users (auth) service

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your values
```

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `POSTGRES_USER` | Postgres username | `workspace` |
| `POSTGRES_PASSWORD` | Postgres password | **required** |
| `POSTGRES_DB` | Postgres database name | `workspace_db` |
| `PORT` | HTTP port | `3002` |
| `JWT_PUBLIC_KEY_PATH` | Path to RSA public key PEM | `keys/public.pem` |

### 3. Add the RSA public key

```bash
cp /path/to/auth-service/keys/public.pem keys/public.pem
```

### 4. Run with Docker

```bash
docker compose up --build
```

### 5. Run locally

```bash
go mod download
go run ./cmd/main.go
```

---

## API Overview

### Organizations
| Method | Path | Description |
|---|---|---|
| `POST` | `/orgs` | Create org |
| `GET` | `/orgs/:orgId` | Get org |
| `PATCH` | `/orgs/:orgId` | Update org |
| `DELETE` | `/orgs/:orgId` | Delete org (owner only) |
| `GET` | `/orgs/:orgId/members` | List members |
| `POST` | `/orgs/:orgId/members` | Invite member |
| `PATCH` | `/orgs/:orgId/members/:userId` | Update member role |
| `DELETE` | `/orgs/:orgId/members/:userId` | Remove member |

### Teams
| Method | Path | Description |
|---|---|---|
| `POST` | `/orgs/:orgId/teams` | Create team |
| `GET` | `/orgs/:orgId/teams` | List teams |
| `GET` | `/orgs/:orgId/teams/:teamId` | Get team |
| `PATCH` | `/orgs/:orgId/teams/:teamId` | Update team |
| `DELETE` | `/orgs/:orgId/teams/:teamId` | Delete team |
| `GET` | `/orgs/:orgId/teams/:teamId/members` | List team members |
| `POST` | `/orgs/:orgId/teams/:teamId/members` | Add member |
| `PATCH` | `/orgs/:orgId/teams/:teamId/members/:userId` | Update role |
| `DELETE` | `/orgs/:orgId/teams/:teamId/members/:userId` | Remove member |

### Boards
| Method | Path | Description |
|---|---|---|
| `POST` | `/boards` | Create personal board |
| `GET` | `/boards` | List my boards |
| `GET` | `/boards/:boardId` | Get board |
| `PATCH` | `/boards/:boardId` | Update board |
| `DELETE` | `/boards/:boardId` | Delete board |
| `POST` | `/orgs/:orgId/teams/:teamId/boards` | Create team board |
| `GET` | `/orgs/:orgId/teams/:teamId/boards` | List team boards |

All endpoints require `Authorization: Bearer <token>`.

---

## Error Format

```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Codes: `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `CONFLICT`

---

## Project Structure

```
app-service/
├── cmd/main.go               # Entry point
├── internal/
│   ├── orgs/                 # Orgs module (handler, service, repository, model)
│   ├── teams/                # Teams module
│   ├── boards/               # Boards module
│   ├── members/              # Shared membership helpers
│   └── middleware/           # JWT auth + error helpers
├── pkg/db/postgres.go        # GORM connection
├── keys/                     # Drop public.pem here (gitignored)
├── Dockerfile
└── docker-compose.yml
```
