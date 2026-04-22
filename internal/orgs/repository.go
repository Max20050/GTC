package orgs

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(org *Organization) error {
	return r.db.Create(org).Error
}

func (r *Repository) FindByID(id string) (*Organization, error) {
	var org Organization
	err := r.db.First(&org, "id = ?", id).Error
	return &org, err
}

func (r *Repository) FindBySlug(slug string) (*Organization, error) {
	var org Organization
	err := r.db.First(&org, "slug = ?", slug).Error
	return &org, err
}

func (r *Repository) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&Organization{}).Where("id = ?", id).Updates(updates).Error
}

func (r *Repository) Delete(id string) error {
	return r.db.Delete(&Organization{}, "id = ?", id).Error
}

func (r *Repository) ListMembers(orgID string) ([]OrgMember, error) {
	var members []OrgMember
	err := r.db.Where("org_id = ?", orgID).Find(&members).Error
	return members, err
}

func (r *Repository) FindMember(orgID, userID string) (*OrgMember, error) {
	var member OrgMember
	err := r.db.First(&member, "org_id = ? AND user_id = ?", orgID, userID).Error
	return &member, err
}

func (r *Repository) CreateMember(member *OrgMember) error {
	return r.db.Create(member).Error
}

func (r *Repository) UpdateMemberRole(orgID, userID string, role OrgRole) error {
	return r.db.Model(&OrgMember{}).
		Where("org_id = ? AND user_id = ?", orgID, userID).
		Update("role", role).Error
}

func (r *Repository) DeleteMember(orgID, userID string) error {
	return r.db.Delete(&OrgMember{}, "org_id = ? AND user_id = ?", orgID, userID).Error
}

// GetOrgRole satisfies the OrgMemberChecker interface consumed by teams and boards.
func (r *Repository) GetOrgRole(orgID, userID string) (string, error) {
	member, err := r.FindMember(orgID, userID)
	if err != nil {
		return "", err
	}
	return string(member.Role), nil
}
