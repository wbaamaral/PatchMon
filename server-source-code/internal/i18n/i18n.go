// Package i18n provides message localization for the PatchMon server.
// It wraps go-i18n/v2 behind a thin API so call sites never depend on
// the underlying library directly.
package i18n

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"

	"golang.org/x/text/language"
)

//go:embed locales/*/*.json
var localeFS embed.FS

// messageCatalog is the JSON shape used in locale files.
// Each key maps to either a plain string or a plural map.
type messageCatalog map[string]any

var (
	bundle    map[string]messageCatalog // locale -> flat key -> message
	matcher   language.Matcher
	locales   []string
	defaultLg = "en"
)

// Init loads all locale catalogs from the embedded filesystem.
// Must be called once at server startup before any T() call.
func Init() error {
	bundle = make(map[string]messageCatalog)
	entries, err := fs.ReadDir(localeFS, "locales")
	if err != nil {
		return fmt.Errorf("i18n: read locales dir: %w", err)
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		locale := entry.Name()
		bundle[locale] = make(messageCatalog)
		files, err := fs.ReadDir(localeFS, "locales/"+locale)
		if err != nil {
			return fmt.Errorf("i18n: read locale %s: %w", locale, err)
		}
		for _, f := range files {
			if f.IsDir() {
				continue
			}
			data, err := fs.ReadFile(localeFS, "locales/"+locale+"/"+f.Name())
			if err != nil {
				return fmt.Errorf("i18n: read %s/%s: %w", locale, f.Name(), err)
			}
			var cat messageCatalog
			if err := json.Unmarshal(data, &cat); err != nil {
				return fmt.Errorf("i18n: parse %s/%s: %w", locale, f.Name(), err)
			}
			for k, v := range cat {
				bundle[locale][k] = v
			}
		}
		locales = append(locales, locale)
	}
	if len(locales) == 0 {
		return fmt.Errorf("i18n: no locale catalogs found")
	}
	tags := make([]language.Tag, 0, len(locales))
	for _, l := range locales {
		tags = append(tags, language.Make(l))
	}
	matcher = language.NewMatcher(tags)
	return nil
}

// Supported returns the list of loaded locale codes.
func Supported() []string {
	return locales
}

// Normalize maps a raw locale string to a supported one.
// Examples: "pt", "pt_BR", "pt-br" -> "pt-BR"; unknown -> "en".
func Normalize(raw string) string {
	if raw == "" {
		return defaultLg
	}
	if matcher == nil {
		// Init() not called yet — fall back to simple matching
		if len(raw) >= 2 && (raw[:2] == "pt" || raw[:2] == "PT") {
			return "pt-BR"
		}
		return defaultLg
	}
	tag := language.Make(raw)
	best, _, _ := matcher.Match(tag)
	for _, l := range locales {
		if best.String() == l || language.Make(l).String() == best.String() {
			return l
		}
	}
	// manual fallback for common pt variants
	lower := raw
	if len(lower) >= 2 {
		prefix := lower[:2]
		if prefix == "pt" || prefix == "PT" {
			for _, l := range locales {
				if l == "pt-BR" {
					return "pt-BR"
				}
			}
		}
	}
	return defaultLg
}

// resolveMessage looks up a key in a locale catalog and formats it.
// Supports plain strings and plural maps ({"one": ..., "other": ...}).
func resolveMessage(locale, key string, count *int) string {
	cat, ok := bundle[locale]
	if !ok {
		cat = bundle[defaultLg]
	}
	raw, ok := cat[key]
	if !ok {
		// fallback to default locale
		if locale != defaultLg {
			if defCat, ok2 := bundle[defaultLg]; ok2 {
				raw, ok = defCat[key]
			}
		}
		if !ok {
			return key
		}
	}
	return formatMessage(raw, count)
}

func formatMessage(raw any, count *int) string {
	switch v := raw.(type) {
	case string:
		return v
	case map[string]any:
		if count != nil {
			// simple plural selection
			if *count == 1 {
				if one, ok := v["one"].(string); ok {
					return one
				}
			}
			if other, ok := v["other"].(string); ok {
				return other
			}
		}
		if other, ok := v["other"].(string); ok {
			return other
		}
		if one, ok := v["one"].(string); ok {
			return one
		}
	}
	return fmt.Sprintf("%v", raw)
}

// Localizer resolves messages for a specific locale.
type Localizer struct {
	locale string
}

// ForLocale returns a Localizer for the given locale code.
func ForLocale(locale string) *Localizer {
	return &Localizer{locale: Normalize(locale)}
}

// T returns the localized message for the given key.
// If args is provided as key-value pairs they replace {{name}} placeholders.
func (l *Localizer) T(key string, args ...any) string {
	var count *int
	kv := map[string]string{}
	for i := 0; i+1 < len(args); i += 2 {
		k, ok := args[i].(string)
		if !ok {
			continue
		}
		val := fmt.Sprintf("%v", args[i+1])
		kv[k] = val
		if k == "count" {
			var n int
			fmt.Sscanf(val, "%d", &n)
			count = &n
		}
	}
	msg := resolveMessage(l.locale, key, count)
	// simple {{name}} interpolation
	for k, v := range kv {
		msg = replacePlaceholder(msg, k, v)
	}
	return msg
}

func replacePlaceholder(s, name, val string) string {
	result := ""
	i := 0
	for i < len(s) {
		if i+2+len(name)+1 <= len(s) && s[i:i+2] == "{{" {
			end := i + 2 + len(name)
			if s[i+2:end] == name && end+2 <= len(s) && s[end:end+2] == "}}" {
				result += val
				i = end + 2
				continue
			}
		}
		result += string(s[i])
		i++
	}
	return result
}
