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
//  1. POSTGRES_HOST — individual vars (Docker Compose sets this explicitly)
//  2. DATABASE_URL  — full DSN (local dev / CI fallback)
func NewPool(ctx context.Context) (*pgxpool.Pool, error) {
	dsn := buildDSN()
	if dsn == "" {
		return nil, fmt.Errorf(
			"no database configuration found: set POSTGRES_HOST or DATABASE_URL",
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

// buildDSN returns a PostgreSQL connection string.
//
// POSTGRES_HOST takes priority — when it is set the DSN is built from
// individual POSTGRES_* vars so Docker Compose can control each part
// independently (e.g. setting POSTGRES_HOST="postgres" for the service name).
//
// DATABASE_URL is the fallback for local development and CI where a full
// connection string is more convenient.
func buildDSN() string {
	// Priority 1 — explicit host means we're running in Docker (or similar).
	if host := os.Getenv("POSTGRES_HOST"); host != "" {
		port := envOr("POSTGRES_PORT", "5432")
		user := envOr("POSTGRES_USER", "auth_app")
		pass := envOr("POSTGRES_PASSWORD", "secretauthapppassowrd")
		db := envOr("POSTGRES_DB", "auth_db")
		ssl := envOr("POSTGRES_SSLMODE", "disable")

		return fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=%s",
			user, pass, host, port, db, ssl)
	}

	// Priority 2 — full URL for local dev / CI.
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return url
	}

	return ""
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
