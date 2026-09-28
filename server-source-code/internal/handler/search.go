package handler

import (
	"net/http"

	"github.com/PatchMon/PatchMon/server-source-code/internal/store"
)

// SearchHandler handles global search routes.
type SearchHandler struct {
	search *store.SearchStore
}

// NewSearchHandler creates a new search handler.
func NewSearchHandler(search *store.SearchStore) *SearchHandler {
	return &SearchHandler{search: search}
}

// HandleGlobalSearch handles GET /search?q=...
func (h *SearchHandler) HandleGlobalSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.search_query_required")
		return
	}
	if len(q) > 200 {
		q = q[:200]
	}

	limit := parseIntQuery(r, "limit", 20)
	if limit > 100 {
		limit = 100
	}

	results, err := h.search.GlobalSearch(r.Context(), q, limit)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_perform_search")
		return
	}

	JSON(w, http.StatusOK, results)
}
