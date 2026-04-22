package db

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// NOTE: Hand-written equivalent of `sqlc generate` output.
// Run `sqlc generate` against a live DB to replace this file.

// ─── CreateUser ──────────────────────────────────────────────────────────────

const createUser = `
INSERT INTO users (id, email, password_hash)
VALUES ($1, $2, $3)
RETURNING id, email, created_at
`

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (CreateUserRow, error) {
	row := q.db.QueryRow(ctx, createUser, arg.ID, arg.Email, arg.PasswordHash)
	var i CreateUserRow
	if err := row.Scan(&i.ID, &i.Email, &i.CreatedAt); err != nil {
		return i, fmt.Errorf("CreateUser scan: %w", err)
	}
	return i, nil
}

// ─── GetUserByEmail ───────────────────────────────────────────────────────────

const getUserByEmail = `
SELECT id, email, password_hash, created_at, updated_at
FROM users
WHERE email = $1
LIMIT 1
`

func (q *Queries) GetUserByEmail(ctx context.Context, email string) (User, error) {
	row := q.db.QueryRow(ctx, getUserByEmail, email)
	var i User
	if err := row.Scan(&i.ID, &i.Email, &i.PasswordHash, &i.CreatedAt, &i.UpdatedAt); err != nil {
		return i, fmt.Errorf("GetUserByEmail scan: %w", err)
	}
	return i, nil
}

// ─── GetUserByID ──────────────────────────────────────────────────────────────

const getUserByID = `
SELECT id, email, created_at, updated_at
FROM users
WHERE id = $1
LIMIT 1
`

func (q *Queries) GetUserByID(ctx context.Context, id uuid.UUID) (GetUserByIDRow, error) {
	row := q.db.QueryRow(ctx, getUserByID, id)
	var i GetUserByIDRow
	if err := row.Scan(&i.ID, &i.Email, &i.CreatedAt, &i.UpdatedAt); err != nil {
		return i, fmt.Errorf("GetUserByID scan: %w", err)
	}
	return i, nil
}

// ─── UpdateUserPassword ───────────────────────────────────────────────────────

const updateUserPassword = `
UPDATE users
SET password_hash = $2,
    updated_at    = CURRENT_TIMESTAMP
WHERE id = $1
`

func (q *Queries) UpdateUserPassword(ctx context.Context, arg UpdateUserPasswordParams) error {
	if _, err := q.db.Exec(ctx, updateUserPassword, arg.ID, arg.PasswordHash); err != nil {
		return fmt.Errorf("UpdateUserPassword: %w", err)
	}
	return nil
}
