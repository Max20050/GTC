package auth_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/Max20050/gtc-users-auth/internal/auth"
	db "github.com/Max20050/gtc-users-auth/internal/repository/db"
	"github.com/Max20050/gtc-users-auth/internal/testutil"
)

// ─── Register ────────────────────────────────────────────────────────────────

func TestRegister_Success(t *testing.T) {
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{}, pgx.ErrNoRows // no existing user
		},
	}
	svc, _, _ := testutil.NewTestService(t, q)

	pair, err := svc.Register(context.Background(), "new@example.com", "password123")
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}
	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Error("expected non-empty tokens in pair")
	}
	if pair.TokenType != "Bearer" {
		t.Errorf("unexpected token_type: %q", pair.TokenType)
	}
	if pair.ExpiresIn <= 0 {
		t.Errorf("expected positive ExpiresIn, got %d", pair.ExpiresIn)
	}
}

func TestRegister_EmailAlreadyExists(t *testing.T) {
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{ID: uuid.New(), Email: "taken@example.com"}, nil
		},
	}
	svc, _, _ := testutil.NewTestService(t, q)

	_, err := svc.Register(context.Background(), "taken@example.com", "password123")
	if !errors.Is(err, auth.ErrEmailAlreadyExists) {
		t.Fatalf("expected ErrEmailAlreadyExists, got: %v", err)
	}
}

func TestRegister_DatabaseError(t *testing.T) {
	dbErr := errors.New("connection refused")
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{}, dbErr
		},
	}
	svc, _, _ := testutil.NewTestService(t, q)

	_, err := svc.Register(context.Background(), "test@example.com", "password123")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if errors.Is(err, auth.ErrEmailAlreadyExists) {
		t.Error("got ErrEmailAlreadyExists for a generic DB error")
	}
}

func TestRegister_CreateUserError(t *testing.T) {
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{}, pgx.ErrNoRows
		},
		CreateUserFn: func(_ context.Context, _ db.CreateUserParams) (db.CreateUserRow, error) {
			return db.CreateUserRow{}, errors.New("insert failed")
		},
	}
	svc, _, _ := testutil.NewTestService(t, q)

	_, err := svc.Register(context.Background(), "test@example.com", "password123")
	if err == nil {
		t.Fatal("expected error on CreateUser failure, got nil")
	}
}

// ─── Login ───────────────────────────────────────────────────────────────────

func TestLogin_Success(t *testing.T) {
	pass := "securepassword"
	hash, _ := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.MinCost)
	hashStr := string(hash)

	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, email string) (db.User, error) {
			return db.User{ID: uuid.New(), Email: email, PasswordHash: &hashStr}, nil
		},
	}
	svc, _, _ := testutil.NewTestService(t, q)

	pair, err := svc.Login(context.Background(), "user@example.com", pass)
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Error("expected non-empty tokens in pair")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("correct"), bcrypt.MinCost)
	hashStr := string(hash)

	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, email string) (db.User, error) {
			return db.User{ID: uuid.New(), Email: email, PasswordHash: &hashStr}, nil
		},
	}
	svc, _, _ := testutil.NewTestService(t, q)

	_, err := svc.Login(context.Background(), "user@example.com", "wrong-password")
	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials, got: %v", err)
	}
}

func TestLogin_UserNotFound(t *testing.T) {
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{}, pgx.ErrNoRows
		},
	}
	svc, _, _ := testutil.NewTestService(t, q)

	_, err := svc.Login(context.Background(), "ghost@example.com", "password123")
	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials, got: %v", err)
	}
}

func TestLogin_OAuthOnlyUser(t *testing.T) {
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, email string) (db.User, error) {
			// OAuth-only users have no password hash
			return db.User{ID: uuid.New(), Email: email, PasswordHash: nil}, nil
		},
	}
	svc, _, _ := testutil.NewTestService(t, q)

	_, err := svc.Login(context.Background(), "oauth@example.com", "password123")
	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials, got: %v", err)
	}
}

func TestLogin_DatabaseError(t *testing.T) {
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{}, errors.New("query timeout")
		},
	}
	svc, _, _ := testutil.NewTestService(t, q)

	_, err := svc.Login(context.Background(), "user@example.com", "password123")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if errors.Is(err, auth.ErrInvalidCredentials) {
		t.Error("got ErrInvalidCredentials for a generic DB error")
	}
}
