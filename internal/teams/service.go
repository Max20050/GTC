package teams

import (
	"errors"
	"fmt"
	"regexp"

	"gorm.io/gorm"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

var (
	ErrNotFound   = errors.New("not found")
	ErrForbidden  = errors.New("forbidden")
	ErrConflict   = errors.New("conflict")
	ErrBadRequest = errors.New("bad request")
)

// OrgMemberChecker is satisfied by orgs.Repository.
type OrgMemberChecker interface {
	GetOrgRole(orgID, userID string) (string, error)
}

type Service struct {
	repo     *Repository
	orgCheck OrgMemberChecker
}

func NewService(repo *Repository, orgCheck OrgMemberChecker) *Service {
	return &Service{repo: repo, orgCheck: orgCheck}
}

func (s *Service) isOrgAdmin(orgID, userID string) bool {
	role, err := s.orgCheck.GetOrgRole(orgID, userID)
	if err != nil {
		return false
	}
	return role == "owner" || role == "admin"
}

func (s *Service) isTeamAdmin(teamID, userID string) bool {
	m, err := s.repo.FindMember(teamID, userID)
	return err == nil && m.Role == RoleAdmin
}

func (s *Service) CreateTeam(userID, orgID string, req CreateTeamRequest) (*Team, error) {
	if !s.isOrgAdmin(orgID, userID) {
		return nil, ErrForbidden
	}
	if !slugRegex.MatchString(req.Slug) {
		return nil, fmt.Errorf("%w: slug must be lowercase letters, numbers, and hyphens only", ErrBadRequest)
	}
	if _, err := s.repo.FindBySlug(orgID, req.Slug); err == nil {
		return nil, fmt.Errorf("%w: a team with slug '%s' already exists in this org", ErrConflict, req.Slug)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	team := &Team{OrgID: orgID, Name: req.Name, Slug: req.Slug, Description: req.Description, CreatedBy: userID}
	if err := s.repo.Create(team); err != nil {
		return nil, err
	}
	if err := s.repo.CreateMember(&TeamMember{TeamID: team.ID, UserID: userID, Role: RoleAdmin}); err != nil {
		return nil, err
	}
	return team, nil
}

func (s *Service) ListTeams(orgID string) ([]Team, error) {
	return s.repo.ListByOrg(orgID)
}

func (s *Service) GetTeam(orgID, teamID string) (*Team, error) {
	team, err := s.repo.FindByID(teamID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if team.OrgID != orgID {
		return nil, ErrNotFound
	}
	return team, nil
}

func (s *Service) UpdateTeam(userID, orgID, teamID string, req UpdateTeamRequest) (*Team, error) {
	if _, err := s.GetTeam(orgID, teamID); err != nil {
		return nil, err
	}
	if !s.isOrgAdmin(orgID, userID) && !s.isTeamAdmin(teamID, userID) {
		return nil, ErrForbidden
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if err := s.repo.Update(teamID, updates); err != nil {
		return nil, err
	}
	return s.repo.FindByID(teamID)
}

func (s *Service) DeleteTeam(userID, orgID, teamID string) error {
	if _, err := s.GetTeam(orgID, teamID); err != nil {
		return err
	}
	if !s.isOrgAdmin(orgID, userID) && !s.isTeamAdmin(teamID, userID) {
		return ErrForbidden
	}
	return s.repo.Delete(teamID)
}

func (s *Service) ListTeamMembers(userID, orgID, teamID string) ([]TeamMember, error) {
	if _, err := s.GetTeam(orgID, teamID); err != nil {
		return nil, err
	}
	return s.repo.ListMembers(teamID)
}

func (s *Service) AddTeamMember(userID, orgID, teamID string, req AddTeamMemberRequest) (*TeamMember, error) {
	if _, err := s.GetTeam(orgID, teamID); err != nil {
		return nil, err
	}
	if !s.isOrgAdmin(orgID, userID) && !s.isTeamAdmin(teamID, userID) {
		return nil, ErrForbidden
	}
	if _, err := s.repo.FindMember(teamID, req.UserID); err == nil {
		return nil, fmt.Errorf("%w: user is already a member of this team", ErrConflict)
	}

	member := &TeamMember{TeamID: teamID, UserID: req.UserID, Role: req.Role}
	if err := s.repo.CreateMember(member); err != nil {
		return nil, err
	}
	return member, nil
}

func (s *Service) UpdateTeamMemberRole(userID, orgID, teamID, targetUserID string, req UpdateTeamMemberRoleRequest) (*TeamMember, error) {
	if _, err := s.GetTeam(orgID, teamID); err != nil {
		return nil, err
	}
	if !s.isOrgAdmin(orgID, userID) && !s.isTeamAdmin(teamID, userID) {
		return nil, ErrForbidden
	}
	if err := s.repo.UpdateMemberRole(teamID, targetUserID, req.Role); err != nil {
		return nil, err
	}
	return s.repo.FindMember(teamID, targetUserID)
}

func (s *Service) RemoveTeamMember(userID, orgID, teamID, targetUserID string) error {
	if _, err := s.GetTeam(orgID, teamID); err != nil {
		return err
	}
	if userID != targetUserID && !s.isOrgAdmin(orgID, userID) && !s.isTeamAdmin(teamID, userID) {
		return ErrForbidden
	}
	return s.repo.DeleteMember(teamID, targetUserID)
}
