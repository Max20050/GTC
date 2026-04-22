package boards

import (
	"errors"

	"gorm.io/gorm"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrForbidden  = errors.New("forbidden")
	ErrBadRequest = errors.New("bad request")
)

// OrgMemberChecker is satisfied by orgs.Repository.
type OrgMemberChecker interface {
	GetOrgRole(orgID, userID string) (string, error)
}

// TeamMemberChecker is satisfied by teams.Repository.
type TeamMemberChecker interface {
	GetTeamRole(teamID, userID string) (string, error)
	GetTeamOrgID(teamID string) (string, error)
}

type Service struct {
	repo      *Repository
	orgCheck  OrgMemberChecker
	teamCheck TeamMemberChecker
}

func NewService(repo *Repository, orgCheck OrgMemberChecker, teamCheck TeamMemberChecker) *Service {
	return &Service{repo: repo, orgCheck: orgCheck, teamCheck: teamCheck}
}

func (s *Service) CreatePersonalBoard(userID string, req CreatePersonalBoardRequest) (*Board, error) {
	if req.Visibility != VisibilityPrivate && req.Visibility != VisibilityPublic {
		return nil, errors.New("personal board visibility must be 'private' or 'public'")
	}
	board := &Board{
		Name:         req.Name,
		Description:  req.Description,
		OwnerType:    OwnerTypeUser,
		OwnerID:      userID,
		Visibility:   req.Visibility,
		ThumbnailURL: req.ThumbnailURL,
		CreatedBy:    userID,
	}
	if err := s.repo.Create(board); err != nil {
		return nil, err
	}
	return board, nil
}

func (s *Service) ListPersonalBoards(userID string) ([]Board, error) {
	return s.repo.ListPersonalBoards(userID)
}

func (s *Service) GetBoard(userID, boardID string) (*Board, error) {
	board, err := s.repo.FindByID(boardID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if board.Visibility == VisibilityPublic {
		return board, nil
	}
	if board.OwnerType == OwnerTypeUser {
		if board.OwnerID != userID {
			return nil, ErrForbidden
		}
		return board, nil
	}

	// Team board — requester must be a team member
	if _, err := s.teamCheck.GetTeamRole(board.OwnerID, userID); err != nil {
		return nil, ErrForbidden
	}
	return board, nil
}

func (s *Service) UpdateBoard(userID, boardID string, req UpdateBoardRequest) (*Board, error) {
	board, err := s.GetBoard(userID, boardID)
	if err != nil {
		return nil, err
	}
	if !s.canEdit(userID, board) {
		return nil, ErrForbidden
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ThumbnailURL != nil {
		updates["thumbnail_url"] = *req.ThumbnailURL
	}
	if req.Visibility != nil {
		if board.OwnerType == OwnerTypeUser && *req.Visibility != VisibilityPrivate && *req.Visibility != VisibilityPublic {
			return nil, errors.New("personal board visibility must be 'private' or 'public'")
		}
		updates["visibility"] = *req.Visibility
	}

	if err := s.repo.Update(boardID, updates); err != nil {
		return nil, err
	}
	return s.repo.FindByID(boardID)
}

func (s *Service) DeleteBoard(userID, boardID string) error {
	board, err := s.repo.FindByID(boardID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	if board.CreatedBy == userID {
		return s.repo.Delete(boardID)
	}

	if board.OwnerType == OwnerTypeTeam {
		if role, err := s.teamCheck.GetTeamRole(board.OwnerID, userID); err == nil && role == "admin" {
			return s.repo.Delete(boardID)
		}
		if orgID, err := s.teamCheck.GetTeamOrgID(board.OwnerID); err == nil {
			if orgRole, err := s.orgCheck.GetOrgRole(orgID, userID); err == nil && (orgRole == "admin" || orgRole == "owner") {
				return s.repo.Delete(boardID)
			}
		}
	}

	return ErrForbidden
}

func (s *Service) CreateTeamBoard(userID, orgID, teamID string, req CreateTeamBoardRequest) (*Board, error) {
	if req.Visibility == VisibilityPrivate {
		return nil, errors.New("team board visibility cannot be 'private'")
	}
	role, err := s.teamCheck.GetTeamRole(teamID, userID)
	if err != nil || (role != "admin" && role != "editor") {
		return nil, ErrForbidden
	}

	board := &Board{
		Name:         req.Name,
		Description:  req.Description,
		OwnerType:    OwnerTypeTeam,
		OwnerID:      teamID,
		Visibility:   req.Visibility,
		ThumbnailURL: req.ThumbnailURL,
		CreatedBy:    userID,
	}
	if err := s.repo.Create(board); err != nil {
		return nil, err
	}
	return board, nil
}

func (s *Service) ListTeamBoards(userID, orgID, teamID string) ([]Board, error) {
	if _, err := s.teamCheck.GetTeamRole(teamID, userID); err != nil {
		// Fall back to org admin check
		if orgRole, orgErr := s.orgCheck.GetOrgRole(orgID, userID); orgErr != nil || (orgRole != "owner" && orgRole != "admin") {
			return nil, ErrForbidden
		}
	}
	return s.repo.ListTeamBoards(teamID)
}

func (s *Service) canEdit(userID string, board *Board) bool {
	if board.CreatedBy == userID {
		return true
	}
	if board.OwnerType == OwnerTypeUser {
		return board.OwnerID == userID
	}
	role, err := s.teamCheck.GetTeamRole(board.OwnerID, userID)
	return err == nil && (role == "admin" || role == "editor")
}
