package transport

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/Max20050/gtc-users-auth/internal/middleware"
	"github.com/Max20050/gtc-users-auth/pkg/tokens"
)

// NewRouter wires all routes and returns the configured Gin engine.
func NewRouter(pool *pgxpool.Pool, rdb *redis.Client, tm *tokens.Manager) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Health probe (unauthenticated)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	v1 := r.Group("/v1")
	{
		auth := v1.Group("/auth")
		{
			// Public endpoints
			auth.POST("/register", placeholder("register"))
			auth.POST("/login", placeholder("login"))
			auth.POST("/refresh", placeholder("refresh"))
			auth.GET("/.well-known/jwks.json", placeholder("jwks"))

			// Protected endpoints
			protected := auth.Group("/")
			protected.Use(middleware.Auth(tm.PublicKey(), rdb))
			{
				protected.POST("/logout", placeholder("logout"))
				protected.GET("/me", placeholder("me"))
			}
		}
	}

	return r
}

// placeholder returns a stub handler labelled with the route name.
// Replace each one with a real handler as implementation progresses.
func placeholder(name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"route": name, "status": "not implemented"})
	}
}
