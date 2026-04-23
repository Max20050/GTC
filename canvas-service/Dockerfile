FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o canvas-service ./cmd/server

FROM alpine:3.19

WORKDIR /app
COPY --from=builder /app/canvas-service .

EXPOSE 8082

ENTRYPOINT ["./canvas-service"]
