# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Cache dependency downloads separately from source changes
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/workspace-service ./cmd/main.go

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM alpine:3.20

# ca-certificates needed for TLS connections (e.g. managed Postgres)
RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /bin/workspace-service .

# keys/ directory — mount public.pem here at runtime (never baked into image)
RUN mkdir keys

EXPOSE 3002

ENTRYPOINT ["./workspace-service"]
