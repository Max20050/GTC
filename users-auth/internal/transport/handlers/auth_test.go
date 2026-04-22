package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	db "github.com/Max20050/gtc-users-auth/internal/repository/db"
	"github.com/Max20050/gtc-users-auth/internal/testutil"
	"github.com/Max20050/gtc-users-auth/internal/transport/handlers"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// newTestRouter wires up a minimal Gin router with the register and login routes.
func newTestRouter(t *testing.T, q db.Querier) *gin.Engine {
	t.Helper()
	svc, _, tm := testutil.NewTestService(t, q)
	h := handlers.NewAuthHandler(svc, tm)

	r := gin.New()
	r.POST("/v1/auth/register", h.Register)
	r.POST("/v1/auth/login", h.Login)
	return r
}

// postJSON fires a POST request with a JSON body and returns the recorder.
func postJSON(t *testing.T, router *gin.Engine, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	b, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// ─── Register Handler ─────────────────────────────────────────────────────────

func TestRegisterHandler_Success(t *testing.T) {
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{}, pgx.ErrNoRows
		},
	}
	router := newTestRouter(t, q)

	w := postJSON(t, router, "/v1/auth/register", map[string]string{
		"email":    "newuser@example.com",
		"password": "password123",
	})

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]any
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp["access_token"] == nil || resp["access_token"] == "" {
		t.Error("missing access_token in response")
	}
	if resp["refresh_token"] == nil || resp["refresh_token"] == "" {
		t.Error("missing refresh_token in response")
	}
	if resp["token_type"] != "Bearer" {
		t.Errorf("unexpected token_type: %v", resp["token_type"])
	}
}

func TestRegisterHandler_DuplicateEmail(t *testing.T) {
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{ID: uuid.New(), Email: "taken@example.com"}, nil
		},
	}
	router := newTestRouter(t, q)

	w := postJSON(t, router, "/v1/auth/register", map[string]string{
		"email":    "taken@example.com",
		"password": "password123",
	})

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRegisterHandler_InvalidEmail(t *testing.T) {
	router := newTestRouter(t, &testutil.MockQuerier{})

	w := postJSON(t, router, "/v1/auth/register", map[string]string{
		"email":    "not-an-email",
		"password": "password123",
	})

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestRegisterHandler_PasswordTooShort(t *testing.T) {
	router := newTestRouter(t, &testutil.MockQuerier{})

	w := postJSON(t, router, "/v1/auth/register", map[string]string{
		"email":    "user@example.com",
		"password": "short",
	})

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestRegisterHandler_MissingBody(t *testing.T) {
	router := newTestRouter(t, &testutil.MockQuerier{})

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", nil)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

// ─── Login Handler ────────────────────────────────────────────────────────────

func TestLoginHandler_Success(t *testing.T) {
	pass := "validpassword"
	hash, _ := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.MinCost)
	hashStr := string(hash)

	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, email string) (db.User, error) {
			return db.User{
				ID:           uuid.New(),
				Email:        email,
				PasswordHash: &hashStr,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}, nil
		},
	}
	router := newTestRouter(t, q)

	w := postJSON(t, router, "/v1/auth/login", map[string]string{
		"email":    "user@example.com",
		"password": pass,
	})

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]any
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp["access_token"] == nil || resp["access_token"] == "" {
		t.Error("missing access_token in response")
	}
	if resp["refresh_token"] == nil || resp["refresh_token"] == "" {
		t.Error("missing refresh_token in response")
	}
}

func TestLoginHandler_WrongPassword(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	hashStr := string(hash)

	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, email string) (db.User, error) {
			return db.User{ID: uuid.New(), Email: email, PasswordHash: &hashStr}, nil
		},
	}
	router := newTestRouter(t, q)

	w := postJSON(t, router, "/v1/auth/login", map[string]string{
		"email":    "user@example.com",
		"password": "wrong-password",
	})

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestLoginHandler_UserNotFound(t *testing.T) {
	q := &testutil.MockQuerier{
		GetUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{}, pgx.ErrNoRows
		},
	}
	router := newTestRouter(t, q)

	w := postJSON(t, router, "/v1/auth/login", map[string]string{
		"email":    "nobody@example.com",
		"password": "password123",
	})

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestLoginHandler_MissingPassword(t *testing.T) {
	router := newTestRouter(t, &testutil.MockQuerier{})

	w := postJSON(t, router, "/v1/auth/login", map[string]string{
		"email": "user@example.com",
		// password omitted
	})

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestLoginHandler_InvalidEmail(t *testing.T) {
	router := newTestRouter(t, &testutil.MockQuerier{})

	w := postJSON(t, router, "/v1/auth/login", map[string]string{
		"email":    "not-an-email",
		"password": "password123",
	})

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
