export const SUPPORTED_LOCALES = ["en", "pt-BR"];
export const DEFAULT_LOCALE = "en";
export const STORAGE_KEY = "patchmon.locale";

export const LANGUAGE_OPTIONS = [
	{ value: "en", label: "English" },
	{ value: "pt-BR", label: "Português (Brasil)" },
];

export function normalizeLocale(raw) {
	if (!raw) return null;
	const lower = raw.toLowerCase();
	if (lower === "pt" || lower.startsWith("pt-") || lower.startsWith("pt_")) {
		return "pt-BR";
	}
	if (lower === "en" || lower.startsWith("en-") || lower.startsWith("en_")) {
		return "en";
	}
	return SUPPORTED_LOCALES.includes(raw) ? raw : null;
}

export function resolveLocale(userLocale) {
	if (userLocale) {
		const n = normalizeLocale(userLocale);
		if (n) return n;
	}
	try {
		if (typeof localStorage !== "undefined") {
			const n = normalizeLocale(localStorage.getItem(STORAGE_KEY));
			if (n) return n;
		}
	} catch {
		// localStorage may be unavailable in some environments
	}
	try {
		if (typeof navigator !== "undefined" && navigator.language) {
			const n = normalizeLocale(navigator.language);
			if (n) return n;
		}
	} catch {
		// navigator may be unavailable
	}
	return DEFAULT_LOCALE;
}
