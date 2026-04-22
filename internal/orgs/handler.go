package orgs

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
	g := r.Group("/orgs")
	g.POST("", h.CreateOrg)
	g.GET("/:orgId", h.GetOrg)
	g.PATCH("/:orgId", h.UpdateOrg)
	g.DELETE("/:orgId", h.DeleteOrg)
	g.GET("/:orgId/members", h.ListMembers)
	g.POST("/:orgId/members", h.InviteMember)
	g.PATCH("/:orgId/members/:userId", h.UpdateMemberRole)
	g.DELETE("/:orgId/members/:userId", h.RemoveMember)
}

func (h *Handler) CreateOrg(c *gin.Context) {
	user := currentUser(c)
	var req CreateOrgRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	org, err := h.service.CreateOrg(user.ID, req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, org)
}

func (h *Handler) GetOrg(c *gin.Context) {
	org, err := h.service.GetOrg(c.Param("orgId"))
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, org)
}

func (h *Handler) UpdateOrg(c *gin.Context) {
	user := currentUser(c)
	var req UpdateOrgRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	org, err := h.service.UpdateOrg(user.ID, c.Param("orgId"), req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, org)
}

func (h *Handler) DeleteOrg(c *gin.Context) {
	user := currentUser(c)
	if err := h.service.DeleteOrg(user.ID, c.Param("orgId")); err != nil {
		handleErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) ListMembers(c *gin.Context) {
	user := currentUser(c)
	members, err := h.service.ListMembers(user.ID, c.Param("orgId"))
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, members)
}

func (h *Handler) InviteMember(c *gin.Context) {
	user := currentUser(c)
	var req InviteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	member, err := h.service.InviteMember(user.ID, c.Param("orgId"), req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, member)
}

func (h *Handler) UpdateMemberRole(c *gin.Context) {
	user := currentUser(c)
	var req UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, err.Error())
		return
	}
	member, err := h.service.UpdateMemberRole(user.ID, c.Param("orgId"), c.Param("userId"), req)
	if err != nil {
		handleErr(c, err)
		return
	}
	c.JSON(http.StatusOK, member)
}

func (h *Handler) RemoveMember(c *gin.Context) {
	user := currentUser(c)
	if err := h.service.RemoveMember(user.ID, c.Param("orgId"), c.Param("userId")); err != nil {
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
