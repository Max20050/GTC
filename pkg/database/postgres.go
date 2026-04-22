package database

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool creates a PostgreSQL connection pool.
//
// Connection priority:
//  1. DATABASE_URL  — full DSN (used in local dev / CI)
//  2. POSTGRES_*    — individual vars (used inside Docker Compose)
func NewPool(ctx context.Context) (*pgxpool.Pool, error) {
	dsn := buildDSN()
	if dsn == "" {
		return nil, fmt.Errorf(
			"no database configuration found: set DATABASE_URL or POSTGRES_HOST/USER/PASSWORD/DB",
		)
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("creating connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("pinging database: %w", err)
	}

	return pool, nil
}

// buildDSN returns a connection string, preferring DATABASE_URL, then
// falling back to individual POSTGRES_* environment variables.
func buildDSN() string {
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return url
	}

	host := os.Getenv("POSTGRES_HOST")
	if host == "" {
		return "" // neither source is configured
	}

	port := envOr("POSTGRES_PORT", "5432")
	user := envOr("POSTGRES_USER", "auth_user")
	pass := envOr("POSTGRES_PASSWORD", "secret")
	db := envOr("POSTGRES_DB", "auth_db")
	ssl := envOr("POSTGRES_SSLMODE", "disable")

	return fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=%s",
		user, pass, host, port, db, ssl)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
