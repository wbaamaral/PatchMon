package handler

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/PatchMon/PatchMon/server-source-code/internal/config"
	hostctx "github.com/PatchMon/PatchMon/server-source-code/internal/context"
	"github.com/PatchMon/PatchMon/server-source-code/internal/database"
	"github.com/PatchMon/PatchMon/server-source-code/internal/middleware"
	"github.com/PatchMon/PatchMon/server-source-code/internal/models"
	"github.com/PatchMon/PatchMon/server-source-code/internal/notifications"
	"github.com/PatchMon/PatchMon/server-source-code/internal/store"
	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
)

// UsersHandler handles user admin routes.
type UsersHandler struct {
	users          *store.UsersStore
	sessions       *store.SessionsStore
	trustedDevices *store.TrustedDevicesStore
	permissions    *store.PermissionsStore
	settings       *store.SettingsStore
	resolved       *config.ResolvedConfig
	db             database.DBProvider
	notify         *notifications.Emitter
	log            *slog.Logger
	// adminMode mirrors cfg.AdminMode at construction time. Used to drive
	// auto-newsletter-subscription for SaaS-hosted users on creation.
	adminMode bool
	// Resolves the calling context's own settings; `resolved` is startup-only.
	cfgResolver *hostctx.ConfigResolver
}

// WithConfigResolver wires the per-context config resolver.
func (h *UsersHandler) WithConfigResolver(r *hostctx.ConfigResolver) *UsersHandler {
	h.cfgResolver = r
	return h
}

func (h *UsersHandler) resolvedFor(ctx context.Context) *config.ResolvedConfig {
	if rc := h.cfgResolver.Resolve(ctx); rc != nil {
		return rc
	}
	return h.resolved
}

// NewUsersHandler creates a new users handler.
func NewUsersHandler(users *store.UsersStore, sessions *store.SessionsStore, trustedDevices *store.TrustedDevicesStore, permissions *store.PermissionsStore, settings *store.SettingsStore, resolved *config.ResolvedConfig, cfg *config.Config, db database.DBProvider, notify *notifications.Emitter, log *slog.Logger) *UsersHandler {
	adminMode := cfg != nil && cfg.AdminMode
	return &UsersHandler{users: users, sessions: sessions, trustedDevices: trustedDevices, permissions: permissions, settings: settings, resolved: resolved, db: db, notify: notify, log: log, adminMode: adminMode}
}

// roleRank returns a numeric rank for role hierarchy (higher = more privileged).
func roleRank(role string) int {
	switch role {
	case "superadmin":
		return 100
	case "admin":
		return 90
	case "host_manager":
		return 50
	case "user":
		return 20
	case "readonly":
		return 10
	default:
		return 30 // custom roles sit mid-tier
	}
}

// canAssignRole checks whether the calling user is allowed to assign the target role.
func (h *UsersHandler) canAssignRole(r *http.Request, callerRole, targetRole string) bool {
	// admin and superadmin bypass permission checks in middleware,
	// but we still enforce hierarchy here.
	if targetRole == "superadmin" {
		// Only superadmin can assign superadmin.
		if callerRole == "superadmin" {
			return true
		}
		// Non-superadmin must have can_manage_superusers.
		if callerRole == "admin" {
			// admins don't have can_manage_superusers by default
			return false
		}
		perm, err := h.permissions.GetByRole(r.Context(), callerRole)
		if err != nil || perm == nil {
			return false
		}
		return perm.CanManageSuperusers
	}
	if targetRole == "admin" {
		// Only superadmin can assign admin.
		return callerRole == "superadmin"
	}
	// For other roles, caller must be at least as privileged.
	return roleRank(callerRole) >= roleRank(targetRole)
}

// List returns paginated users.
func (h *UsersHandler) List(w http.ResponseWriter, r *http.Request) {
	returnAll := r.URL.Query().Get("all") == "true"
	page := parseIntQuery(r, "page", 1)
	pageSize := parseIntQuery(r, "pageSize", 50)
	if pageSize > 200 {
		pageSize = 200
	}
	if returnAll {
		pageSize = 10000
	}
	offset := (page - 1) * pageSize

	users, err := h.users.List(r.Context(), pageSize, offset)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_list_users")
		return
	}
	total, _ := h.users.Count(r.Context())
	totalPages := 1
	if !returnAll && pageSize > 0 {
		totalPages = (total + pageSize - 1) / pageSize
		if totalPages < 1 {
			totalPages = 1
		}
	}
	if returnAll {
		pageSize = total
	}

	// Build response without password_hash
	data := make([]map[string]interface{}, len(users))
	for i, u := range users {
		data[i] = userToAdminResponse(&u)
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"data": data,
		"pagination": map[string]interface{}{
			"total": total, "page": page, "pageSize": pageSize, "totalPages": totalPages,
		},
	})
}

// ListForAssignment returns active users for assignment dropdowns.
func (h *UsersHandler) ListForAssignment(w http.ResponseWriter, r *http.Request) {
	users, err := h.users.ListForAssignment(r.Context())
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_fetch_users")
		return
	}
	data := make([]map[string]interface{}, len(users))
	for i, u := range users {
		data[i] = map[string]interface{}{
			"id": u.ID, "username": u.Username, "email": u.Email,
			"first_name": u.FirstName, "last_name": u.LastName, "is_active": u.IsActive,
		}
	}
	JSON(w, http.StatusOK, map[string]interface{}{"data": data})
}

// Create creates a new user.
func (h *UsersHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username  string  `json:"username"`
		Email     string  `json:"email"`
		Password  string  `json:"password"`
		FirstName *string `json:"first_name"`
		LastName  *string `json:"last_name"`
		Role      string  `json:"role"`
	}
	if err := decodeJSON(r, &req); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.invalid_request_body")
		return
	}
	if len(req.Username) < 3 {
		ErrorKey(w, r, http.StatusBadRequest, "error.username_min_length")
		return
	}
	if req.Email == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.email_required")
		return
	}
	if req.Password == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.password_required")
		return
	}
	if err := ValidatePasswordPolicy(h.resolvedFor(r.Context()), req.Password); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.request_failed_detail", "detail", err.Error())
		return
	}

	role := req.Role
	if role == "" {
		s, _ := h.settings.GetFirst(r.Context())
		if s != nil && s.DefaultUserRole != "" {
			role = s.DefaultUserRole
		}
		if role == "" && h.resolved != nil {
			role = h.resolvedFor(r.Context()).DefaultUserRole
		}
		if role == "" && os.Getenv("DEFAULT_USER_ROLE") != "" {
			role = strings.TrimSpace(os.Getenv("DEFAULT_USER_ROLE"))
		}
		if role == "" {
			role = "user"
		}
	}

	// Enforce role escalation protection.
	callerRole, _ := r.Context().Value(middleware.UserRoleKey).(string)
	if !h.canAssignRole(r, callerRole, role) {
		ErrorKey(w, r, http.StatusForbidden, "error.cannot_assign_role_prefix", "detail", role)
		return
	}

	exists, err := h.users.ExistsByUsernameOrEmail(r.Context(), req.Username, req.Email, "")
	if err != nil || exists {
		ErrorKey(w, r, http.StatusConflict, "error.username_or_email_exists")
		return
	}

	// Enforce host user limit if a package is applied.
	if entry := hostctx.EntryFromContext(r.Context()); entry != nil && entry.MaxUsers != nil {
		count, countErr := h.users.Count(r.Context())
		if countErr == nil && count >= *entry.MaxUsers {
			ErrorKey(w, r, http.StatusForbidden, "error.user_limit_reached")
			return
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.hash_password_failed")
		return
	}

	hashStr := string(hash)
	u := &models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: &hashStr,
		Role:         role,
		IsActive:     true,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
	}
	if err := h.users.Create(r.Context(), u); err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_create_user")
		return
	}
	AutoSubscribeIfHosted(h.adminMode, h.users, h.log, u)

	// Emit user_created event
	if h.notify != nil {
		if d := h.db.DB(r.Context()); d != nil {
			callerID, _ := r.Context().Value(middleware.UserIDKey).(string)
			h.notify.EmitEvent(r.Context(), d, hostctx.TenantHostKey(r.Context()), notifications.Event{
				Type:          "user_created",
				Severity:      "informational",
				Title:         "User Created",
				Message:       "User " + u.Username + " was created with role " + u.Role + ".",
				ReferenceType: "user",
				ReferenceID:   u.ID,
				Metadata: map[string]interface{}{
					"user_id":    u.ID,
					"username":   u.Username,
					"role":       u.Role,
					"created_by": callerID,
				},
			})
		}
	}

	JSON(w, http.StatusCreated, map[string]interface{}{
		"message": "User created successfully",
		"user":    userToAdminResponse(u),
	})
}

// Update updates a user.
func (h *UsersHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	if userID == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.user_id_required")
		return
	}

	existing, err := h.users.GetByID(r.Context(), userID)
	if err != nil || existing == nil {
		ErrorKey(w, r, http.StatusNotFound, "error.user_not_found")
		return
	}

	var req struct {
		Username  *string `json:"username"`
		Email     *string `json:"email"`
		FirstName *string `json:"first_name"`
		LastName  *string `json:"last_name"`
		Role      *string `json:"role"`
		IsActive  *bool   `json:"is_active"`
	}
	if err := decodeJSON(r, &req); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.invalid_request_body")
		return
	}

	// Prevent modifying users with a higher-privilege role than the caller.
	callerRole, _ := r.Context().Value(middleware.UserRoleKey).(string)
	if roleRank(existing.Role) > roleRank(callerRole) {
		ErrorKey(w, r, http.StatusForbidden, "error.cannot_modify_higher_privilege")
		return
	}
	if existing.Role == "superadmin" && callerRole != "superadmin" {
		perm, permErr := h.permissions.GetByRole(r.Context(), callerRole)
		if permErr != nil || perm == nil || !perm.CanManageSuperusers {
			ErrorKey(w, r, http.StatusForbidden, "error.cannot_modify_superadmin")
			return
		}
	}

	// Build update
	u := *existing
	if req.Username != nil {
		u.Username = *req.Username
	}
	if req.Email != nil {
		u.Email = *req.Email
	}
	if req.FirstName != nil {
		u.FirstName = req.FirstName
	}
	if req.LastName != nil {
		u.LastName = req.LastName
	}
	if req.Role != nil {
		// Enforce role escalation protection.
		if !h.canAssignRole(r, callerRole, *req.Role) {
			ErrorKey(w, r, http.StatusForbidden, "error.cannot_assign_role_prefix", "detail", *req.Role)
			return
		}
		// Prevent demoting yourself.
		currentUserID, _ := r.Context().Value(middleware.UserIDKey).(string)
		if currentUserID != "" && userID == currentUserID && *req.Role != existing.Role {
			ErrorKey(w, r, http.StatusBadRequest, "error.cannot_change_own_role")
			return
		}
		u.Role = *req.Role
	}
	if req.IsActive != nil {
		u.IsActive = *req.IsActive
	}

	// Check duplicates
	username := u.Username
	email := u.Email
	if req.Username != nil {
		username = *req.Username
	}
	if req.Email != nil {
		email = *req.Email
	}
	exists, _ := h.users.ExistsByUsernameOrEmail(r.Context(), username, email, userID)
	if exists {
		ErrorKey(w, r, http.StatusConflict, "error.username_or_email_exists")
		return
	}

	if err := h.users.Update(r.Context(), &u); err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_update_user")
		return
	}

	// Emit user_role_changed event when role actually changed.
	roleChanged := req.Role != nil && *req.Role != existing.Role
	if roleChanged {
		if h.notify != nil {
			if d := h.db.DB(r.Context()); d != nil {
				changedBy, _ := r.Context().Value(middleware.UserIDKey).(string)
				h.notify.EmitEvent(r.Context(), d, hostctx.TenantHostKey(r.Context()), notifications.Event{
					Type:          "user_role_changed",
					Severity:      "warning",
					Title:         "User Role Changed",
					Message:       "User " + u.Username + " role changed from " + existing.Role + " to " + *req.Role + ".",
					ReferenceType: "user",
					ReferenceID:   u.ID,
					Metadata: map[string]interface{}{
						"user_id":    u.ID,
						"username":   u.Username,
						"old_role":   existing.Role,
						"new_role":   *req.Role,
						"changed_by": changedBy,
					},
				})
			}
		}
	}

	// Revoke all sessions when role changes or account is deactivated,
	// so the old JWT privileges are immediately invalidated.
	// Deactivation also revokes MFA trust so that re-activation can't bypass MFA
	// using a trust row that predates the deactivation window.
	deactivated := req.IsActive != nil && !*req.IsActive && existing.IsActive
	if roleChanged || deactivated {
		if err := h.sessions.RevokeAllForUser(r.Context(), userID, ""); err != nil && h.log != nil {
			h.log.Error("failed to revoke sessions after user update", "user_id", userID, "error", err)
		}
	}
	if deactivated && h.trustedDevices != nil {
		if err := h.trustedDevices.RevokeAllForUser(r.Context(), userID); err != nil && h.log != nil {
			h.log.Error("failed to revoke trusted devices after deactivation", "user_id", userID, "error", err)
		}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"message": "User updated successfully",
		"user":    userToAdminResponse(&u),
	})
}

// Delete deletes a user.
func (h *UsersHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	currentUserID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if currentUserID != "" && userID == currentUserID {
		ErrorKey(w, r, http.StatusBadRequest, "error.cannot_delete_own_account")
		return
	}

	existing, err := h.users.GetByID(r.Context(), userID)
	if err != nil || existing == nil {
		ErrorKey(w, r, http.StatusNotFound, "error.user_not_found")
		return
	}

	// Prevent deleting users with a higher-privilege role.
	callerRole, _ := r.Context().Value(middleware.UserRoleKey).(string)
	if roleRank(existing.Role) > roleRank(callerRole) {
		ErrorKey(w, r, http.StatusForbidden, "error.cannot_delete_higher_privilege")
		return
	}
	// Deleting a superadmin requires being superadmin or having can_manage_superusers.
	if existing.Role == "superadmin" && callerRole != "superadmin" {
		perm, permErr := h.permissions.GetByRole(r.Context(), callerRole)
		if permErr != nil || perm == nil || !perm.CanManageSuperusers {
			ErrorKey(w, r, http.StatusForbidden, "error.cannot_delete_superadmin")
			return
		}
	}

	var superCount, adminCount int
	if existing.Role == "superadmin" {
		superCount, _ = h.users.CountSuperadmins(r.Context())
		if superCount <= 1 {
			ErrorKey(w, r, http.StatusBadRequest, "error.cannot_delete_last_superadmin")
			return
		}
	}
	if existing.Role == "admin" {
		superCount, _ = h.users.CountSuperadmins(r.Context())
		if superCount == 0 {
			adminCount, _ = h.users.CountActiveAdmins(r.Context())
			if adminCount <= 1 {
				ErrorKey(w, r, http.StatusBadRequest, "error.cannot_delete_last_admin")
				return
			}
		}
	}

	if err := h.users.Delete(r.Context(), userID); err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_delete_user")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"})
}

// ResetPassword resets a user's password.
func (h *UsersHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	var req struct {
		NewPassword string `json:"newPassword"`
	}
	if err := decodeJSON(r, &req); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.invalid_request_body")
		return
	}
	if req.NewPassword == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.new_password_required")
		return
	}

	existing, err := h.users.GetByID(r.Context(), userID)
	if err != nil || existing == nil {
		ErrorKey(w, r, http.StatusNotFound, "error.user_not_found")
		return
	}
	if !existing.IsActive {
		ErrorKey(w, r, http.StatusBadRequest, "error.cannot_reset_inactive_user")
		return
	}

	// Prevent resetting the password of users with a higher-privilege role.
	callerRole, _ := r.Context().Value(middleware.UserRoleKey).(string)
	if roleRank(existing.Role) > roleRank(callerRole) {
		ErrorKey(w, r, http.StatusForbidden, "error.cannot_reset_higher_privilege")
		return
	}
	if existing.Role == "superadmin" && callerRole != "superadmin" {
		perm, permErr := h.permissions.GetByRole(r.Context(), callerRole)
		if permErr != nil || perm == nil || !perm.CanManageSuperusers {
			ErrorKey(w, r, http.StatusForbidden, "error.cannot_reset_superadmin")
			return
		}
	}

	if err := ValidatePasswordPolicy(h.resolvedFor(r.Context()), req.NewPassword); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.request_failed_detail", "detail", err.Error())
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.hash_password_failed")
		return
	}

	if err := h.users.UpdatePassword(r.Context(), userID, string(hash)); err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_reset_password")
		return
	}

	// Revoke all sessions and trusted devices for the target user after password
	// reset. An admin reset is the canonical post-compromise action; leaving
	// either surface alive would let an attacker retain access despite the reset.
	if err := h.sessions.RevokeAllForUser(r.Context(), userID, ""); err != nil && h.log != nil {
		h.log.Error("failed to revoke sessions after password reset", "user_id", userID, "error", err)
	}
	if h.trustedDevices != nil {
		if err := h.trustedDevices.RevokeAllForUser(r.Context(), userID); err != nil && h.log != nil {
			h.log.Error("failed to revoke trusted devices after password reset", "user_id", userID, "error", err)
		}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Password reset successfully",
		"user":    map[string]string{"id": existing.ID, "username": existing.Username, "email": existing.Email},
	})
}

func userToAdminResponse(u *models.User) map[string]interface{} {
	res := map[string]interface{}{
		"id": u.ID, "username": u.Username, "email": u.Email, "role": u.Role,
		"is_active": u.IsActive, "created_at": u.CreatedAt, "updated_at": u.UpdatedAt,
	}
	if u.FirstName != nil {
		res["first_name"] = *u.FirstName
	}
	if u.LastName != nil {
		res["last_name"] = *u.LastName
	}
	if u.LastLogin != nil {
		res["last_login"] = u.LastLogin.Format(time.RFC3339)
	}
	res["avatar_url"] = u.AvatarURL
	return res
}
