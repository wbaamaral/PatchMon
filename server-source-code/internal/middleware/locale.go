package middleware

import (
	"net/http"

	"github.com/PatchMon/PatchMon/server-source-code/internal/i18n"
)

// Locale resolves the request locale and stores it in the request context.
// Priority: X-User-Locale header > Accept-Language > default "en".
func Locale(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		locale := r.Header.Get("X-User-Locale")
		if locale == "" {
			locale = r.Header.Get("Accept-Language")
		}
		normalized := i18n.Normalize(locale)
		ctx := i18n.WithLocale(r.Context(), normalized)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// LocaleFromRequest extracts the locale already stored in the request context
// (set by the Locale middleware). Falls back to "en".
func LocaleFromRequest(r *http.Request) string {
	return i18n.LocaleFromContext(r.Context())
}
