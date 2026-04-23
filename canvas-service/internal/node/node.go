package node

// Type represents the category of a node in the canvas.
type Type string

const (
	TypeMicroservice    Type = "microservice"
	TypeDatabase        Type = "database"
	TypeQueue           Type = "queue"
	TypeCache           Type = "cache"
	TypeAWSService      Type = "aws-service"
	TypeGoogleService   Type = "google-service"
	TypeAIModelProvider Type = "ai-model-provider"
	TypeServerless      Type = "serverless"
)

type Position struct {
	X float64 `json:"x" bson:"x"`
	Y float64 `json:"y" bson:"y"`
}

// Node is a single element on the canvas. Config holds type-specific fields
// as a free-form map so new node types can be added without schema changes.
type Node struct {
	ID       string                 `json:"id"       bson:"id"`
	Type     Type                   `json:"type"     bson:"type"`
	Label    string                 `json:"label"    bson:"label"`
	Position Position               `json:"position" bson:"position"`
	Config   map[string]any `json:"config"   bson:"config"`
}
