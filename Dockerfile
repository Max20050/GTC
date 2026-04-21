# =============================================================================
# Stage 1 – Build
# =============================================================================
FROM golang:1.23-alpine AS builder

# Build-time dependencies
RUN apk --no-cache add ca-certificates git

WORKDIR /app

# Layer cache: download deps before copying source
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build a statically-linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o bin/auth-service ./cmd/server

# =============================================================================
# Stage 2 – Runtime
# =============================================================================
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/bin/auth-service .

# keys/ dir will be mounted via docker-compose volume
RUN mkdir -p keys && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./auth-service"]
