package db

import (
	"time"

	"github.com/google/uuid"
)

// User mirrors the `users` table.
// PasswordHash is a pointer because OAuth-only users have no local password.
type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash *string   `json:"password_hash,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// OAuthAccount mirrors the `oauth_accounts` table.
type OAuthAccount struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	Provider   string    `json:"provider"`
	ProviderID string    `json:"provider_id"`
	Email      *string   `json:"email,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}
