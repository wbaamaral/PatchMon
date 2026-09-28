package i18n

// Default returns the default locale code.
func Default() string {
	return defaultLg
}

// IsValid returns true if the given locale is a supported locale code
// or normalizes to one (e.g. "pt" → "pt-BR").
func IsValid(locale string) bool {
	if locale == "" {
		return false
	}
	n := Normalize(locale)
	for _, l := range locales {
		if l == n {
			return true
		}
	}
	return false
}
