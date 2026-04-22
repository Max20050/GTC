package teams

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(team *Team) error {
	return r.db.Create(team).Error
}

func (r *Repository) FindByID(id string) (*Team, error) {
	var team Team
	err := r.db.First(&team, "id = ?", id).Error
	return &team, err
}

func (r *Repository) FindBySlug(orgID, slug string) (*Team, error) {
	var team Team
	err := r.db.First(&team, "org_id = ? AND slug = ?", orgID, slug).Error
	return &team, err
}

func (r *Repository) ListByOrg(orgID string) ([]Team, error) {
	var teams []Team
	err := r.db.Where("org_id = ?", orgID).Find(&teams).Error
	return teams, err
}

func (r *Repository) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&Team{}).Where("id = ?", id).Updates(updates).Error
}

func (r *Repository) Delete(id string) error {
	return r.db.Delete(&Team{}, "id = ?", id).Error
}

func (r *Repository) ListMembers(teamID string) ([]TeamMember, error) {
	var members []TeamMember
	err := r.db.Where("team_id = ?", teamID).Find(&members).Error
	return members, err
}

func (r *Repository) FindMember(teamID, userID string) (*TeamMember, error) {
	var member TeamMember
	err := r.db.First(&member, "team_id = ? AND user_id = ?", teamID, userID).Error
	return &member, err
}

func (r *Repository) CreateMember(member *TeamMember) error {
	return r.db.Create(member).Error
}

func (r *Repository) UpdateMemberRole(teamID, userID string, role TeamRole) error {
	return r.db.Model(&TeamMember{}).
		Where("team_id = ? AND user_id = ?", teamID, userID).
		Update("role", role).Error
}

func (r *Repository) DeleteMember(teamID, userID string) error {
	return r.db.Delete(&TeamMember{}, "team_id = ? AND user_id = ?", teamID, userID).Error
}

// GetTeamRole satisfies the TeamMemberChecker interface consumed by boards.
func (r *Repository) GetTeamRole(teamID, userID string) (string, error) {
	member, err := r.FindMember(teamID, userID)
	if err != nil {
		return "", err
	}
	return string(member.Role), nil
}

// GetTeamOrgID satisfies the TeamMemberChecker interface consumed by boards.
func (r *Repository) GetTeamOrgID(teamID string) (string, error) {
	team, err := r.FindByID(teamID)
	if err != nil {
		return "", err
	}
	return team.OrgID, nil
}
