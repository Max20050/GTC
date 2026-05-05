package canvas

import (
	"errors"

	"canvas-service/internal/edge"
	"canvas-service/internal/node"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetCanvas(canvasID string) (*Canvas, error) {
	if canvasID == "" {
		return nil, errors.New("canvas_id is required")
	}
	return s.repo.FindByID(canvasID)
}

func (s *Service) SaveCanvas(c *Canvas) error {
	if c.CanvasID == "" {
		return errors.New("canvas_id is required")
	}
	return s.repo.Upsert(c)
}

func (s *Service) DeleteCanvas(canvasID string) error {
	if canvasID == "" {
		return errors.New("canvas_id is required")
	}
	return s.repo.Delete(canvasID)
}

// CreateEmbed ensures an embedded canvas exists for the given node on the parent
// canvas, marks that node with _hasEmbedded=true in the parent, and returns the
// embedded canvas document.
func (s *Service) CreateEmbed(parentID, nodeID string) (*Canvas, error) {
	if parentID == "" || nodeID == "" {
		return nil, errors.New("parent_id and node_id are required")
	}

	parent, err := s.repo.FindByID(parentID)
	if err != nil {
		return nil, err
	}
	if parent != nil {
		for i := range parent.Nodes {
			if parent.Nodes[i].ID == nodeID {
				if parent.Nodes[i].Config == nil {
					parent.Nodes[i].Config = make(map[string]any)
				}
				parent.Nodes[i].Config["_hasEmbedded"] = true
				break
			}
		}
		if err := s.repo.Upsert(parent); err != nil {
			return nil, err
		}
	}

	embeddedID := parentID + ":" + nodeID
	embedded, err := s.repo.FindByID(embeddedID)
	if err != nil {
		return nil, err
	}
	if embedded == nil {
		embedded = &Canvas{
			CanvasID: embeddedID,
			Nodes:    []node.Node{},
			Edges:    []edge.Edge{},
		}
		if err := s.repo.Upsert(embedded); err != nil {
			return nil, err
		}
	}

	return embedded, nil
}
