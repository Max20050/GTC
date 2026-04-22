# Workspace Service — CLAUDE.md

This file gives Claude Code full context about the Workspace Service so it can generate accurate, consistent code without needing extra explanation.

---

## What This Service Does

The Workspace Service manages everything related to organizations, teams, boards, and membership/roles. It is one of two backend services in this project — the other is the Users Service (already built), which handles auth, login, registration, and OAuth.

This service does NOT handle authentication. It trusts a JWT issued by the Users Service and reads the user identity from it.

---

## Architecture Overview

```
Users Service     → auth, login, register, OAuth (already built)
Workspace Service → orgs, teams, boards, membership, roles (this service)
```

Both services are independent. They communicate only via JWT tokens — no direct service-to-service calls.

---

## Tech Stack

- **Language:** Go
- **Framework:** Gin
- **Database:** PostgreSQL
- **ORM:** GORM
- **Auth:** JWT validation (verify token from Users Service, do not issue tokens)
- **Validation:** go-playground/validator
- **Testing:** Go standard testing package + testify

---

## Entity Definitions

### Organization
```
id           String   @id @default(uuid())
name         String
slug         String   @unique          // URL-safe identifier e.g. "acme-corp"
logo_url     String?
owner_id     String                    // user_id from Users Service
plan         Enum: free | pro | enterprise   @default(free)
created_at   DateTime @default(now())
updated_at   DateTime @updatedAt
```

### OrgMember (junction — user ↔ org)
```
id           String   @id @default(uuid())
org_id       String
user_id      String                    // from Users Service
role         Enum: owner | admin | member
joined_at    DateTime @default(now())

@@unique([org_id, user_id])
```

### Team
```
id           String   @id @default(uuid())
org_id       String
name         String
slug         String                    // unique within org
description  String?
created_by   String                    // user_id
created_at   DateTime @default(now())
updated_at   DateTime @updatedAt

@@unique([org_id, slug])
```

### TeamMember (junction — user ↔ team)
```
id           String   @id @default(uuid())
team_id      String
user_id      String                    // from Users Service
role         Enum: admin | editor | viewer
joined_at    DateTime @default(now())

@@unique([team_id, user_id])
```

### Board
```
id           String   @id @default(uuid())
name         String
description  String?
owner_type   Enum: user | team
owner_id     String                    // user_id or team_id depending on owner_type
visibility   Enum: private | team | org | public
thumbnail_url String?
created_by   String                    // user_id
created_at   DateTime @default(now())
updated_at   DateTime @updatedAt
```

---

## Business Rules

### Organizations
- The user who creates an org is automatically added as OrgMember with role `owner`
- There can only be one `owner` per org
- Slug must be globally unique and URL-safe (lowercase, hyphens only)
- Deleting an org cascades to teams, memberships, and team boards

### Teams
- Teams belong to one org
- The user who creates a team is automatically added as TeamMember with role `admin`
- Slug must be unique within the org (not globally)
- Deleting a team cascades to memberships and team boards

### Boards
- `owner_type: "user"` → personal board, owner_id is a user_id. Visibility can only be `private` or `public`
- `owner_type: "team"` → team board, owner_id is a team_id. Visibility can be `team`, `org`, or `public`
- A user must be a member of the team to create a team board
- Only the board creator or a team/org admin can delete a board

### Roles & Permissions
| Action                  | Org Owner | Org Admin | Org Member | Team Admin | Team Editor | Team Viewer |
|-------------------------|-----------|-----------|------------|------------|-------------|-------------|
| Delete org              | ✅        | ❌        | ❌         | —          | —           | —           |
| Invite to org           | ✅        | ✅        | ❌         | —          | —           | —           |
| Create team             | ✅        | ✅        | ❌         | —          | —           | —           |
| Delete team             | ✅        | ✅        | ❌         | ✅         | ❌          | ❌          |
| Invite to team          | ✅        | ✅        | ❌         | ✅         | ❌          | ❌          |
| Create board            | —         | —         | —          | ✅         | ✅          | ❌          |
| Edit board              | —         | —         | —          | ✅         | ✅          | ❌          |
| Delete board            | —         | —         | —          | ✅         | ❌          | ❌          |
| View board              | —         | —         | —          | ✅         | ✅          | ✅          |

---

## API Endpoints

### Organizations
```
POST   /orgs                        Create org (authenticated user becomes owner)
GET    /orgs/:orgId                 Get org details
PATCH  /orgs/:orgId                 Update org (admin+)
DELETE /orgs/:orgId                 Delete org (owner only)

GET    /orgs/:orgId/members         List members
POST   /orgs/:orgId/members         Invite member (admin+)
PATCH  /orgs/:orgId/members/:userId Update member role (admin+)
DELETE /orgs/:orgId/members/:userId Remove member (admin+ or self)
```

### Teams
```
POST   /orgs/:orgId/teams                        Create team
GET    /orgs/:orgId/teams                        List teams in org
GET    /orgs/:orgId/teams/:teamId                Get team details
PATCH  /orgs/:orgId/teams/:teamId                Update team
DELETE /orgs/:orgId/teams/:teamId                Delete team

GET    /orgs/:orgId/teams/:teamId/members        List team members
POST   /orgs/:orgId/teams/:teamId/members        Add member to team
PATCH  /orgs/:orgId/teams/:teamId/members/:userId Update team member role
DELETE /orgs/:orgId/teams/:teamId/members/:userId Remove from team
```

### Boards
```
POST   /boards                      Create personal board
GET    /boards                      List my personal boards
GET    /boards/:boardId             Get board (respects visibility)
PATCH  /boards/:boardId             Update board
DELETE /boards/:boardId             Delete board

POST   /orgs/:orgId/teams/:teamId/boards         Create team board
GET    /orgs/:orgId/teams/:teamId/boards         List team boards
```

---

## Folder Structure

```
workspace-service/
├── cmd/
│   └── main.go                      (entry point)
├── internal/
│   ├── orgs/
│   │   ├── handler.go               (HTTP handlers)
│   │   ├── service.go               (business logic)
│   │   ├── repository.go            (DB queries via GORM)
│   │   └── model.go                 (GORM models + request/response structs)
│   ├── teams/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── model.go
│   ├── boards/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── model.go
│   ├── members/
│   │   └── service.go               (shared membership logic)
│   └── middleware/
│       ├── auth.go                  (JWT verification)
│       └── error.go
├── pkg/
│   └── db/
│       └── postgres.go              (GORM client singleton)
├── .env
├── go.mod
└── go.sum
```

---

## Auth Middleware

Every request must include an `Authorization: Bearer <token>` header. The middleware verifies the JWT using the same secret as the Users Service and attaches the decoded user to the Gin context:

```go
c.Set("user", AuthUser{
    ID:    "uuid",
    Email: "user@example.com",
})
```

If the token is missing or invalid, respond with `401 Unauthorized` and abort the request.

---

## Error Handling

Use consistent error responses across all endpoints:

```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`

---

## Environment Variables

```
DATABASE_URL=postgresql://...
JWT_SECRET=same_secret_as_users_service
PORT=3002
```

---

## What to Build First

1. GORM models for all entities
2. Database connection setup (pkg/db/postgres.go)
3. Auth middleware (JWT verification)
4. Orgs module (handler → service → repository)
5. Teams module (handler → service → repository)
6. Boards module (handler → service → repository)
7. Shared members service
8. Error handling (consistent JSON responses)
9. Tests for service layer