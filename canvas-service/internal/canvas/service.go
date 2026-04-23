package canvas

import "errors"

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
