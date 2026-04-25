package middleware

import (
	"canvas-service/pkg/response"
	"context"
	"crypto/rsa"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const ClaimsKey contextKey = "claims"

// Require returns a middleware that validates a Bearer JWT signed with the
// provided RSA public key. On success it stores the parsed claims in context.
func Require(pubKey *rsa.PublicKey) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			token, err := extractAndVerify(r, pubKey)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, err.Error())
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				response.Error(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next(w, r.WithContext(ctx))
		}
	}
}

func extractAndVerify(r *http.Request, pubKey *rsa.PublicKey) (*jwt.Token, error) {
	authHeader := r.Header.Get("Authorization")
	raw := strings.TrimPrefix(authHeader, "Bearer ")
	if raw == authHeader || raw == "" {
		return nil, jwt.ErrTokenMalformed
	}

	return jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return pubKey, nil
	}, jwt.WithValidMethods([]string{"RS256"}))
}
