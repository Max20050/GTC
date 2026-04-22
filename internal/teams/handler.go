package teams

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
	g := r.Group("/orgs/:orgId/teams")
	g.POST("", h.CreateTeam)
	g.GET("", h.ListTeams)
	g.GET("/:teamId", h.GetTeam)
	g.PATCH("/:teamId", h.UpdateTeam)
	g.DELETE("/:teamId", h.DeleteTeam)
	g.GET("/:teamId/members", h.ListTeamMembers)
	g.POST("/:teamId/members", h.AddTeamMember)
	g.PATCH("/:teamId/members/:userId", h.UpdateTeamMemberRole)
	g.DELETE("/:teamId/members/:userId", h.RemoveTeamMember)
}

func (h *Handler) CreateTeam(c *gin.Context) {
	user := currentUser(c)
	var req CreateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	team, err := h.service.CreateTeam(user.ID, c.Param("orgId"), req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, team)
}

func (h *Handler) ListTeams(c *gin.Context) {
	teams, err := h.service.ListTeams(c.Param("orgId"))
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, teams)
}

func (h *Handler) GetTeam(c *gin.Context) {
	team, err := h.service.GetTeam(c.Param("orgId"), c.Param("teamId"))
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, team)
}

func (h *Handler) UpdateTeam(c *gin.Context) {
	user := currentUser(c)
	var req UpdateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	team, err := h.service.UpdateTeam(user.ID, c.Param("orgId"), c.Param("teamId"), req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, team)
}

func (h *Handler) DeleteTeam(c *gin.Context) {
	user := currentUser(c)
	if err := h.service.DeleteTeam(user.ID, c.Param("orgId"), c.Param("teamId")); err != nil {
		handleErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) ListTeamMembers(c *gin.Context) {
	user := currentUser(c)
	members, err := h.service.ListTeamMembers(user.ID, c.Param("orgId"), c.Param("teamId"))
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, members)
}

func (h *Handler) AddTeamMember(c *gin.Context) {
	user := currentUser(c)
	var req AddTeamMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	member, err := h.service.AddTeamMember(user.ID, c.Param("orgId"), c.Param("teamId"), req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, member)
}

func (h *Handler) UpdateTeamMemberRole(c *gin.Context) {
	user := currentUser(c)
	var req UpdateTeamMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	member, err := h.service.UpdateTeamMemberRole(user.ID, c.Param("orgId"), c.Param("teamId"), c.Param("userId"), req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, member)
}

func (h *Handler) RemoveTeamMember(c *gin.Context) {
	user := currentUser(c)
	if err := h.service.RemoveTeamMember(user.ID, c.Param("orgId"), c.Param("teamId"), c.Param("userId")); err != nil {
		handleErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
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
	case errors.Is(err, ErrConflict):
		middleware.Conflict(c, err.Error())
	case errors.Is(err, ErrBadRequest):
		middleware.ValidationError(c, err.Error())
	default:
		middleware.InternalError(c)
	}
}
