package teams

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TeamRole string

const (
	RoleAdmin  TeamRole = "admin"
	RoleEditor TeamRole = "editor"
	RoleViewer TeamRole = "viewer"
)

type Team struct {
	ID          string       `gorm:"type:uuid;primaryKey"                                           json:"id"`
	OrgID       string       `gorm:"not null;index;uniqueIndex:idx_team_org_slug"                   json:"org_id"`
	Name        string       `gorm:"not null"                                                       json:"name"`
	Slug        string       `gorm:"not null;uniqueIndex:idx_team_org_slug"                         json:"slug"`
	Description *string      `                                                                      json:"description"`
	CreatedBy   string       `gorm:"not null"                                                       json:"created_by"`
	CreatedAt   time.Time    `                                                                      json:"created_at"`
	UpdatedAt   time.Time    `                                                                      json:"updated_at"`
	Members     []TeamMember `gorm:"foreignKey:TeamID;references:ID;constraint:OnDelete:CASCADE"   json:"-"`
}

func (t *Team) BeforeCreate(_ *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}

type TeamMember struct {
	ID       string    `gorm:"type:uuid;primaryKey"                    json:"id"`
	TeamID   string    `gorm:"not null;uniqueIndex:idx_team_member"    json:"team_id"`
	UserID   string    `gorm:"not null;uniqueIndex:idx_team_member"    json:"user_id"`
	Role     TeamRole  `gorm:"type:varchar(20);not null"              json:"role"`
	JoinedAt time.Time `gorm:"autoCreateTime"                         json:"joined_at"`
}

func (m *TeamMember) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type CreateTeamRequest struct {
	Name        string  `json:"name"        binding:"required"`
	Slug        string  `json:"slug"        binding:"required"`
	Description *string `json:"description"`
}

type UpdateTeamRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

type AddTeamMemberRequest struct {
	UserID string   `json:"user_id" binding:"required"`
	Role   TeamRole `json:"role"    binding:"required"`
}

type UpdateTeamMemberRoleRequest struct {
	Role TeamRole `json:"role" binding:"required"`
}
