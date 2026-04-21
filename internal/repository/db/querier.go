package db

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Querier is the interface implemented by *Queries.
// Other services depend on this interface, not the concrete type.
type Querier interface {
	CreateUser(ctx context.Context, arg CreateUserParams) (CreateUserRow, error)
	GetUserByEmail(ctx context.Context, email string) (User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (GetUserByIDRow, error)
	UpdateUserPassword(ctx context.Context, arg UpdateUserPasswordParams) error
}

// --- Param / Row types -------------------------------------------------------

type CreateUserParams struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"password_hash"`
}

// CreateUserRow is what the INSERT ... RETURNING clause yields.
type CreateUserRow struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

// GetUserByIDRow omits the password hash (safe to serialise externally).
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
