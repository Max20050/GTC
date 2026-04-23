package canvas

import (
	"encoding/json"
	"net/http"
	"strings"

	"canvas-service/pkg/response"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", h.health)
	mux.HandleFunc("/canvas/", h.routeCanvas)
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// routeCanvas dispatches /canvas/{canvas_id} to the appropriate method handler.
func (h *Handler) routeCanvas(w http.ResponseWriter, r *http.Request) {
	canvasID := strings.TrimPrefix(r.URL.Path, "/canvas/")
	if canvasID == "" {
		if r.Method == http.MethodPost {
			h.createCanvas(w, r)
			return
		}
		response.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getCanvas(w, r, canvasID)
	case http.MethodPut:
		h.updateCanvas(w, r, canvasID)
	case http.MethodDelete:
		h.deleteCanvas(w, r, canvasID)
	default:
		response.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) createCanvas(w http.ResponseWriter, r *http.Request) {
	var c Canvas
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.SaveCanvas(&c); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, c)
}

func (h *Handler) getCanvas(w http.ResponseWriter, r *http.Request, canvasID string) {
	c, err := h.svc.GetCanvas(canvasID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if c == nil {
		response.Error(w, http.StatusNotFound, "canvas not found")
		return
	}
	response.JSON(w, http.StatusOK, c)
}

func (h *Handler) updateCanvas(w http.ResponseWriter, r *http.Request, canvasID string) {
	var c Canvas
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	c.CanvasID = canvasID
	if err := h.svc.SaveCanvas(&c); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, c)
}

func (h *Handler) deleteCanvas(w http.ResponseWriter, r *http.Request, canvasID string) {
	if err := h.svc.DeleteCanvas(canvasID); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"deleted": canvasID})
}
