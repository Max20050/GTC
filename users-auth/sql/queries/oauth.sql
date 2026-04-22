-- sql/queries/oauth.sql
-- DML queries for OAuth account management (used by sqlc)

-- name: FindOAuthAccount :one
SELECT user_id
FROM oauth_accounts
WHERE provider = $1 AND provider_id = $2
LIMIT 1;

-- name: CreateOAuthAccount :exec
INSERT INTO oauth_accounts (id, user_id, provider, provider_id, email)
VALUES ($1, $2, $3, $4, $5);

-- name: GetOAuthAccountsByUser :many
SELECT id, provider, provider_id, email, created_at
FROM oauth_accounts
WHERE user_id = $1
ORDER BY created_at;
