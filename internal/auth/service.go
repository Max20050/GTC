package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	db "github.com/Max20050/gtc-users-auth/internal/repository/db"
	"github.com/Max20050/gtc-users-auth/pkg/tokens"
)

// Sentinel errors — handlers map these to specific HTTP status codes.
var (
	ErrEmailAlreadyExists  = errors.New("email already in use")
	ErrInvalidCredentials  = errors.New("invalid email or password")
	ErrInvalidRefreshToken = errors.New("invalid or expired refresh token")
	ErrUserNotFound        = errors.New("user not found")
)

// TokenPair is returned on every successful auth operation.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"` // access token TTL in seconds
}

// Service handles all authentication business logic.
type Service struct {
	queries       db.Querier
	rdb           *redis.Client
	tm            *tokens.Manager
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

// NewService constructs a ready-to-use Service.
func NewService(
	queries db.Querier,
	rdb *redis.Client,
	tm *tokens.Manager,
	accessExpiry time.Duration,
	refreshExpiry time.Duration,
) *Service {
	return &Service{
		queries:       queries,
		rdb:           rdb,
		tm:            tm,
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
	}
}

// ─── Register ────────────────────────────────────────────────────────────────

// Register creates a new user and returns a token pair.
func (s *Service) Register(ctx context.Context, email, password string) (*TokenPair, error) {
	// 1. Check uniqueness
	_, err := s.queries.GetUserByEmail(ctx, email)
	if err == nil {
		return nil, ErrEmailAlreadyExists
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("checking email uniqueness: %w", err)
	}

	// 2. Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hashing password: %w", err)
	}

	// 3. Persist user
	user, err := s.queries.CreateUser(ctx, db.CreateUserParams{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(hash),
	})
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}

	return s.issueTokenPair(ctx, user.ID.String())
}

// ─── Login ───────────────────────────────────────────────────────────────────

// Login verifies credentials and returns a token pair.
func (s *Service) Login(ctx context.Context, email, password string) (*TokenPair, error) {
	user, err := s.queries.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("fetching user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.issueTokenPair(ctx, user.ID.String())
}

// ─── Logout ──────────────────────────────────────────────────────────────────

// Logout blacklists the access token jti and revokes the refresh token.
func (s *Service) Logout(ctx context.Context, jti string, accessTTL time.Duration, refreshToken string) error {
	pipe := s.rdb.Pipeline()

	if accessTTL > 0 {
		pipe.Set(ctx, "blacklist:"+jti, "1", accessTTL)
	}
	if refreshToken != "" {
		pipe.Del(ctx, "refresh:"+refreshToken)
	}

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("revoking tokens: %w", err)
	}
	return nil
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

// Refresh validates a refresh token, rotates it, and issues a new token pair.
func (s *Service) Refresh(ctx context.Context, refreshToken string) (*TokenPair, error) {
	key := "refresh:" + refreshToken

	userID, err := s.rdb.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, ErrInvalidRefreshToken
		}
		return nil, fmt.Errorf("reading refresh token: %w", err)
	}

	// Rotate: delete old token before issuing new pair (prevents token reuse)
	if err := s.rdb.Del(ctx, key).Err(); err != nil {
		return nil, fmt.Errorf("rotating refresh token: %w", err)
	}

	return s.issueTokenPair(ctx, userID)
}

// ─── GetCurrentUser ───────────────────────────────────────────────────────────

// GetCurrentUser returns public profile data for the given user UUID string.
func (s *Service) GetCurrentUser(ctx context.Context, userID string) (*db.GetUserByIDRow, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID format: %w", err)
	}

	user, err := s.queries.GetUserByID(ctx, uid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("fetching user: %w", err)
	}

	return &user, nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// issueTokenPair signs an access token and stores a refresh token in Redis.
func (s *Service) issueTokenPair(ctx context.Context, userID string) (*TokenPair, error) {
	accessToken, _, err := s.tm.SignToken(userID, s.accessExpiry)
	if err != nil {
		return nil, fmt.Errorf("signing access token: %w", err)
	}

	refreshToken := uuid.New().String()
	if err := s.rdb.Set(ctx, "refresh:"+refreshToken, userID, s.refreshExpiry).Err(); err != nil {
		return nil, fmt.Errorf("storing refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(s.accessExpiry.Seconds()),
	}, nil
}
