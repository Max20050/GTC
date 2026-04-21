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
	ExpiresIn    int    `json:"expires_in"` // seconds
}

// OAuthUserInfo carries normalized data from any OAuth provider.
type OAuthUserInfo struct {
	Provider   string
	ProviderID string
	Email      string
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

func (s *Service) Register(ctx context.Context, email, password string) (*TokenPair, error) {
	_, err := s.queries.GetUserByEmail(ctx, email)
	if err == nil {
		return nil, ErrEmailAlreadyExists
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("checking email uniqueness: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hashing password: %w", err)
	}
	hashStr := string(hash)

	user, err := s.queries.CreateUser(ctx, db.CreateUserParams{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: &hashStr,
	})
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}

	return s.issueTokenPair(ctx, user.ID.String())
}

// ─── Login ───────────────────────────────────────────────────────────────────

func (s *Service) Login(ctx context.Context, email, password string) (*TokenPair, error) {
	user, err := s.queries.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("fetching user: %w", err)
	}

	// OAuth-only users have no local password
	if user.PasswordHash == nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.issueTokenPair(ctx, user.ID.String())
}

// ─── Logout ──────────────────────────────────────────────────────────────────

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

func (s *Service) Refresh(ctx context.Context, refreshToken string) (*TokenPair, error) {
	key := "refresh:" + refreshToken
	userID, err := s.rdb.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, ErrInvalidRefreshToken
		}
		return nil, fmt.Errorf("reading refresh token: %w", err)
	}

	// Rotate: delete old before issuing new (prevents token reuse)
	if err := s.rdb.Del(ctx, key).Err(); err != nil {
		return nil, fmt.Errorf("rotating refresh token: %w", err)
	}

	return s.issueTokenPair(ctx, userID)
}

// ─── GetCurrentUser ───────────────────────────────────────────────────────────

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

// ─── HandleOAuthCallback ─────────────────────────────────────────────────────

// HandleOAuthCallback finds or creates a user from an OAuth provider, then
// issues a token pair. It links the provider account to an existing user if
// the email matches, or creates a new password-less user.
func (s *Service) HandleOAuthCallback(ctx context.Context, info OAuthUserInfo) (*TokenPair, error) {
	// 1. Check if this OAuth account is already linked
	userID, err := s.queries.FindOAuthAccount(ctx, db.FindOAuthAccountParams{
		Provider:   info.Provider,
		ProviderID: info.ProviderID,
	})
	if err == nil {
		// Returning user — just issue tokens
		return s.issueTokenPair(ctx, userID.String())
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("finding oauth account: %w", err)
	}

	// 2. New OAuth account — find or create the user
	var uid uuid.UUID
	existingUser, err := s.queries.GetUserByEmail(ctx, info.Email)
	if err == nil {
		// Email exists — link this OAuth provider to the existing account
		uid = existingUser.ID
	} else if errors.Is(err, pgx.ErrNoRows) {
		// Brand-new user — create without a password (OAuth-only)
		newUser, err := s.queries.CreateUser(ctx, db.CreateUserParams{
			ID:           uuid.New(),
			Email:        info.Email,
			PasswordHash: nil, // no local password
		})
		if err != nil {
			return nil, fmt.Errorf("creating oauth user: %w", err)
		}
		uid = newUser.ID
	} else {
		return nil, fmt.Errorf("checking email for oauth: %w", err)
	}

	// 3. Persist the OAuth account link
	email := info.Email
	if err := s.queries.CreateOAuthAccount(ctx, db.CreateOAuthAccountParams{
		ID:         uuid.New(),
		UserID:     uid,
		Provider:   info.Provider,
		ProviderID: info.ProviderID,
		Email:      &email,
	}); err != nil {
		return nil, fmt.Errorf("creating oauth account link: %w", err)
	}

	return s.issueTokenPair(ctx, uid.String())
}

// ─── helpers ─────────────────────────────────────────────────────────────────

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
