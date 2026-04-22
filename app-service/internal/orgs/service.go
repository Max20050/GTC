package orgs

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

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateOrg(userID string, req CreateOrgRequest) (*Organization, error) {
	if !slugRegex.MatchString(req.Slug) {
		return nil, fmt.Errorf("%w: slug must be lowercase letters, numbers, and hyphens only", ErrBadRequest)
	}

	if _, err := s.repo.FindBySlug(req.Slug); err == nil {
		return nil, fmt.Errorf("%w: an org with slug '%s' already exists", ErrConflict, req.Slug)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	plan := PlanFree
	if req.Plan != "" {
		plan = req.Plan
	}

	org := &Organization{
		Name:    req.Name,
		Slug:    req.Slug,
		LogoURL: req.LogoURL,
		OwnerID: userID,
		Plan:    plan,
	}
	if err := s.repo.Create(org); err != nil {
		return nil, err
	}

	if err := s.repo.CreateMember(&OrgMember{OrgID: org.ID, UserID: userID, Role: RoleOwner}); err != nil {
		return nil, err
	}
	return org, nil
}

func (s *Service) GetOrg(orgID string) (*Organization, error) {
	org, err := s.repo.FindByID(orgID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return org, err
}

func (s *Service) UpdateOrg(requesterID, orgID string, req UpdateOrgRequest) (*Organization, error) {
	member, err := s.repo.FindMember(orgID, requesterID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrForbidden
	}
	if err != nil {
		return nil, err
	}
	if member.Role != RoleOwner && member.Role != RoleAdmin {
		return nil, ErrForbidden
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.LogoURL != nil {
		updates["logo_url"] = *req.LogoURL
	}
	if req.Plan != nil {
		updates["plan"] = *req.Plan
	}

	if err := s.repo.Update(orgID, updates); err != nil {
		return nil, err
	}
	return s.repo.FindByID(orgID)
}

func (s *Service) DeleteOrg(requesterID, orgID string) error {
	member, err := s.repo.FindMember(orgID, requesterID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrForbidden
	}
	if err != nil {
		return err
	}
	if member.Role != RoleOwner {
		return ErrForbidden
	}
	return s.repo.Delete(orgID)
}

func (s *Service) ListMembers(requesterID, orgID string) ([]OrgMember, error) {
	if _, err := s.repo.FindMember(orgID, requesterID); errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrForbidden
	} else if err != nil {
		return nil, err
	}
	return s.repo.ListMembers(orgID)
}

func (s *Service) InviteMember(requesterID, orgID string, req InviteMemberRequest) (*OrgMember, error) {
	requester, err := s.repo.FindMember(orgID, requesterID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrForbidden
	}
	if err != nil {
		return nil, err
	}
	if requester.Role != RoleOwner && requester.Role != RoleAdmin {
		return nil, ErrForbidden
	}

	if _, err := s.repo.FindMember(orgID, req.UserID); err == nil {
		return nil, fmt.Errorf("%w: user is already a member of this org", ErrConflict)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Prevent directly assigning the owner role via invite
	role := req.Role
	if role == RoleOwner {
		role = RoleAdmin
	}

	member := &OrgMember{OrgID: orgID, UserID: req.UserID, Role: role}
	if err := s.repo.CreateMember(member); err != nil {
		return nil, err
	}
	return member, nil
}

func (s *Service) UpdateMemberRole(requesterID, orgID, targetUserID string, req UpdateMemberRoleRequest) (*OrgMember, error) {
	requester, err := s.repo.FindMember(orgID, requesterID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrForbidden
	}
	if err != nil {
		return nil, err
	}
	if requester.Role != RoleOwner && requester.Role != RoleAdmin {
		return nil, ErrForbidden
	}
	if req.Role == RoleOwner {
		return nil, fmt.Errorf("%w: cannot assign owner role this way", ErrForbidden)
	}

	if err := s.repo.UpdateMemberRole(orgID, targetUserID, req.Role); err != nil {
		return nil, err
	}
	return s.repo.FindMember(orgID, targetUserID)
}

func (s *Service) RemoveMember(requesterID, orgID, targetUserID string) error {
	requester, err := s.repo.FindMember(orgID, requesterID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrForbidden
	}
	if err != nil {
		return err
	}

	if requesterID == targetUserID {
		return s.repo.DeleteMember(orgID, targetUserID)
	}
	if requester.Role != RoleOwner && requester.Role != RoleAdmin {
		return ErrForbidden
	}
	return s.repo.DeleteMember(orgID, targetUserID)
}
