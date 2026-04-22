package testutil

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"os"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"

	"github.com/Max20050/gtc-users-auth/internal/auth"
	db "github.com/Max20050/gtc-users-auth/internal/repository/db"
	"github.com/Max20050/gtc-users-auth/pkg/tokens"
)

// MockQuerier is a configurable stub that satisfies db.Querier.
// Set the Fn fields to control each method's behaviour per test.
type MockQuerier struct {
	GetUserByEmailFn     func(ctx context.Context, email string) (db.User, error)
	CreateUserFn         func(ctx context.Context, arg db.CreateUserParams) (db.CreateUserRow, error)
	GetUserByIDFn        func(ctx context.Context, id uuid.UUID) (db.GetUserByIDRow, error)
	UpdateUserPasswordFn func(ctx context.Context, arg db.UpdateUserPasswordParams) error
	FindOAuthAccountFn   func(ctx context.Context, arg db.FindOAuthAccountParams) (uuid.UUID, error)
	CreateOAuthAccountFn func(ctx context.Context, arg db.CreateOAuthAccountParams) error
	GetOAuthByUserFn     func(ctx context.Context, userID uuid.UUID) ([]db.OAuthAccountRow, error)
}

func (m *MockQuerier) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	if m.GetUserByEmailFn != nil {
		return m.GetUserByEmailFn(ctx, email)
	}
	return db.User{}, pgx.ErrNoRows
}

func (m *MockQuerier) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.CreateUserRow, error) {
	if m.CreateUserFn != nil {
		return m.CreateUserFn(ctx, arg)
	}
	return db.CreateUserRow{ID: arg.ID, Email: arg.Email, CreatedAt: time.Now()}, nil
}

func (m *MockQuerier) GetUserByID(ctx context.Context, id uuid.UUID) (db.GetUserByIDRow, error) {
	if m.GetUserByIDFn != nil {
		return m.GetUserByIDFn(ctx, id)
	}
	return db.GetUserByIDRow{}, pgx.ErrNoRows
}

func (m *MockQuerier) UpdateUserPassword(ctx context.Context, arg db.UpdateUserPasswordParams) error {
	if m.UpdateUserPasswordFn != nil {
		return m.UpdateUserPasswordFn(ctx, arg)
	}
	return nil
}

func (m *MockQuerier) FindOAuthAccount(ctx context.Context, arg db.FindOAuthAccountParams) (uuid.UUID, error) {
	if m.FindOAuthAccountFn != nil {
		return m.FindOAuthAccountFn(ctx, arg)
	}
	return uuid.UUID{}, pgx.ErrNoRows
}

func (m *MockQuerier) CreateOAuthAccount(ctx context.Context, arg db.CreateOAuthAccountParams) error {
	if m.CreateOAuthAccountFn != nil {
		return m.CreateOAuthAccountFn(ctx, arg)
	}
	return nil
}

func (m *MockQuerier) GetOAuthAccountsByUser(ctx context.Context, userID uuid.UUID) ([]db.OAuthAccountRow, error) {
	if m.GetOAuthByUserFn != nil {
		return m.GetOAuthByUserFn(ctx, userID)
	}
	return nil, nil
}

// NewTestManager generates a fresh RSA key pair and returns a ready tokens.Manager.
func NewTestManager(t *testing.T) *tokens.Manager {
	t.Helper()
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate RSA key: %v", err)
	}
	privDER, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		t.Fatalf("marshal RSA key: %v", err)
	}
	f, err := os.CreateTemp("", "test-key-*.pem")
	if err != nil {
		t.Fatalf("create temp file: %v", err)
	}
	t.Cleanup(func() { os.Remove(f.Name()) })
	if err := pem.Encode(f, &pem.Block{Type: "PRIVATE KEY", Bytes: privDER}); err != nil {
		t.Fatalf("encode PEM: %v", err)
	}
	f.Close()
	tm, err := tokens.NewManager(f.Name())
	if err != nil {
		t.Fatalf("new token manager: %v", err)
	}
	return tm
}

// NewTestService wires up a real auth.Service backed by miniredis and the given querier.
// Registers cleanup for the Redis client and miniredis server automatically.
func NewTestService(t *testing.T, q db.Querier) (*auth.Service, *miniredis.Miniredis, *tokens.Manager) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("start miniredis: %v", err)
	}
	t.Cleanup(mr.Close)

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { rdb.Close() })

	tm := NewTestManager(t)
	svc := auth.NewService(q, rdb, tm, 15*time.Minute, 7*24*time.Hour)
	return svc, mr, tm
}