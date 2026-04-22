package boards

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OwnerType string

const (
	OwnerTypeUser OwnerType = "user"
	OwnerTypeTeam OwnerType = "team"
)

type Visibility string

const (
	VisibilityPrivate Visibility = "private"
	VisibilityTeam    Visibility = "team"
	VisibilityOrg     Visibility = "org"
	VisibilityPublic  Visibility = "public"
)

type Board struct {
	ID           string     `gorm:"type:uuid;primaryKey"           json:"id"`
	Name         string     `gorm:"not null"                       json:"name"`
	Description  *string    `                                      json:"description"`
	OwnerType    OwnerType  `gorm:"type:varchar(10);not null"      json:"owner_type"`
	OwnerID      string     `gorm:"not null;index"                 json:"owner_id"`
	Visibility   Visibility `gorm:"type:varchar(10);not null"      json:"visibility"`
	ThumbnailURL *string    `                                      json:"thumbnail_url"`
	CreatedBy    string     `gorm:"not null"                       json:"created_by"`
	CreatedAt    time.Time  `                                      json:"created_at"`
	UpdatedAt    time.Time  `                                      json:"updated_at"`
}

func (b *Board) BeforeCreate(_ *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}

type CreatePersonalBoardRequest struct {
	Name         string     `json:"name"          binding:"required"`
	Description  *string    `json:"description"`
	Visibility   Visibility `json:"visibility"    binding:"required"`
	ThumbnailURL *string    `json:"thumbnail_url"`
}

type CreateTeamBoardRequest struct {
	Name         string     `json:"name"          binding:"required"`
	Description  *string    `json:"description"`
	Visibility   Visibility `json:"visibility"    binding:"required"`
	ThumbnailURL *string    `json:"thumbnail_url"`
}

type UpdateBoardRequest struct {
	Name         *string     `json:"name"`
	Description  *string     `json:"description"`
	Visibility   *Visibility `json:"visibility"`
	ThumbnailURL *string     `json:"thumbnail_url"`
}
