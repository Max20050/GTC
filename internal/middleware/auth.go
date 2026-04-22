package middleware

import (
	"crypto/rsa"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AuthUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func loadRSAPublicKey() *rsa.PublicKey {
	keyPEM := os.Getenv("JWT_PUBLIC_KEY")
	if keyPEM == "" {
		log.Fatal("JWT_PUBLIC_KEY environment variable is not set")
	}
	// Support \n as a literal escape sequence in env vars (common in .env files)
	keyPEM = strings.ReplaceAll(keyPEM, `\n`, "\n")

	pub, err := jwt.ParseRSAPublicKeyFromPEM([]byte(keyPEM))
	if err != nil {
		log.Fatalf("failed to parse JWT_PUBLIC_KEY: %v", err)
	}
	return pub
}

// Auth parses the RSA public key once at startup and returns a handler that
// verifies every incoming Bearer token was signed by the auth service's private key.
// An attacker cannot forge a valid token without access to that private key.
func Auth() gin.HandlerFunc {
	publicKey := loadRSAPublicKey()

	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Missing or invalid authorization header",
				"code":  "UNAUTHORIZED",
			})
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			// Reject any token not signed with an RSA algorithm (e.g. RS256).
			// This blocks the "alg: none" attack and HMAC confusion attacks.
			if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return publicKey, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
				"code":  "UNAUTHORIZED",
			})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token claims",
				"code":  "UNAUTHORIZED",
			})
			return
		}

		id, _ := claims["id"].(string)
		email, _ := claims["email"].(string)

		c.Set("user", AuthUser{ID: id, Email: email})
		c.Next()
	}
}
