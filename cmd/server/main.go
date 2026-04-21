package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/Max20050/gtc-users-auth/pkg/cache"
	"github.com/Max20050/gtc-users-auth/pkg/database"
	"github.com/Max20050/gtc-users-auth/pkg/tokens"
	"github.com/Max20050/gtc-users-auth/internal/transport"
)

func main() {
	ctx := context.Background()

	// --- Database ---
	pool, err := database.NewPool(ctx)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	// --- Redis ---
	rdb, err := cache.NewClient(ctx)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer rdb.Close()

	// --- Token manager ---
	privateKeyPath := os.Getenv("PRIVATE_KEY_PATH")
	if privateKeyPath == "" {
		privateKeyPath = "./keys/private.pem"
	}
	tokenManager, err := tokens.NewManager(privateKeyPath)
	if err != nil {
		log.Fatalf("tokens: %v", err)
	}

	// --- Router ---
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := transport.NewRouter(pool, rdb, tokenManager)

	// --- HTTP server ---
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	go func() {
		log.Printf("auth-service listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	// --- Graceful shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("graceful shutdown failed: %v", err)
	}
	log.Println("server stopped")
}
