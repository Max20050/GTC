package boards

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(board *Board) error {
	return r.db.Create(board).Error
}

func (r *Repository) FindByID(id string) (*Board, error) {
	var board Board
	err := r.db.First(&board, "id = ?", id).Error
	return &board, err
}

func (r *Repository) ListPersonalBoards(userID string) ([]Board, error) {
	var boards []Board
	err := r.db.Where("owner_type = ? AND owner_id = ?", OwnerTypeUser, userID).Find(&boards).Error
	return boards, err
}

func (r *Repository) ListTeamBoards(teamID string) ([]Board, error) {
	var boards []Board
	err := r.db.Where("owner_type = ? AND owner_id = ?", OwnerTypeTeam, teamID).Find(&boards).Error
	return boards, err
}

func (r *Repository) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&Board{}).Where("id = ?", id).Updates(updates).Error
}

func (r *Repository) Delete(id string) error {
	return r.db.Delete(&Board{}, "id = ?", id).Error
}
