import i18n from "../i18n";

/**
 * Display label overrides for alert types. The internal alert_type IDs (the
 * keys here) MUST stay unchanged across the codebase — they are used by the
 * DB, the API, and external integrations. This map renames the user-visible
 * label only.
 *
 * Values are i18n keys resolved at call time via formatAlertType().
 */
const ALERT_LABEL_KEYS = {
	host_down: "alerts:host_down",
	host_recovered: "alerts:host_recovered",
	// Add future overrides here.
};

/**
 * Resolve a human-readable label for an alert type. Falls back to a Title Case
 * conversion of the snake_case identifier when no override exists.
 */
export const formatAlertType = (type) => {
	if (!type) return "";
	if (ALERT_LABEL_KEYS[type]) return i18n.t(ALERT_LABEL_KEYS[type]);
	return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};
