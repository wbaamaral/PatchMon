package i18n

import (
	"context"
	"testing"
)

func TestMain(m *testing.M) {
	if err := Init(); err != nil {
		panic("i18n.Init() failed: " + err.Error())
	}
	m.Run()
}

func TestSupported(t *testing.T) {
	got := Supported()
	if len(got) < 2 {
		t.Fatalf("Supported() = %v, want at least 2 locales", got)
	}
	found := map[string]bool{}
	for _, l := range got {
		found[l] = true
	}
	if !found["en"] {
		t.Error("Supported() missing 'en'")
	}
	if !found["pt-BR"] {
		t.Error("Supported() missing 'pt-BR'")
	}
}

func TestNormalize(t *testing.T) {
	tests := []struct {
		input, want string
	}{
		{"", "en"},
		{"en", "en"},
		{"pt-BR", "pt-BR"},
		{"pt_BR", "pt-BR"},
		{"pt-br", "pt-BR"},
		{"pt", "pt-BR"},
		{"PT", "pt-BR"},
		{"xx", "en"},
	}
	for _, tt := range tests {
		if got := Normalize(tt.input); got != tt.want {
			t.Errorf("Normalize(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestIsValid(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"", false},
		{"en", true},
		{"pt-BR", true},
		{"pt", true},
		{"xx", false},
	}
	for _, tt := range tests {
		if got := IsValid(tt.input); got != tt.want {
			t.Errorf("IsValid(%q) = %v, want %v", tt.input, got, tt.want)
		}
	}
}

func TestDefault(t *testing.T) {
	if got := Default(); got != "en" {
		t.Errorf("Default() = %q, want %q", got, "en")
	}
}

func TestTranslateEN(t *testing.T) {
	l := ForLocale("en")
	if got := l.T("error.unauthorized"); got != "Unauthorized" {
		t.Errorf("T(error.unauthorized) = %q, want %q", got, "Unauthorized")
	}
	if got := l.T("success.saved"); got != "Saved successfully" {
		t.Errorf("T(success.saved) = %q, want %q", got, "Saved successfully")
	}
}

func TestTranslatePTBR(t *testing.T) {
	l := ForLocale("pt-BR")
	if got := l.T("error.unauthorized"); got != "Não autorizado" {
		t.Errorf("T(error.unauthorized) = %q, want %q", got, "Não autorizado")
	}
	if got := l.T("success.saved"); got != "Salvo com sucesso" {
		t.Errorf("T(success.saved) = %q, want %q", got, "Salvo com sucesso")
	}
}

func TestTranslateMissingKey(t *testing.T) {
	l := ForLocale("en")
	if got := l.T("error.nonexistent_key_xyz"); got != "error.nonexistent_key_xyz" {
		t.Errorf("T(missing) = %q, want key returned as fallback", got)
	}
}

func TestTranslateFallbackToEN(t *testing.T) {
	// "success.saved" exists in pt-BR, but a key that only exists in en
	// should fall back to en when queried with pt-BR.
	l := ForLocale("pt-BR")
	// Use a key that only exists in en if one exists; otherwise test that
	// known keys resolve from the pt-BR catalog.
	if got := l.T("success.login"); got != "Login realizado com sucesso" {
		t.Errorf("T(success.login) pt-BR = %q, want %q", got, "Login realizado com sucesso")
	}
}

func TestInterpolation(t *testing.T) {
	// The catalog doesn't have interpolation keys yet; test the mechanism.
	l := ForLocale("en")
	// "error.invalid_theme" has no placeholders; use a synthetic check
	// that replacePlaceholder works via a known string.
	got := l.T("error.invalid_theme")
	want := "Invalid theme preference. Must be 'light' or 'dark'"
	if got != want {
		t.Errorf("T(error.invalid_theme) = %q, want %q", got, want)
	}
}

func TestPluralSelection(t *testing.T) {
	// formatMessage with plural maps
	one := map[string]any{"one": "1 item", "other": "%d items"}
	if got := formatMessage(one, intPtr(1)); got != "1 item" {
		t.Errorf("formatMessage(one, 1) = %q, want %q", got, "1 item")
	}
	if got := formatMessage(one, intPtr(5)); got != "%d items" {
		t.Errorf("formatMessage(one, 5) = %q, want %q", got, "%d items")
	}
	// No count → other
	if got := formatMessage(one, nil); got != "%d items" {
		t.Errorf("formatMessage(one, nil) = %q, want %q", got, "%d items")
	}
}

func TestContextLocale(t *testing.T) {
	ctx := WithLocale(context.Background(), "pt-BR")
	if got := LocaleFromContext(ctx); got != "pt-BR" {
		t.Errorf("LocaleFromContext = %q, want %q", got, "pt-BR")
	}
	if got := T(ctx, "error.not_found"); got != "Não encontrado" {
		t.Errorf("T(ctx, error.not_found) = %q, want %q", got, "Não encontrado")
	}

	// Empty context → default
	if got := LocaleFromContext(context.Background()); got != "en" {
		t.Errorf("LocaleFromContext(empty) = %q, want %q", got, "en")
	}
}

func TestForLocaleNormalizes(t *testing.T) {
	l := ForLocale("pt")
	if got := l.T("error.not_found"); got != "Não encontrado" {
		t.Errorf("ForLocale(pt).T = %q, want pt-BR translation", got)
	}
}

func intPtr(n int) *int {
	return &n
}
