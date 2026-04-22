#!/usr/bin/env bash
# scripts/gen-keys.sh
# Generates a 2048-bit RSA key pair in ./keys/
# Run once before starting the service locally or in Docker.
set -euo pipefail

KEYS_DIR="$(cd "$(dirname "$0")/.." && pwd)/keys"
mkdir -p "$KEYS_DIR"

echo "[*] Generating RSA private key (2048 bit)..."
openssl genrsa -out "$KEYS_DIR/private.pem" 2048

echo "[*] Deriving RSA public key..."
openssl rsa -in "$KEYS_DIR/private.pem" -pubout -out "$KEYS_DIR/public.pem"

echo "[✓] Keys written to $KEYS_DIR/"
echo "    private.pem — keep secret, mount into the container"
echo "    public.pem  — can be distributed to other services"
