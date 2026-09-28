package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/PatchMon/PatchMon/server-source-code/internal/store"
	"github.com/go-chi/chi/v5"
)

// optionalInt unmarshals from JSON number or empty string.
type optionalInt struct{ val *int }

func (o *optionalInt) UnmarshalJSON(data []byte) error {
	s := string(data)
	if s == "null" || s == `""` || s == "" {
		o.val = nil
		return nil
	}
	var i int
	if err := json.Unmarshal(data, &i); err != nil {
		// Try string for form values like ""
		var str string
		if err2 := json.Unmarshal(data, &str); err2 != nil {
			return err
		}
		if str == "" {
			o.val = nil
			return nil
		}
		i, err = strconv.Atoi(str)
		if err != nil {
			return err
		}
	}
	o.val = &i
	return nil
}

// RepositoriesHandler handles repository routes.
type RepositoriesHandler struct {
	repos *store.RepositoriesStore
}

// NewRepositoriesHandler creates a new repositories handler.
func NewRepositoriesHandler(repos *store.RepositoriesStore) *RepositoriesHandler {
	return &RepositoriesHandler{repos: repos}
}

// List handles GET /repositories.
func (h *RepositoriesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := q.Get("search")
	if len(search) > 200 {
		search = search[:200]
	}
	params := store.RepoListParams{
		HostID: q.Get("host"),
		Search: search,
		Status: q.Get("status"),
		Type:   q.Get("type"),
		Limit:  parseIntQuery(r, "limit", 50),
		Offset: parseIntQuery(r, "offset", 0),
		Sort:   q.Get("sort"),
		Order:  q.Get("order"),
	}
	paginated := q.Has("limit") || q.Has("offset") || q.Has("sort") || q.Has("order")
	if !paginated {
		params.Legacy = true
		params.Limit = 5000
	}
	if !params.Legacy && params.Limit > 500 {
		params.Limit = 500
	}
	params.Offset = clampOffset(params.Offset)
	result, err := h.repos.List(r.Context(), params)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_fetch_repositories")
		return
	}
	if !paginated {
		JSON(w, http.StatusOK, result.Items)
		return
	}
	JSON(w, http.StatusOK, result)
}

// GetByHost handles GET /repositories/host/:hostId.
func (h *RepositoriesHandler) GetByHost(w http.ResponseWriter, r *http.Request) {
	hostID := chi.URLParam(r, "hostId")
	if hostID == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.host_ids_required")
		return
	}
	repos, err := h.repos.GetByHost(r.Context(), hostID)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_fetch_host_repositories")
		return
	}
	JSON(w, http.StatusOK, repos)
}

// GetByID handles GET /repositories/:repositoryId.
func (h *RepositoriesHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	repoID := chi.URLParam(r, "repositoryId")
	if repoID == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.repo_id_required")
		return
	}
	repo, err := h.repos.GetByID(r.Context(), repoID)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_fetch_repository_details")
		return
	}
	if repo == nil {
		ErrorKey(w, r, http.StatusNotFound, "error.repository_not_found")
		return
	}
	JSON(w, http.StatusOK, repo)
}

// Update handles PUT /repositories/:repositoryId.
func (h *RepositoriesHandler) Update(w http.ResponseWriter, r *http.Request) {
	repoID := chi.URLParam(r, "repositoryId")
	if repoID == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.repo_id_required")
		return
	}
	var body struct {
		Name          *string     `json:"name"`
		Description   *string     `json:"description"`
		IsActive      *bool       `json:"isActive"`
		IsActiveSnake *bool       `json:"is_active"`
		Priority      optionalInt `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.invalid_request_body")
		return
	}
	if body.Name != nil && *body.Name == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.name_required")
		return
	}
	isActive := body.IsActive
	if isActive == nil {
		isActive = body.IsActiveSnake
	}
	repo, err := h.repos.Update(r.Context(), repoID, body.Name, body.Description, isActive, body.Priority.val)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_update_repository")
		return
	}
	JSON(w, http.StatusOK, repo)
}

// ToggleHostRepository handles PATCH /repositories/host/:hostId/repository/:repositoryId.
func (h *RepositoriesHandler) ToggleHostRepository(w http.ResponseWriter, r *http.Request) {
	hostID := chi.URLParam(r, "hostId")
	repoID := chi.URLParam(r, "repositoryId")
	if hostID == "" || repoID == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.host_id_and_repo_required")
		return
	}
	var body struct {
		IsEnabled bool `json:"isEnabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.invalid_request_body")
		return
	}
	hr, err := h.repos.ToggleHostRepository(r.Context(), hostID, repoID, body.IsEnabled)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_toggle_repository")
		return
	}
	if hr == nil {
		ErrorKey(w, r, http.StatusNotFound, "error.host_repository_not_found")
		return
	}
	status := "disabled"
	if body.IsEnabled {
		status = "enabled"
	}
	hostName := hr.Hosts.FriendlyName
	if hostName == "" {
		hostName = "host"
	}
	JSON(w, http.StatusOK, map[string]interface{}{
		"message":        "Repository " + status + " for host " + hostName,
		"hostRepository": hr,
	})
}

// GetStats handles GET /repositories/stats/summary.
func (h *RepositoriesHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.repos.GetStats(r.Context())
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_fetch_repositories_stats")
		return
	}
	JSON(w, http.StatusOK, stats)
}

// Delete handles DELETE /repositories/:repositoryId.
func (h *RepositoriesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	repoID := chi.URLParam(r, "repositoryId")
	if repoID == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.repo_id_required")
		return
	}
	deleted, err := h.repos.Delete(r.Context(), repoID)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_delete_repository")
		return
	}
	if deleted == nil {
		ErrorKey(w, r, http.StatusNotFound, "error.repository_not_found")
		return
	}
	JSON(w, http.StatusOK, map[string]interface{}{
		"message":           "Repository deleted successfully",
		"deletedRepository": deleted,
	})
}

// CleanupOrphaned handles DELETE /repositories/cleanup/orphaned.
func (h *RepositoriesHandler) CleanupOrphaned(w http.ResponseWriter, r *http.Request) {
	deleted, count, err := h.repos.CleanupOrphaned(r.Context())
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_cleanup_orphaned_repos")
		return
	}
	if count == 0 {
		JSON(w, http.StatusOK, map[string]interface{}{
			"message":             "No orphaned repositories found",
			"deletedCount":        0,
			"deletedRepositories": []interface{}{},
		})
		return
	}
	JSON(w, http.StatusOK, map[string]interface{}{
		"message":             fmt.Sprintf("Successfully deleted %d orphaned repositories", count),
		"deletedCount":        count,
		"deletedRepositories": deleted,
	})
}
