package boards

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/Max20050/GTC-app-service/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r gin.IRouter) {
	personal := r.Group("/boards")
	personal.POST("", h.CreatePersonalBoard)
	personal.GET("", h.ListPersonalBoards)
	personal.GET("/:boardId", h.GetBoard)
	personal.PATCH("/:boardId", h.UpdateBoard)
	personal.DELETE("/:boardId", h.DeleteBoard)

	team := r.Group("/orgs/:orgId/teams/:teamId/boards")
	team.POST("", h.CreateTeamBoard)
	team.GET("", h.ListTeamBoards)
}

func (h *Handler) CreatePersonalBoard(c *gin.Context) {
	user := currentUser(c)
	var req CreatePersonalBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	board, err := h.service.CreatePersonalBoard(user.ID, req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, board)
}

func (h *Handler) ListPersonalBoards(c *gin.Context) {
	user := currentUser(c)
	boards, err := h.service.ListPersonalBoards(user.ID)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, boards)
}

func (h *Handler) GetBoard(c *gin.Context) {
	user := currentUser(c)
	board, err := h.service.GetBoard(user.ID, c.Param("boardId"))
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, board)
}

func (h *Handler) UpdateBoard(c *gin.Context) {
	user := currentUser(c)
	var req UpdateBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	board, err := h.service.UpdateBoard(user.ID, c.Param("boardId"), req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, board)
}

func (h *Handler) DeleteBoard(c *gin.Context) {
	user := currentUser(c)
	if err := h.service.DeleteBoard(user.ID, c.Param("boardId")); err != nil {
		handleErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) CreateTeamBoard(c *gin.Context) {
	user := currentUser(c)
	var req CreateTeamBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	board, err := h.service.CreateTeamBoard(user.ID, c.Param("orgId"), c.Param("teamId"), req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, board)
}

func (h *Handler) ListTeamBoards(c *gin.Context) {
	user := currentUser(c)
	boards, err := h.service.ListTeamBoards(user.ID, c.Param("orgId"), c.Param("teamId"))
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, boards)
}

func currentUser(c *gin.Context) middleware.AuthUser {
	return c.MustGet("user").(middleware.AuthUser)
}

func handleErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		middleware.NotFound(c)
	case errors.Is(err, ErrForbidden):
		middleware.Forbidden(c)
	default:
		middleware.InternalError(c)
	}
}
