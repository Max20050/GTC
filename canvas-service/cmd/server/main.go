package main

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"canvas-service/internal/canvas"
	"canvas-service/internal/config"
	"canvas-service/internal/db"
	"canvas-service/internal/middleware"
)

func main() {
	cfg := config.Load()

	pubKey := loadPublicKey(cfg.PublicKeyPath)

	mongoClient, err := db.Connect(cfg.MongoURI)
	if err != nil {
		log.Fatalf("failed to connect to MongoDB: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		mongoClient.Disconnect(ctx)
	}()

	database := mongoClient.Database(cfg.DatabaseName)
	canvasRepo := canvas.NewRepository(database)
	canvasService := canvas.NewService(canvasRepo)
	canvasHandler := canvas.NewHandler(canvasService, middleware.Require(pubKey))

	mux := http.NewServeMux()
	canvasHandler.RegisterRoutes(mux)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("canvas-service listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	log.Println("canvas-service stopped")
}

func loadPublicKey(path string) *rsa.PublicKey {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("failed to read public key at %s: %v", path, err)
	}

	block, _ := pem.Decode(data)
	if block == nil {
		log.Fatalf("failed to decode PEM block from %s", path)
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		log.Fatalf("failed to parse public key: %v", err)
	}

	rsaKey, ok := pub.(*rsa.PublicKey)
	if !ok {
		log.Fatalf("key at %s is not an RSA public key", path)
	}

	return rsaKey
}
