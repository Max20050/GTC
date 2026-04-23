package edge

// Protocol represents the communication protocol used on an edge.
type Protocol string

const (
	ProtocolHTTPREST   Protocol = "http-rest"
	ProtocolTCP        Protocol = "tcp"
	ProtocolMessageQueue Protocol = "message-queue"
	ProtocolDatabase   Protocol = "database"
	ProtocolWebSocket  Protocol = "websocket"
	ProtocolStreaming   Protocol = "streaming"
)

// HTTPConfig holds optional REST call metadata.
type HTTPConfig struct {
	Method          string            `json:"method,omitempty"           bson:"method,omitempty"`
	Headers         map[string]string `json:"headers,omitempty"          bson:"headers,omitempty"`
	Payload          any               `json:"payload,omitempty"           bson:"payload,omitempty"`
	ExpectedResponse any               `json:"expected_response,omitempty" bson:"expected_response,omitempty"`
}

// MessageQueueConfig holds optional pub/sub metadata.
type MessageQueueConfig struct {
	QueueName string `json:"queue_name,omitempty" bson:"queue_name,omitempty"`
	Action    string `json:"action,omitempty"    bson:"action,omitempty"` // "publish" | "consume"
}

// DatabaseConfig holds optional SQL metadata.
type DatabaseConfig struct {
	Query string `json:"query,omitempty" bson:"query,omitempty"`
}

// Edge represents a directed connection between two nodes. Protocol-specific
// details live in Config as a free-form map for extensibility.
type Edge struct {
	ID       string                 `json:"id"       bson:"id"`
	From     string                 `json:"from"     bson:"from"`
	To       string                 `json:"to"       bson:"to"`
	Label    string                 `json:"label,omitempty" bson:"label,omitempty"`
	Protocol Protocol               `json:"protocol" bson:"protocol"`
	Config   map[string]any `json:"config,omitempty" bson:"config,omitempty"`
}
