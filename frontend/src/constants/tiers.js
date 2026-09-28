// Tier feature matrix — hardcoded from
// docs/research/per-host-pricing/10-tiers-v2-starter-plus-max.md §1.
//
// Kept in lockstep with `patchmon.net-new-website/src/data/tiers.ts` and
// the module catalog in `multi-tenancy/go-manager/internal/modules/catalog.go`.
// If the marketing tier table changes, update this file too.

import i18n from "../i18n";

export const TIER_ORDER = ["starter", "plus", "max"];

export const TIERS = {
	starter: {
		id: "starter",
		nameKey: "billing:tiers.starter.name",
		taglineKey: "billing:tiers.starter.tagline",
		userLimit: 3,
		unitAmountCents: 100, // per host / month (psychological parity across USD/GBP/EUR)
		// Tailwind badge classes — match Packages list in the manager
		badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
		accentClass: "border-sky-500 ring-sky-500",
	},
	plus: {
		id: "plus",
		nameKey: "billing:tiers.plus.name",
		taglineKey: "billing:tiers.plus.tagline",
		userLimit: null, // unlimited
		unitAmountCents: 200,
		badgeClass:
			"bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
		accentClass: "border-indigo-500 ring-indigo-500",
	},
	max: {
		id: "max",
		nameKey: "billing:tiers.max.name",
		taglineKey: "billing:tiers.max.tagline",
		userLimit: null,
		unitAmountCents: 300,
		badgeClass:
			"bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
		accentClass: "border-purple-500 ring-purple-500",
	},
};

// Feature matrix rows. `value` entries are boolean or an i18n key string
// (resolved at render time with `i18n.t(v)`).
export const TIER_FEATURES = [
	{
		labelKey: "billing:tiers.features.core_monitoring",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.agents",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.host_groups_dashboards",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.basic_alerts",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.scheduled_reports",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.notification_destinations",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.tfa_totp",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.trusted_devices",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.oidc_sso",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.discord_oauth",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.builtin_roles",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.rest_api_tokens",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.automation",
		starter: true,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.user_limit",
		starter: "billing:tiers.values.three",
		plus: "billing:tiers.values.unlimited",
		max: "billing:tiers.values.unlimited",
	},
	{
		labelKey: "billing:tiers.features.manual_patch_runs",
		starter: false,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.patch_policies",
		starter: false,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.docker_monitoring",
		starter: false,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.advanced_alerts",
		starter: false,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.custom_rbac",
		starter: false,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.audit_log_export",
		starter: false,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.custom_domain",
		starter: false,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.custom_branding",
		starter: false,
		plus: true,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.ssh_terminal",
		starter: false,
		plus: false,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.rdp",
		starter: false,
		plus: false,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.byoi_ai",
		starter: false,
		plus: false,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.compliance",
		starter: false,
		plus: false,
		max: true,
	},
	{
		labelKey: "billing:tiers.features.support_channels",
		starter: "billing:tiers.values.support_email_discord",
		plus: "billing:tiers.values.support_email_slack_discord",
		max: "billing:tiers.values.support_email_slack_discord_phone",
	},
];

export const getTier = (tierId) => TIERS[tierId] || null;

export const getNextTier = (tierId) => {
	const idx = TIER_ORDER.indexOf(tierId);
	if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
	return TIERS[TIER_ORDER[idx + 1]];
};

// Module → required tier mapping for feature-gating UI.
// MUST stay in sync with RequireModule(...) calls in
// server-source-code/internal/server/router.go. When a new gated module is
// added server-side, add it here and to MODULE_LABEL_KEYS below.
export const MODULE_TIER_MAP = {
	patching: "plus",
	patching_policies: "plus",
	docker: "plus",
	alerts_advanced: "plus",
	rbac_custom: "plus",
	custom_branding: "plus",
	compliance: "max",
	ssh_terminal: "max",
	rdp: "max",
	ai: "max",
};

// Human-readable feature names for upgrade screens (i18n keys).
export const MODULE_LABEL_KEYS = {
	patching: "billing:module_labels.patching",
	patching_policies: "billing:module_labels.patching_policies",
	docker: "billing:module_labels.docker",
	alerts_advanced: "billing:module_labels.alerts_advanced",
	rbac_custom: "billing:module_labels.rbac_custom",
	custom_branding: "billing:module_labels.custom_branding",
	compliance: "billing:module_labels.compliance",
	ssh_terminal: "billing:module_labels.ssh_terminal",
	rdp: "billing:module_labels.rdp",
	ai: "billing:module_labels.ai",
};

// Rows from TIER_FEATURES that a given tier unlocks compared to the previous
// tier. Used by the upgrade screen to show "what you get" when upgrading to
// Plus or Max. Starter-exclusive rows are never shown as an upgrade benefit.
// Values are i18n keys matching TIER_FEATURES labelKeys.
const TIER_UNLOCK_LABEL_KEYS = {
	plus: [
		"billing:tiers.features.manual_patch_runs",
		"billing:tiers.features.patch_policies",
		"billing:tiers.features.docker_monitoring",
		"billing:tiers.features.advanced_alerts",
		"billing:tiers.features.custom_rbac",
		"billing:tiers.features.audit_log_export",
		"billing:tiers.features.custom_branding",
	],
	max: [
		"billing:tiers.features.ssh_terminal",
		"billing:tiers.features.rdp",
		"billing:tiers.features.byoi_ai",
		"billing:tiers.features.compliance",
	],
};

export const getRequiredTier = (moduleKey) =>
	MODULE_TIER_MAP[moduleKey] ?? null;

export const getModuleLabel = (moduleKey) => {
	const key = MODULE_LABEL_KEYS[moduleKey];
	return key ? i18n.t(key) : moduleKey;
};

export const getTierUnlocks = (tierId) =>
	(TIER_UNLOCK_LABEL_KEYS[tierId] ?? []).map((key) => i18n.t(key));
