package canvas

import (
	"canvas-service/internal/edge"
	"canvas-service/internal/node"
)

// Canvas is stored as a single MongoDB document per project board.
type Canvas struct {
	CanvasID string      `json:"canvas_id" bson:"canvas_id"`
	Nodes    []node.Node `json:"nodes"     bson:"nodes"`
	Edges    []edge.Edge `json:"edges"     bson:"edges"`
}
