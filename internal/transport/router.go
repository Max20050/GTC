package transport

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/Max20050/gtc-users-auth/internal/auth"
	"github.com/Max20050/gtc-users-auth/internal/middleware"
	db "github.com/Max20050/gtc-users-auth/internal/repository/db"
	"github.com/Max20050/gtc-users-auth/internal/transport/handlers"
	oauthpkg "github.com/Max20050/gtc-users-auth/pkg/oauth"
	"github.com/Max20050/gtc-users-auth/pkg/tokens"
)

// NewRouter wires all dependencies, routes, and middleware into a Gin engine.
func NewRouter(pool *pgxpool.Pool, rdb *redis.Client, tm *tokens.Manager) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Liveness probe
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ── Services ──────────────────────────────────────────────────────────
	queries := db.New(pool)
	authSvc := auth.NewService(
		queries,
		rdb,
		tm,
		parseDurationEnv("ACCESS_TOKEN_EXPIRY", 15*time.Minute),
		parseDurationEnv("REFRESH_TOKEN_EXPIRY", 7*24*time.Hour),
	)

	// ── Handlers ──────────────────────────────────────────────────────────
	authH := handlers.NewAuthHandler(authSvc, tm)

	// Build the callback URL dynamically from the PORT env var
	host := os.Getenv("PUBLIC_HOST")
	if host == "" {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		host = fmt.Sprintf("http://localhost:%s", port)
	}
	googleProvider := oauthpkg.NewGoogleProvider(host + "/v1/auth/oauth/google/callback")
	oauthH := handlers.NewOAuthHandler(authSvc, rdb, googleProvider)

	// ── Routes ────────────────────────────────────────────────────────────
	v1 := r.Group("/v1")
	{
		a := v1.Group("/auth")
		{
			// ── Public email/password ──────────────────────────────────
			a.POST("/register", authH.Register)
			a.POST("/login", authH.Login)
			a.POST("/refresh", authH.Refresh)
			a.GET("/.well-known/jwks.json", authH.JWKS)

			// ── Google OAuth ───────────────────────────────────────────
			a.GET("/oauth/google", oauthH.GoogleLogin)
			a.GET("/oauth/google/callback", oauthH.GoogleCallback)

			// ── Protected (valid JWT required) ─────────────────────────
			protected := a.Group("/")
			protected.Use(middleware.Auth(tm.PublicKey(), rdb))
			{
				protected.POST("/logout", authH.Logout)
				protected.GET("/me", authH.Me)
			}
		}
	}

	return r
}

// parseDurationEnv reads a duration from an env var with a fallback default.
func parseDurationEnv(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
