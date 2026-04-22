package db

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// NOTE: Hand-written equivalent of `sqlc generate` output for OAuth queries.

// ─── FindOAuthAccount ─────────────────────────────────────────────────────────

const findOAuthAccount = `
SELECT user_id
FROM oauth_accounts
WHERE provider = $1 AND provider_id = $2
LIMIT 1
`

func (q *Queries) FindOAuthAccount(ctx context.Context, arg FindOAuthAccountParams) (uuid.UUID, error) {
	row := q.db.QueryRow(ctx, findOAuthAccount, arg.Provider, arg.ProviderID)
	var userID uuid.UUID
	if err := row.Scan(&userID); err != nil {
		return uuid.UUID{}, fmt.Errorf("FindOAuthAccount scan: %w", err)
	}
	return userID, nil
}

// ─── CreateOAuthAccount ───────────────────────────────────────────────────────

const createOAuthAccount = `
INSERT INTO oauth_accounts (id, user_id, provider, provider_id, email)
VALUES ($1, $2, $3, $4, $5)
`

func (q *Queries) CreateOAuthAccount(ctx context.Context, arg CreateOAuthAccountParams) error {
	_, err := q.db.Exec(ctx, createOAuthAccount,
		arg.ID, arg.UserID, arg.Provider, arg.ProviderID, arg.Email,
	)
	if err != nil {
		return fmt.Errorf("CreateOAuthAccount: %w", err)
	}
	return nil
}

// ─── GetOAuthAccountsByUser ───────────────────────────────────────────────────

const getOAuthAccountsByUser = `
SELECT id, provider, provider_id, email, created_at
FROM oauth_accounts
WHERE user_id = $1
ORDER BY created_at
`

func (q *Queries) GetOAuthAccountsByUser(ctx context.Context, userID uuid.UUID) ([]OAuthAccountRow, error) {
	rows, err := q.db.Query(ctx, getOAuthAccountsByUser, userID)
	if err != nil {
		return nil, fmt.Errorf("GetOAuthAccountsByUser query: %w", err)
	}
	defer rows.Close()

	var items []OAuthAccountRow
	for rows.Next() {
		var i OAuthAccountRow
		if err := rows.Scan(&i.ID, &i.Provider, &i.ProviderID, &i.Email, &i.CreatedAt); err != nil {
			return nil, fmt.Errorf("GetOAuthAccountsByUser scan: %w", err)
		}
		items = append(items, i)
	}
	return items, rows.Err()
}
