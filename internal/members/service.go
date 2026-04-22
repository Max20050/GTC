package members

// OrgRepo is satisfied by orgs.Repository.
type OrgRepo interface {
	GetOrgRole(orgID, userID string) (string, error)
}

// TeamRepo is satisfied by teams.Repository.
type TeamRepo interface {
	GetTeamRole(teamID, userID string) (string, error)
}

type Service struct {
	orgRepo  OrgRepo
	teamRepo TeamRepo
}

func NewService(orgRepo OrgRepo, teamRepo TeamRepo) *Service {
	return &Service{orgRepo: orgRepo, teamRepo: teamRepo}
}

func (s *Service) IsOrgMember(orgID, userID string) bool {
	_, err := s.orgRepo.GetOrgRole(orgID, userID)
	return err == nil
}

func (s *Service) IsOrgAdmin(orgID, userID string) bool {
	role, err := s.orgRepo.GetOrgRole(orgID, userID)
	return err == nil && (role == "owner" || role == "admin")
}

func (s *Service) IsTeamMember(teamID, userID string) bool {
	_, err := s.teamRepo.GetTeamRole(teamID, userID)
	return err == nil
}

func (s *Service) IsTeamAdmin(teamID, userID string) bool {
	role, err := s.teamRepo.GetTeamRole(teamID, userID)
	return err == nil && role == "admin"
}

func (s *Service) CanEditTeamBoard(teamID, userID string) bool {
	role, err := s.teamRepo.GetTeamRole(teamID, userID)
	return err == nil && (role == "admin" || role == "editor")
}
