package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/oauth2"

	"github.com/Max20050/gtc-users-auth/internal/auth"
	oauthpkg "github.com/Max20050/gtc-users-auth/pkg/oauth"
)

const oauthStateTTL = 10 * time.Minute

// OAuthHandler exposes the OAuth2 initiation and callback endpoints.
type OAuthHandler struct {
	authSvc *auth.Service
	rdb     *redis.Client
	google  *oauthpkg.GoogleProvider
}

// NewOAuthHandler constructs an OAuthHandler.
func NewOAuthHandler(authSvc *auth.Service, rdb *redis.Client, google *oauthpkg.GoogleProvider) *OAuthHandler {
	return &OAuthHandler{authSvc: authSvc, rdb: rdb, google: google}
}

// ─── Google ───────────────────────────────────────────────────────────────────

// GoogleLogin godoc
// GET /v1/auth/oauth/google?redirect_uri=<optional>
//
// Redirects the browser to Google's consent screen.
// An optional redirect_uri query param is stored alongside the state so the
// callback can forward tokens to the frontend after login.
func (h *OAuthHandler) GoogleLogin(c *gin.Context) {
	state := uuid.New().String()
	redirectURI := c.Query("redirect_uri") // may be empty

	ctx := c.Request.Context()
	if err := h.rdb.Set(ctx, oauthStateKey(state), redirectURI, oauthStateTTL).Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not initiate oauth flow"})
		return
	}

	authURL := h.google.Config.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// GoogleCallback godoc
// GET /v1/auth/oauth/google/callback?code=...&state=...
//
// Google redirects here after the user grants consent.
// On success, tokens are either returned as JSON or the browser is redirected
// to redirect_uri?access_token=...&refresh_token=... if one was provided.
func (h *OAuthHandler) GoogleCallback(c *gin.Context) {
	ctx := c.Request.Context()

	// Provider-level error (e.g. user denied consent)
	if errParam := c.Query("error"); errParam != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("google oauth error: %s", errParam)})
		return
	}

	state := c.Query("state")
	code := c.Query("code")

	if state == "" || code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing state or code"})
		return
	}

	// Validate state and retrieve the optional redirect_uri atomically
	redirectURI, err := h.rdb.GetDel(ctx, oauthStateKey(state)).Result()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired oauth state"})
		return
	}

	// Exchange authorization code for OAuth tokens
	oauthToken, err := h.google.Config.Exchange(ctx, code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code exchange failed"})
		return
	}

	// Fetch user profile from Google
	userInfo, err := h.google.GetUserInfo(ctx, oauthToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch google profile"})
		return
	}

	// Find or create user + issue our own JWT pair
	pair, err := h.authSvc.HandleOAuthCallback(ctx, auth.OAuthUserInfo{
		Provider:   "google",
		ProviderID: userInfo.Sub,
		Email:      userInfo.Email,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "oauth login failed"})
		return
	}

	// Deliver tokens: redirect if a frontend URI was provided, else JSON
	if redirectURI != "" {
		params := url.Values{}
		params.Set("access_token", pair.AccessToken)
		params.Set("refresh_token", pair.RefreshToken)
		params.Set("token_type", pair.TokenType)
		params.Set("expires_in", fmt.Sprintf("%d", pair.ExpiresIn))
		c.Redirect(http.StatusTemporaryRedirect, redirectURI+"?"+params.Encode())
		return
	}

	c.JSON(http.StatusOK, pair)
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func oauthStateKey(state string) string {
	return "oauth_state:" + state
}
