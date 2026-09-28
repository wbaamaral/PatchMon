package handler

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/PatchMon/PatchMon/server-source-code/internal/middleware"
	"github.com/PatchMon/PatchMon/server-source-code/internal/store"
)

// ReleaseNotesAcceptanceHandler handles marking release notes as accepted.
type ReleaseNotesAcceptanceHandler struct {
	store *store.ReleaseNotesAcceptanceStore
	log   *slog.Logger
}

// NewReleaseNotesAcceptanceHandler creates a new handler.
func NewReleaseNotesAcceptanceHandler(store *store.ReleaseNotesAcceptanceStore, log *slog.Logger) *ReleaseNotesAcceptanceHandler {
	return &ReleaseNotesAcceptanceHandler{store: store, log: log}
}

// AcceptRequest is the request body for POST /release-notes-acceptance/accept.
type AcceptRequest struct {
	Version string `json:"version"`
}

// Accept handles POST /api/v1/release-notes-acceptance/accept.
func (h *ReleaseNotesAcceptanceHandler) Accept(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if userID == "" {
		ErrorKey(w, r, http.StatusUnauthorized, "error.unauthorized")
		return
	}

	var req AcceptRequest
	if err := decodeJSON(r, &req); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.invalid_request_body")
		return
	}
	if req.Version == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.version_required")
		return
	}

	if err := h.store.Upsert(r.Context(), userID, req.Version); err != nil {
		if h.log != nil {
			h.log.Error("release notes acceptance upsert failed", "error", err, "user_id", userID, "version", req.Version)
		}
		if errors.Is(err, store.ErrReleaseNotesFKViolation) {
			ErrorKey(w, r, http.StatusUnauthorized, "error.session_expired_login")
			return
		}
		if errors.Is(err, store.ErrReleaseNotesTableMissing) {
			ErrorKey(w, r, http.StatusServiceUnavailable, "error.db_migration_required")
			return
		}
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_accept_release_notes")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{"success": true})
}
