package handler

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"log/slog"

	"github.com/PatchMon/PatchMon/server-source-code/internal/auth/discord"
	"github.com/PatchMon/PatchMon/server-source-code/internal/config"
	"github.com/PatchMon/PatchMon/server-source-code/internal/middleware"
	"github.com/PatchMon/PatchMon/server-source-code/internal/models"
	"github.com/PatchMon/PatchMon/server-source-code/internal/store"
	"github.com/PatchMon/PatchMon/server-source-code/internal/util"
	"github.com/google/uuid"
)

// DiscordHandler handles Discord OAuth2 authentication routes.
type DiscordHandler struct {
	cfg            *config.Config
	resolved       *config.ResolvedConfig
	settings       *store.SettingsStore
	users          *store.UsersStore
	discordStore   *store.DiscordSessionStore
	dashboardPrefs *store.DashboardPreferencesStore
	auth           *AuthHandler
	enc            *util.Encryption
	log            *slog.Logger
}

// NewDiscordHandler creates a new Discord handler.
func NewDiscordHandler(
	cfg *config.Config,
	resolved *config.ResolvedConfig,
	settings *store.SettingsStore,
	users *store.UsersStore,
	discordStore *store.DiscordSessionStore,
	dashboardPrefs *store.DashboardPreferencesStore,
	auth *AuthHandler,
	enc *util.Encryption,
	log *slog.Logger,
) *DiscordHandler {
	return &DiscordHandler{
		cfg:            cfg,
		resolved:       resolved,
		settings:       settings,
		users:          users,
		discordStore:   discordStore,
		dashboardPrefs: dashboardPrefs,
		auth:           auth,
		enc:            enc,
		log:            log,
	}
}

// loadDiscordConfig loads Discord OAuth config from settings (decrypts secret).
func (h *DiscordHandler) loadDiscordConfig(ctx context.Context) (*discord.Config, error) {
	s, err := h.settings.GetFirst(ctx)
	if err != nil || s == nil || !s.DiscordOAuthEnabled {
		return nil, nil
	}
	if s.DiscordClientID == nil || *s.DiscordClientID == "" || s.DiscordClientSecret == nil || *s.DiscordClientSecret == "" {
		return nil, nil
	}
	secret, err := h.enc.Decrypt(*s.DiscordClientSecret)
	if err != nil || secret == "" {
		if h.log != nil {
			h.log.Warn("discord client secret cannot be decrypted", "error", err)
		}
		return nil, nil
	}
	redirectURI := ""
	if s.DiscordRedirectURI != nil && *s.DiscordRedirectURI != "" {
		redirectURI = *s.DiscordRedirectURI
	} else {
		redirectURI = strings.TrimSuffix(h.resolved.CORSOrigin, "/") + "/api/v1/auth/discord/callback"
	}
	return &discord.Config{
		ClientID:     *s.DiscordClientID,
		ClientSecret: secret,
		RedirectURI:  redirectURI,
	}, nil
}

// Config handles GET /api/v1/auth/discord/config.
func (h *DiscordHandler) Config(w http.ResponseWriter, r *http.Request) {
	cfg, _ := h.loadDiscordConfig(r.Context())
	enabled := cfg != nil
	buttonText := "Login with Discord"
	if enabled {
		s, _ := h.settings.GetFirst(r.Context())
		if s != nil && s.DiscordButtonText != nil && *s.DiscordButtonText != "" {
			buttonText = *s.DiscordButtonText
		}
	}
	JSON(w, http.StatusOK, map[string]interface{}{
		"enabled":    enabled,
		"buttonText": buttonText,
	})
}

// Login handles GET /api/v1/auth/discord/login.
func (h *DiscordHandler) Login(w http.ResponseWriter, r *http.Request) {
	if h.discordStore == nil {
		ErrorKey(w, r, http.StatusServiceUnavailable, "error.discord_not_available")
		return
	}
	cfg, err := h.loadDiscordConfig(r.Context())
	if err != nil || cfg == nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.discord_not_configured")
		return
	}
	state, err := discord.GenerateState()
	if err != nil {
		if h.log != nil {
			h.log.Error("discord generate state failed", "error", err)
		}
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_initiate_discord_login")
		return
	}
	codeVerifier, _, err := discord.GeneratePKCE()
	if err != nil {
		if h.log != nil {
			h.log.Error("discord generate pkce failed", "error", err)
		}
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_initiate_discord_login")
		return
	}
	authURL, err := cfg.GenerateAuthURL(state, codeVerifier)
	if err != nil {
		if h.log != nil {
			h.log.Error("discord auth url failed", "error", err)
		}
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_initiate_discord_login")
		return
	}
	sessionData := &store.DiscordSessionData{
		CodeVerifier: codeVerifier,
		State:        state,
		Mode:         "login",
		CreatedAt:    time.Now().UnixMilli(),
	}
	ttl := 10 * time.Minute
	if err := h.discordStore.Store(r.Context(), state, sessionData, ttl); err != nil {
		if h.log != nil {
			h.log.Error("discord store session failed", "error", err)
		}
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_initiate_discord_login")
		return
	}
	secure := h.cfg.Env == "production" && (r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https")
	http.SetCookie(w, &http.Cookie{
		Name:     "discord_state",
		Value:    state,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
	http.Redirect(w, r, authURL, http.StatusFound)
}

// Callback handles GET /api/v1/auth/discord/callback.
// Uses relative redirects (e.g. "/login?error=...") so the browser resolves to the same origin
// as the callback request. This avoids ERR_INVALID_REDIRECT from malformed CORS_ORIGIN.
func (h *DiscordHandler) Callback(w http.ResponseWriter, r *http.Request) {
	redirectTo := func(path string) {
		http.Redirect(w, r, path, http.StatusFound)
	}
	if h.discordStore == nil {
		redirectTo("/login?error=Discord+not+available")
		return
	}
	q := r.URL.Query()
	code := q.Get("code")
	state := q.Get("state")
	oauthError := q.Get("error")
	if oauthError != "" {
		if h.log != nil {
			h.log.Error("discord oauth error", "error", oauthError)
		}
		redirectTo("/login?error=Authentication+failed")
		return
	}
	if state == "" || code == "" {
		redirectTo("/login?error=Invalid+authentication+response")
		return
	}
	// A missing cookie must be rejected too: the server-side state is single-use
	// but is not bound to the victim's browser, so accepting nil allows a
	// login CSRF.
	cookieState, err := r.Cookie("discord_state")
	if err != nil || cookieState == nil || cookieState.Value != state {
		redirectTo("/login?error=Invalid+authentication+response")
		return
	}
	sessionData, err := h.discordStore.GetAndDelete(r.Context(), state)
	if err != nil || sessionData == nil {
		redirectTo("/login?error=Session+expired")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "discord_state", Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: isSecureRequest(r)})
	cfg, err := h.loadDiscordConfig(r.Context())
	if err != nil || cfg == nil {
		redirectTo("/login?error=Discord+not+configured")
		return
	}
	accessToken, err := cfg.ExchangeCode(r.Context(), code, sessionData.CodeVerifier)
	if err != nil {
		if h.log != nil {
			h.log.Error("discord token exchange failed", "error", err)
		}
		redirectTo("/login?error=Authentication+failed")
		return
	}
	discordUser, err := discord.GetUser(r.Context(), accessToken)
	if err != nil {
		if h.log != nil {
			h.log.Error("discord get user failed", "error", err)
		}
		redirectTo("/login?error=Authentication+failed")
		return
	}
	avatarURL := discord.AvatarURL(discordUser.ID, discordUser.Avatar)
	var avatarPtr *string
	if avatarURL != "" {
		avatarPtr = &avatarURL
	}

	// Mode: Link
	if sessionData.Mode == "link" {
		userID := sessionData.UserID
		if userID == "" {
			redirectTo("/settings/profile?discord_linked=false")
			return
		}
		existing, _ := h.users.GetByDiscordID(r.Context(), discordUser.ID)
		if existing != nil && existing.ID != userID {
			redirectTo("/settings/profile?discord_linked=false&error=already_linked")
			return
		}
		if err := h.users.UpdateDiscordLink(r.Context(), userID, discordUser.ID, discordUser.Username, avatarPtr); err != nil {
			if h.log != nil {
				h.log.Error("discord link update failed", "error", err)
			}
			redirectTo("/settings/profile?discord_linked=false")
			return
		}
		redirectTo("/settings/profile?discord_linked=true")
		return
	}

	// Mode: Login
	user, _ := h.users.GetByDiscordIDOrEmail(r.Context(), discordUser.ID, discordUser.Email)
	s, _ := h.settings.GetFirst(r.Context())

	// The lookup matches on discord_id OR email, so a row can come back purely
	// because Discord asserted an address. Discord is a public IdP: an
	// unverified address proves nothing.
	matchedByDiscordID := user != nil && user.DiscordID != nil && *user.DiscordID == discordUser.ID
	if !matchedByDiscordID {
		if !discordUser.Verified || discordUser.Email == "" {
			if h.log != nil {
				h.log.Warn("discord login rejected: unverified email",
					"discord_id", discordUser.ID)
			}
			redirectTo("/login?error=Unable+to+sign+in+with+this+account")
			return
		}
		if user != nil && user.DiscordID != nil {
			if h.log != nil {
				h.log.Error("discord login rejected: account is linked to a different discord id",
					"discord_id", discordUser.ID)
			}
			redirectTo("/login?error=Unable+to+sign+in+with+this+account")
			return
		}
	}

	// Auto-create user if signup enabled
	if user == nil && s != nil && s.SignupEnabled {
		baseUsername := usernameSanitize.ReplaceAllString(discordUser.Username, "")
		if len(baseUsername) > 32 {
			baseUsername = baseUsername[:32]
		}
		if baseUsername == "" {
			baseUsername = "discord"
		}
		username := baseUsername
		counter := 1
		for {
			exists, _ := h.users.ExistsByUsernameOrEmail(r.Context(), username, username, "")
			if !exists {
				break
			}
			username = baseUsername + fmt.Sprintf("%d", counter)
			counter++
			if counter > 999 {
				break
			}
		}
		email := discordUser.Email
		if email == "" {
			email = "discord_" + discordUser.ID + "@discord.local"
		}
		defaultRole := "user"
		if s.DefaultUserRole != "" {
			defaultRole = s.DefaultUserRole
		}
		userID := uuid.New().String()
		now := time.Now()
		discordID := discordUser.ID
		discordUsername := discordUser.Username
		if err := h.users.CreateDiscordUser(r.Context(), userID, username, email, defaultRole, &discordID, &discordUsername, avatarPtr, now); err != nil {
			if h.log != nil {
				h.log.Error("discord create user failed", "error", err)
			}
			redirectTo("/login?error=Authentication+failed")
			return
		}
		defaultPrefs := DefaultDashboardPreferencesForNewUser(userID)
		_ = h.dashboardPrefs.ReplaceAll(r.Context(), userID, defaultPrefs)
		user = &models.User{
			ID:              userID,
			Username:        username,
			Email:           email,
			Role:            defaultRole,
			IsActive:        true,
			DiscordID:       &discordUser.ID,
			DiscordUsername: &discordUser.Username,
			DiscordAvatar:   avatarPtr,
		}
		AutoSubscribeIfHosted(h.cfg != nil && h.cfg.AdminMode, h.users, h.log, user)
	}

	// Never adopt an account that already holds a credential: mailbox control
	// would otherwise be enough to take it over, and PatchMon has no
	// self-service password reset. Those users link from Settings instead.
	if user != nil && user.DiscordID == nil && discordUser.Verified && discordUser.Email != "" {
		hasOtherCredential := user.TfaEnabled || user.PasswordHash != nil
		if hasOtherCredential {
			if h.log != nil {
				h.log.Warn("discord auto-link refused: account already has its own credential",
					"user_id", user.ID, "discord_id", discordUser.ID)
			}
			redirectTo("/login?error=An+account+with+this+email+already+exists.+Sign+in+and+link+Discord+from+Settings.")
			return
		}
		existing, _ := h.users.GetByDiscordID(r.Context(), discordUser.ID)
		if existing == nil {
			_ = h.users.UpdateDiscordLink(r.Context(), user.ID, discordUser.ID, discordUser.Username, avatarPtr)
			user.DiscordID = &discordUser.ID
			user.DiscordUsername = &discordUser.Username
			user.DiscordAvatar = avatarPtr
		}
	}

	if user == nil {
		redirectTo("/login?error=Unable+to+sign+in+with+this+account")
		return
	}
	if !user.IsActive {
		redirectTo("/login?error=Account+disabled")
		return
	}
	if err := h.users.UpdateDiscordProfile(r.Context(), user.ID, time.Now(), discordUser.Username, avatarPtr); err != nil {
		if h.log != nil {
			h.log.Warn("discord update profile failed", "error", err)
		}
	}
	h.auth.CompleteDiscordLogin(w, r, user)
}

// Link handles POST /api/v1/auth/discord/link.
func (h *DiscordHandler) Link(w http.ResponseWriter, r *http.Request) {
	if h.discordStore == nil {
		ErrorKey(w, r, http.StatusServiceUnavailable, "error.discord_not_available")
		return
	}
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if userID == "" {
		ErrorKey(w, r, http.StatusUnauthorized, "error.unauthorized")
		return
	}
	cfg, err := h.loadDiscordConfig(r.Context())
	if err != nil || cfg == nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.discord_not_enabled")
		return
	}
	state, err := discord.GenerateState()
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_generate_discord_link")
		return
	}
	codeVerifier, _, err := discord.GeneratePKCE()
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_generate_discord_link")
		return
	}
	authURL, err := cfg.GenerateAuthURL(state, codeVerifier)
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_generate_discord_link")
		return
	}
	sessionData := &store.DiscordSessionData{
		CodeVerifier: codeVerifier,
		State:        state,
		Mode:         "link",
		UserID:       userID,
		CreatedAt:    time.Now().UnixMilli(),
	}
	if err := h.discordStore.Store(r.Context(), state, sessionData, 10*time.Minute); err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_generate_discord_link")
		return
	}
	JSON(w, http.StatusOK, map[string]interface{}{"url": authURL})
}

// Unlink handles POST /api/v1/auth/discord/unlink.
func (h *DiscordHandler) Unlink(w http.ResponseWriter, r *http.Request) {
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
	if user.DiscordID == nil || *user.DiscordID == "" {
		ErrorKey(w, r, http.StatusBadRequest, "error.no_discord_linked")
		return
	}
	hasPassword := user.PasswordHash != nil && *user.PasswordHash != ""
	hasOIDC := user.OidcSub != nil && *user.OidcSub != ""
	if !hasPassword && !hasOIDC {
		ErrorKey(w, r, http.StatusBadRequest, "error.discord_unlink_no_password")
		return
	}
	if err := h.users.UpdateDiscordUnlink(r.Context(), userID); err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_unlink_discord")
		return
	}
	JSON(w, http.StatusOK, map[string]interface{}{"message": "Discord account unlinked successfully"})
}

// GetSettings handles GET /api/v1/auth/discord/settings.
func (h *DiscordHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	s, err := h.settings.GetFirst(r.Context())
	if err != nil {
		JSON(w, http.StatusOK, map[string]interface{}{
			"discord_oauth_enabled":     false,
			"discord_client_id":         nil,
			"discord_client_secret_set": false,
			"discord_redirect_uri":      nil,
			"discord_button_text":       "Login with Discord",
		})
		return
	}
	secretSet := false
	if s.DiscordClientSecret != nil && *s.DiscordClientSecret != "" && h.enc != nil {
		_, err := h.enc.Decrypt(*s.DiscordClientSecret)
		secretSet = err == nil
	}
	JSON(w, http.StatusOK, map[string]interface{}{
		"discord_oauth_enabled":     s.DiscordOAuthEnabled,
		"discord_client_id":         s.DiscordClientID,
		"discord_client_secret_set": secretSet,
		"discord_redirect_uri":      s.DiscordRedirectURI,
		"discord_button_text":       ptrOrDefault(s.DiscordButtonText, "Login with Discord"),
	})
}

// UpdateSettings handles PUT /api/v1/auth/discord/settings.
func (h *DiscordHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	s, err := h.settings.GetFirst(r.Context())
	if err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.load_settings_failed")
		return
	}
	var req map[string]interface{}
	if err := decodeJSON(r, &req); err != nil {
		ErrorKey(w, r, http.StatusBadRequest, "error.invalid_request_body")
		return
	}
	applyDiscordSettingsUpdate(s, req, h.enc)
	if err := h.settings.Update(r.Context(), s); err != nil {
		ErrorKey(w, r, http.StatusInternalServerError, "error.failed_to_update_discord_settings")
		return
	}
	secretSet := false
	if s.DiscordClientSecret != nil && *s.DiscordClientSecret != "" && h.enc != nil {
		_, err := h.enc.Decrypt(*s.DiscordClientSecret)
		secretSet = err == nil
	}
	JSON(w, http.StatusOK, map[string]interface{}{
		"message":                   "Discord settings updated successfully",
		"discord_oauth_enabled":     s.DiscordOAuthEnabled,
		"discord_client_id":         s.DiscordClientID,
		"discord_client_secret_set": secretSet,
		"discord_redirect_uri":      s.DiscordRedirectURI,
		"discord_button_text":       ptrOrDefault(s.DiscordButtonText, "Login with Discord"),
	})
}

func ptrOrDefault(p *string, def string) string {
	if p != nil && *p != "" {
		return *p
	}
	return def
}

func applyDiscordSettingsUpdate(s *models.Settings, req map[string]interface{}, enc *util.Encryption) {
	if v, ok := getReqBool(req, "discord_oauth_enabled", "discordOauthEnabled"); ok {
		s.DiscordOAuthEnabled = v
	}
	if v, ok := getReqString(req, "discord_client_id", "discordClientId"); ok {
		s.DiscordClientID = &v
		if v == "" {
			s.DiscordClientID = nil
		}
	}
	if v, ok := getReqStringOrEmpty(req, "discord_client_secret", "discordClientSecret"); ok {
		if v == "" {
			s.DiscordClientSecret = nil
		} else if util.IsEncrypted(v) {
			s.DiscordClientSecret = &v
		} else if enc != nil {
			encrypted, err := enc.Encrypt(v)
			if err == nil {
				s.DiscordClientSecret = &encrypted
			}
		} else {
			s.DiscordClientSecret = &v
		}
	}
	if v, ok := getReqString(req, "discord_redirect_uri", "discordRedirectUri"); ok {
		s.DiscordRedirectURI = &v
		if v == "" {
			s.DiscordRedirectURI = nil
		}
	}
	if v, ok := getReqString(req, "discord_button_text", "discordButtonText"); ok {
		t := v
		if t == "" {
			t = "Login with Discord"
		}
		s.DiscordButtonText = &t
	}
}
