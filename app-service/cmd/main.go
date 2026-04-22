package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/Max20050/GTC-app-service/internal/boards"
	"github.com/Max20050/GTC-app-service/internal/middleware"
	"github.com/Max20050/GTC-app-service/internal/orgs"
	"github.com/Max20050/GTC-app-service/internal/teams"
	"github.com/Max20050/GTC-app-service/pkg/db"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading environment variables directly")
	}

	database := db.Connect()

	if err := database.AutoMigrate(
		&orgs.Organization{},
		&orgs.OrgMember{},
		&teams.Team{},
		&teams.TeamMember{},
		&boards.Board{},
	); err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}

	orgRepo := orgs.NewRepository(database)
	teamRepo := teams.NewRepository(database)
	boardRepo := boards.NewRepository(database)

	orgService := orgs.NewService(orgRepo)
	teamService := teams.NewService(teamRepo, orgRepo)
	boardService := boards.NewService(boardRepo, orgRepo, teamRepo)

	orgHandler := orgs.NewHandler(orgService)
	teamHandler := teams.NewHandler(teamService)
	boardHandler := boards.NewHandler(boardService)

	r := gin.Default()

	api := r.Group("/")
	api.Use(middleware.Auth())

	orgHandler.RegisterRoutes(api)
	teamHandler.RegisterRoutes(api)
	boardHandler.RegisterRoutes(api)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3002"
	}

	log.Printf("Workspace service listening on :%s", port)
	if err := r.Run(fmt.Sprintf(":%s", port)); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
