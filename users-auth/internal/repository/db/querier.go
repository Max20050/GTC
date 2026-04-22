package db

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Querier is the interface implemented by *Queries.
type Querier interface {
	// Users
	CreateUser(ctx context.Context, arg CreateUserParams) (CreateUserRow, error)
	GetUserByEmail(ctx context.Context, email string) (User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (GetUserByIDRow, error)
	UpdateUserPassword(ctx context.Context, arg UpdateUserPasswordParams) error

	// OAuth
	FindOAuthAccount(ctx context.Context, arg FindOAuthAccountParams) (uuid.UUID, error)
	CreateOAuthAccount(ctx context.Context, arg CreateOAuthAccountParams) error
	GetOAuthAccountsByUser(ctx context.Context, userID uuid.UUID) ([]OAuthAccountRow, error)
}

// ─── User param / row types ───────────────────────────────────────────────────

type CreateUserParams struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash *string   `json:"password_hash"` // nil for OAuth-only users
}

type CreateUserRow struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type GetUserByIDRow struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UpdateUserPasswordParams struct {
	ID           uuid.UUID `json:"id"`
	PasswordHash string    `json:"password_hash"`
}

// ─── OAuth param / row types ──────────────────────────────────────────────────

type FindOAuthAccountParams struct {
	Provider   string `json:"provider"`
	ProviderID string `json:"provider_id"`
}

type CreateOAuthAccountParams struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	Provider   string    `json:"provider"`
	ProviderID string    `json:"provider_id"`
	Email      *string   `json:"email"`
}

type OAuthAccountRow struct {
	ID         uuid.UUID `json:"id"`
	Provider   string    `json:"provider"`
	ProviderID string    `json:"provider_id"`
	Email      *string   `json:"email,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}
