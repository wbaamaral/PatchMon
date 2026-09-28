import i18n from "../i18n";

/**
 * Locale-aware number formatting.
 */
export function formatNumber(n, opts) {
	return new Intl.NumberFormat(i18n.language, opts).format(n);
}

/**
 * Locale-aware percent formatting. Input is a ratio (0.85 → "85%").
 */
export function formatPercent(ratio, digits = 1) {
	return formatNumber(ratio, {
		style: "percent",
		maximumFractionDigits: digits,
	});
}

/**
 * Locale-aware byte formatting. Unit suffixes are untranslated.
 */
export function formatBytes(bytes) {
	if (bytes == null || Number.isNaN(bytes)) return "—";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = Math.abs(bytes);
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}
	const formatted = formatNumber(value, { maximumFractionDigits: 1 });
	return `${formatted} ${units[unitIndex]}`;
}

/**
 * Locale-aware date formatting for chart ticks and compact displays.
 */
export function formatChartTick(date, opts) {
	return new Intl.DateTimeFormat(i18n.language, opts).format(new Date(date));
}

/**
 * Locale-aware currency formatting.
 */
export function formatCurrency(amount, currency) {
	return new Intl.NumberFormat(i18n.language, {
		style: "currency",
		currency,
	}).format(amount);
}

/**
 * Returns the date-fns locale object for the current i18n language.
 */
export function dateFnsLocale() {
	// date-fns locale packs are loaded on demand by callers if needed
	// This helper just maps the i18n language to the date-fns locale code
	return i18n.language || "en";
}
