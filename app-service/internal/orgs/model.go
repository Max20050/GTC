package orgs

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrgPlan string

const (
	PlanFree       OrgPlan = "free"
	PlanPro        OrgPlan = "pro"
	PlanEnterprise OrgPlan = "enterprise"
)

type OrgRole string

const (
	RoleOwner  OrgRole = "owner"
	RoleAdmin  OrgRole = "admin"
	RoleMember OrgRole = "member"
)

type Organization struct {
	ID        string      `gorm:"type:uuid;primaryKey"                                          json:"id"`
	Name      string      `gorm:"not null"                                                      json:"name"`
	Slug      string      `gorm:"uniqueIndex;not null"                                          json:"slug"`
	LogoURL   *string     `                                                                     json:"logo_url"`
	OwnerID   string      `gorm:"not null"                                                      json:"owner_id"`
	Plan      OrgPlan     `gorm:"type:varchar(20);not null;default:'free'"                      json:"plan"`
	CreatedAt time.Time   `                                                                     json:"created_at"`
	UpdatedAt time.Time   `                                                                     json:"updated_at"`
	Members   []OrgMember `gorm:"foreignKey:OrgID;references:ID;constraint:OnDelete:CASCADE"   json:"-"`
}

func (o *Organization) BeforeCreate(_ *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.NewString()
	}
	return nil
}

type OrgMember struct {
	ID       string    `gorm:"type:uuid;primaryKey"                  json:"id"`
	OrgID    string    `gorm:"not null;uniqueIndex:idx_org_member"   json:"org_id"`
	UserID   string    `gorm:"not null;uniqueIndex:idx_org_member"   json:"user_id"`
	Role     OrgRole   `gorm:"type:varchar(20);not null"             json:"role"`
	JoinedAt time.Time `gorm:"autoCreateTime"                        json:"joined_at"`
}

func (m *OrgMember) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type CreateOrgRequest struct {
	Name    string  `json:"name"     binding:"required"`
	Slug    string  `json:"slug"     binding:"required"`
	LogoURL *string `json:"logo_url"`
	Plan    OrgPlan `json:"plan"`
}

type UpdateOrgRequest struct {
	Name    *string  `json:"name"`
	LogoURL *string  `json:"logo_url"`
	Plan    *OrgPlan `json:"plan"`
}

type InviteMemberRequest struct {
	UserID string  `json:"user_id" binding:"required"`
	Role   OrgRole `json:"role"    binding:"required"`
}

type UpdateMemberRoleRequest struct {
	Role OrgRole `json:"role" binding:"required"`
}
