package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Max20050/gtc-users-auth/internal/auth"
	"github.com/Max20050/gtc-users-auth/pkg/tokens"
)

// AuthHandler exposes HTTP handlers for all auth routes.
type AuthHandler struct {
	svc *auth.Service
	tm  *tokens.Manager
}

// NewAuthHandler constructs an AuthHandler.
func NewAuthHandler(svc *auth.Service, tm *tokens.Manager) *AuthHandler {
	return &AuthHandler{svc: svc, tm: tm}
}

// ─── Request / Response types ─────────────────────────────────────────────────

type registerRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type loginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token"` // optional but recommended
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// Register godoc
// POST /v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pair, err := h.svc.Register(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrEmailAlreadyExists):
			c.JSON(http.StatusConflict, gin.H{"error": "email already in use"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create user"})
		}
		return
	}

	c.JSON(http.StatusCreated, pair)
}

// Login godoc
// POST /v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pair, err := h.svc.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrInvalidCredentials):
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not authenticate"})
		}
		return
	}

	c.JSON(http.StatusOK, pair)
}

// Logout godoc
// POST /v1/auth/logout  [protected]
func (h *AuthHandler) Logout(c *gin.Context) {
	var req logoutRequest
	_ = c.ShouldBindJSON(&req) // refresh_token is optional

	jti, _ := c.Get("jti")
	exp, _ := c.Get("exp")

	// Compute remaining TTL of the access token for the blacklist entry
	var accessTTL time.Duration
	if expFloat, ok := exp.(float64); ok {
		if remaining := time.Until(time.Unix(int64(expFloat), 0)); remaining > 0 {
			accessTTL = remaining
		}
	}

	if err := h.svc.Logout(c.Request.Context(), jti.(string), accessTTL, req.RefreshToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "logout failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}

// Refresh godoc
// POST /v1/auth/refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pair, err := h.svc.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrInvalidRefreshToken):
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired refresh token"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not refresh token"})
		}
		return
	}

	c.JSON(http.StatusOK, pair)
}

// Me godoc
// GET /v1/auth/me  [protected]
func (h *AuthHandler) Me(c *gin.Context) {
	userIDRaw, _ := c.Get("user_id")
	userID, ok := userIDRaw.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "could not identify user"})
		return
	}

	user, err := h.svc.GetCurrentUser(c.Request.Context(), userID)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch user"})
		}
		return
	}

	c.JSON(http.StatusOK, user)
}

// JWKS godoc
// GET /v1/auth/.well-known/jwks.json
func (h *AuthHandler) JWKS(c *gin.Context) {
	c.JSON(http.StatusOK, h.tm.JWKS())
}
