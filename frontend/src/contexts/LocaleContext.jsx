import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import i18n from "../i18n";
import {
	DEFAULT_LOCALE,
	normalizeLocale,
	resolveLocale,
	STORAGE_KEY,
} from "../i18n/locales";

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
	const [locale, setLocaleState] = useState(() => resolveLocale());

	const setLocale = useCallback((next) => {
		const normalized = normalizeLocale(next) ?? DEFAULT_LOCALE;
		setLocaleState(normalized);
		localStorage.setItem(STORAGE_KEY, normalized);
		i18n.changeLanguage(normalized);
		document.documentElement.lang = normalized;
	}, []);

	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	return (
		<LocaleContext.Provider value={{ locale, setLocale }}>
			{children}
		</LocaleContext.Provider>
	);
}

export function useLocale() {
	const ctx = useContext(LocaleContext);
	if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
	return ctx;
}
