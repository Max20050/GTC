package db

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DBTX is the minimal interface satisfied by both *pgxpool.Pool and pgx.Tx.
type DBTX interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

// New returns a *Queries that wraps the given DBTX (pool or transaction).
func New(db DBTX) *Queries {
	return &Queries{db: db}
}

// Queries holds a reference to the database executor.
type Queries struct {
	db DBTX
}

// WithTx returns a new Queries scoped to the given transaction.
func (q *Queries) WithTx(tx pgx.Tx) *Queries {
	return &Queries{db: tx}
}
