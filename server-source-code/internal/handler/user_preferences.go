package handler

import (
	"encoding/json"
	"net/http"

	"github.com/PatchMon/PatchMon/server-source-code/internal/i18n"
	"github.com/PatchMon/PatchMon/server-source-code/internal/middleware"
	"github.com/PatchMon/PatchMon/server-source-code/internal/models"
	"github.com/PatchMon/PatchMon/server-source-code/internal/store"
)

// UserPreferencesHandler handles /user/preferences routes.
type UserPreferencesHandler struct {
	users *store.UsersStore
}

// NewUserPreferencesHandler creates a new user preferences handler.
func NewUserPreferencesHandler(users *store.UsersStore) *UserPreferencesHandler {
	return &UserPreferencesHandler{users: users}
}

// Get handles GET /user/preferences.
func (h *UserPreferencesHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if userID == "" {
		ErrorKey(w, r, http.StatusUnauthorized, "error.unauthorized")
		return
	}
	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		ErrorKey(w, r, http.StatusNotFound, "error.user_not_found")
		return
	}
	uiPrefs := map[string]interface{}{}
	if len(user.UIPreferences) > 0 {
		_ = json.Unmarshal(user.UIPreferences, &uiPrefs)
	}
	var hostsColumnConfig interface{}
	if hc, ok := uiPrefs["hosts_column_config"]; ok {
		hostsColumnConfig = hc
	}
	themePref := "dark"
	if user.ThemePreference != nil && *user.ThemePreference != "" {
		themePref = *user.ThemePreference
	}
	colorTheme := "cyber_blue"
	if user.ColorTheme != nil && *user.ColorTheme != "" {
		colorTheme = *user.ColorTheme
	}
	locale := ""
	if user.Locale != nil {
		locale = *user.Locale
	}
	JSON(w, http.StatusOK, map[string]interface{}{
		"theme_preference":    themePref,
		"color_theme":         colorTheme,
		"locale":              locale,
		"ui_preferences":      uiPrefs,
		"hosts_column_config": hostsColumnConfig,
	})
}

// Update handles PATCH /user/preferences.
func (h *UserPreferencesHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if userID == "" {
		ErrorKey(w, r, http.StatusUnauthorized, "error.unauthorized")
		return
	}
	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		ErrorKey(w, r, http.StatusNotFound, "error.user_not_found")
		return
	}
	var req struct {
		ThemePreference   *string     `json:"theme_preference"`
		ColorTheme        *string     `json:"color_theme"`
		Locale            *string     `json:"locale"`
		HostsColumnConfig interface{} `json:"hosts_column_config"`
	}
	if err := decodeJSON(r, &req); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.invalid_request_body")
		return
	}
	if req.ThemePreference == nil && req.ColorTheme == nil && req.HostsColumnConfig == nil && req.Locale == nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.no_preferences_to_update")
		return
	}
	if req.ThemePreference != nil {
		theme := *req.ThemePreference
		if theme != "light" && theme != "dark" {
			ErrorKey(w, r, http.StatusBadRequest, "error.invalid_theme")
			return
		}
	}
	validColorThemes := map[string]bool{
		"default": true, "cyber_blue": true, "neon_purple": true,
		"matrix_green": true, "ocean_blue": true, "sunset_gradient": true,
	}
	if req.ColorTheme != nil {
		if !validColorThemes[*req.ColorTheme] {
			ErrorKey(w, r, http.StatusBadRequest, "error.invalid_color_theme")
			return
		}
	}
	if req.Locale != nil {
		if *req.Locale != "" && !i18n.IsValid(*req.Locale) {
			ErrorKey(w, r, http.StatusBadRequest, "error.invalid_locale")
			return
		}
	}
	var uiPrefs []byte
	if req.HostsColumnConfig != nil {
		uiPrefsMap := map[string]interface{}{}
		if len(user.UIPreferences) > 0 {
			_ = json.Unmarshal(user.UIPreferences, &uiPrefsMap)
		}
		uiPrefsMap["hosts_column_config"] = req.HostsColumnConfig
		var err error
		uiPrefs, err = json.Marshal(uiPrefsMap)
		if err != nil {
			ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_update_preferences")
			return
		}
	}
	if err := h.users.UpdatePreferences(r.Context(), userID, req.ThemePreference, req.ColorTheme, uiPrefs); err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_update_preferences")
		return
	}
	if req.Locale != nil {
		if err := h.users.UpdateLocale(r.Context(), userID, req.Locale); err != nil {
			ErrorKey(w, r, http.StatusInternalServerError, "error.internal_server_error")
			return
		}
	}
	// Fetch updated user for response
	updated, _ := h.users.GetByID(r.Context(), userID)
	prefs := preferencesResponse(updated)
	JSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Preferences updated successfully",
		"preferences": prefs,
	})
}

func preferencesResponse(u *models.User) map[string]interface{} {
	themePref := "dark"
	if u.ThemePreference != nil && *u.ThemePreference != "" {
		themePref = *u.ThemePreference
	}
	colorTheme := "cyber_blue"
	if u.ColorTheme != nil && *u.ColorTheme != "" {
		colorTheme = *u.ColorTheme
	}
	locale := ""
	if u.Locale != nil {
		locale = *u.Locale
	}
	uiPrefs := map[string]interface{}{}
	if len(u.UIPreferences) > 0 {
		_ = json.Unmarshal(u.UIPreferences, &uiPrefs)
	}
	var hostsColumnConfig interface{}
	if hc, ok := uiPrefs["hosts_column_config"]; ok {
		hostsColumnConfig = hc
	}
	return map[string]interface{}{
		"theme_preference":    themePref,
		"color_theme":         colorTheme,
		"locale":              locale,
		"ui_preferences":      uiPrefs,
		"hosts_column_config": hostsColumnConfig,
	}
}
