import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocale } from "../contexts/LocaleContext";
import i18n from "../i18n";

/**
 * Bridges the authenticated user's stored locale preference into the
 * i18n instance. Must live inside AuthProvider.
 */
export default function LocaleSync() {
	const { user } = useAuth();
	const { locale, setLocale } = useLocale();

	useEffect(() => {
		if (user?.locale && user.locale !== locale) {
			setLocale(user.locale);
		}
	}, [user?.locale, locale, setLocale]);

	// Keep X-User-Locale header in sync for API error localization
	useEffect(() => {
		const lng = i18n.language || locale;
		// The axios interceptor reads i18n.language directly, so just ensure
		// the language instance is up to date.
		if (i18n.language !== lng) {
			i18n.changeLanguage(lng);
		}
	}, [locale]);

	return null;
}
