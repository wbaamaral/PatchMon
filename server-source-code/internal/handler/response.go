package handler

import (
	"encoding/json"
	"net/http"

	"github.com/PatchMon/PatchMon/server-source-code/internal/i18n"
)

// JSON writes a JSON response.
func JSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

// Error writes a JSON error response.
// Deprecated: use ErrorKey with a message catalog key instead.
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

// ErrorKey writes a localized JSON error response with the catalog key included.
// Shape: {"error": "<localized>", "error_key": "<key>"}
func ErrorKey(w http.ResponseWriter, r *http.Request, status int, key string, args ...any) {
	msg := i18n.T(r.Context(), key, args...)
	JSON(w, status, map[string]string{"error": msg, "error_key": key})
}
