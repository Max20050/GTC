package tokens

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Manager holds the RSA key pair used to sign and verify JWTs.
type Manager struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
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

	privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parsing RSA private key: %w", err)
	}

	return &Manager{
		privateKey: privateKey,
		publicKey:  &privateKey.PublicKey,
	}, nil
}

// GenerateKeyPair creates a new RSA key pair (useful for initial setup scripts).
func GenerateKeyPair(bits int) (*rsa.PrivateKey, error) {
	return rsa.GenerateKey(rand.Reader, bits)
}

// SignToken creates a signed RS256 JWT and returns the token string and its jti claim.
func (m *Manager) SignToken(userID string, expiry time.Duration) (tokenString, jti string, err error) {
	jti = uuid.New().String()

	claims := jwt.MapClaims{
		"sub": userID,
		"jti": jti,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(expiry).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tokenString, err = token.SignedString(m.privateKey)
	if err != nil {
		return "", "", fmt.Errorf("signing token: %w", err)
	}

	return tokenString, jti, nil
}

// PublicKey exposes the RSA public key for JWKS endpoint and middleware usage.
func (m *Manager) PublicKey() *rsa.PublicKey {
	return m.publicKey
}
