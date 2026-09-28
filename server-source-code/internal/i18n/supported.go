package i18n

// Default returns the default locale code.
func Default() string {
	return defaultLg
}

// IsValid returns true if the given locale is a supported locale code
// or normalizes to one (e.g. "pt" → "pt-BR").
// IsValid returns true if the given locale is a supported locale code
// or a recognized variant (e.g. "pt" → "pt-BR", "pt_BR" → "pt-BR").
func IsValid(locale string) bool {
	if locale == "" {
		return false
	}
	// Exact match against supported locales
	for _, l := range locales {
		if l == locale {
			return true
		}
	}
	// Common variants: pt, pt_BR, pt-br, en-US, etc.
	n := Normalize(locale)
	if n != defaultLg {
		return true
	}
	// "en" and variants like "en-US", "en_GB" are valid
	if locale == "en" || (len(locale) >= 2 && locale[:2] == "en") {
		return true
	}
	return false
}
