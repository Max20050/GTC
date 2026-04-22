package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorBody struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

func RespondError(c *gin.Context, status int, message, code string) {
	c.JSON(status, ErrorBody{Error: message, Code: code})
}

func NotFound(c *gin.Context) {
	RespondError(c, http.StatusNotFound, "Resource not found", "NOT_FOUND")
}

func Forbidden(c *gin.Context) {
	RespondError(c, http.StatusForbidden, "You do not have permission to perform this action", "FORBIDDEN")
}

func Unauthorized(c *gin.Context) {
	RespondError(c, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
}

func Conflict(c *gin.Context, message string) {
	RespondError(c, http.StatusConflict, message, "CONFLICT")
}

func ValidationError(c *gin.Context, message string) {
	RespondError(c, http.StatusBadRequest, message, "VALIDATION_ERROR")
}

func InternalError(c *gin.Context) {
	RespondError(c, http.StatusInternalServerError, "Internal server error", "INTERNAL_ERROR")
}
