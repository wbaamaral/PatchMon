package i18n

import (
	"context"

	"golang.org/x/text/language"
)

type ctxKey struct{}

// WithLocale stores a locale tag in the context.
func WithLocale(ctx context.Context, locale string) context.Context {
	return context.WithValue(ctx, ctxKey{}, Normalize(locale))
}

// LocaleFromContext returns the locale stored in the context, or "en".
func LocaleFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKey{}).(string); ok {
		return v
	}
	return defaultLg
}

// T returns the localized message for the given key using the locale from ctx.
// Extra args are key-value pairs for {{name}} interpolation.
func T(ctx context.Context, key string, args ...any) string {
	return ForLocale(LocaleFromContext(ctx)).T(key, args...)
}

// Tag returns a language.Tag for the given locale code.
func Tag(locale string) language.Tag {
	return language.Make(Normalize(locale))
}
