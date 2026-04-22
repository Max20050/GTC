package tokens

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"math/big"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Manager holds the RSA key pair used to sign and verify JWTs.
type Manager struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	kid        string
}

// NewManager loads an RSA private key from disk and derives the public key.
func NewManager(privateKeyPath string) (*Manager, error) {
	data, err := os.ReadFile(privateKeyPath)
	if err != nil {
		return nil, fmt.Errorf("reading private key file: %w", err)
	}

	block, _ := pem.Decode(data)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block from %s", privateKeyPath)
	}

	privateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parsing RSA private key: %w", err)
	}

	return &Manager{
		privateKey: privateKey.(*rsa.PrivateKey),
		publicKey:  &privateKey.(*rsa.PrivateKey).PublicKey,
		kid:        "auth-service-key-1",
	}, nil
}

// GenerateKeyPair creates a new RSA key pair (used by scripts/gen-keys.sh).
func GenerateKeyPair(bits int) (*rsa.PrivateKey, error) {
	return rsa.GenerateKey(rand.Reader, bits)
}

// SignToken creates a signed RS256 JWT. Returns the token string and its jti.
func (m *Manager) SignToken(userID string, expiry time.Duration) (tokenString, jti string, err error) {
	jti = uuid.New().String()
	now := time.Now()

	claims := jwt.MapClaims{
		"sub": userID,
		"jti": jti,
		"iat": now.Unix(),
		"exp": now.Add(expiry).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = m.kid

	tokenString, err = token.SignedString(m.privateKey)
	if err != nil {
		return "", "", fmt.Errorf("signing token: %w", err)
	}
	return tokenString, jti, nil
}

// ParseToken validates the token signature and returns its claims.
func (m *Manager) ParseToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return m.publicKey, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims type")
	}
	return claims, nil
}

// RemainingTTL returns the duration until the token's exp claim.
// Returns 0 if the token is already expired or the claim is missing.
func RemainingTTL(claims jwt.MapClaims) time.Duration {
	exp, ok := claims["exp"].(float64)
	if !ok {
		return 0
	}
	remaining := time.Until(time.Unix(int64(exp), 0))
	if remaining < 0 {
		return 0
	}
	return remaining
}

// PublicKey exposes the RSA public key for middleware and JWKS endpoint.
func (m *Manager) PublicKey() *rsa.PublicKey {
	return m.publicKey
}

// JWKS returns a JSON Web Key Set document containing the public key.
// Other services can call GET /v1/auth/.well-known/jwks.json to verify tokens.
func (m *Manager) JWKS() map[string]interface{} {
	return map[string]interface{}{
		"keys": []map[string]interface{}{
			{
				"kty": "RSA",
				"use": "sig",
				"alg": "RS256",
				"kid": m.kid,
				// base64url (no padding) encoded big-endian modulus and exponent
				"n": base64.RawURLEncoding.EncodeToString(m.publicKey.N.Bytes()),
				"e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(m.publicKey.E)).Bytes()),
			},
		},
	}
}
