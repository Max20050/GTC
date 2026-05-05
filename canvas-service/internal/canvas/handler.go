package canvas

import (
	"encoding/json"
	"net/http"
	"strings"

	"canvas-service/pkg/response"
)

// path layout after stripping /canvas/:
//   ""                              → POST /canvas/       (createCanvas)
//   "{id}"                          → GET/PUT/DELETE      (single canvas)
//   "{parentId}/nodes/{nodeId}/embed" → POST              (createEmbed)

type Handler struct {
	svc  *Service
	auth func(http.HandlerFunc) http.HandlerFunc
}

func NewHandler(svc *Service, auth func(http.HandlerFunc) http.HandlerFunc) *Handler {
	return &Handler{svc: svc, auth: auth}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", h.health)
	mux.HandleFunc("/canvas/", h.auth(h.routeCanvas))
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// routeCanvas dispatches /canvas/... to the appropriate method handler.
func (h *Handler) routeCanvas(w http.ResponseWriter, r *http.Request) {
	tail := strings.TrimPrefix(r.URL.Path, "/canvas/")

	if tail == "" {
		if r.Method == http.MethodPost {
			h.createCanvas(w, r)
			return
		}
		response.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	// /canvas/{parentId}/nodes/{nodeId}/embed
	parts := strings.Split(tail, "/")
	if len(parts) == 4 && parts[1] == "nodes" && parts[3] == "embed" {
		if r.Method != http.MethodPost {
			response.Error(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		h.createEmbed(w, r, parts[0], parts[2])
		return
	}

	canvasID := tail
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

func (h *Handler) createEmbed(w http.ResponseWriter, r *http.Request, parentID, nodeID string) {
	embedded, err := h.svc.CreateEmbed(parentID, nodeID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, embedded)
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
