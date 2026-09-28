import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, resolveLocale } from "./locales";

import enAlerts from "./locales/en/alerts.json";
import enAuth from "./locales/en/auth.json";
import enAutomation from "./locales/en/automation.json";
import enBilling from "./locales/en/billing.json";
import enCommon from "./locales/en/common.json";
import enCompliance from "./locales/en/compliance.json";
import enDashboard from "./locales/en/dashboard.json";
import enDocker from "./locales/en/docker.json";
import enErrors from "./locales/en/errors.json";
import enHosts from "./locales/en/hosts.json";
import enNav from "./locales/en/nav.json";
import enPackages from "./locales/en/packages.json";
import enPatching from "./locales/en/patching.json";
import enProfile from "./locales/en/profile.json";
import enReporting from "./locales/en/reporting.json";
import enRepositories from "./locales/en/repositories.json";
import enSettings from "./locales/en/settings.json";
import ptBRAlerts from "./locales/pt-BR/alerts.json";
import ptBRAuth from "./locales/pt-BR/auth.json";
import ptBRAutomation from "./locales/pt-BR/automation.json";
import ptBRBilling from "./locales/pt-BR/billing.json";
import ptBRCommon from "./locales/pt-BR/common.json";
import ptBRCompliance from "./locales/pt-BR/compliance.json";
import ptBRDashboard from "./locales/pt-BR/dashboard.json";
import ptBRDocker from "./locales/pt-BR/docker.json";
import ptBRErrors from "./locales/pt-BR/errors.json";
import ptBRHosts from "./locales/pt-BR/hosts.json";
import ptBRNav from "./locales/pt-BR/nav.json";
import ptBRPackages from "./locales/pt-BR/packages.json";
import ptBRPatching from "./locales/pt-BR/patching.json";
import ptBRProfile from "./locales/pt-BR/profile.json";
import ptBRReporting from "./locales/pt-BR/reporting.json";
import ptBRRepositories from "./locales/pt-BR/repositories.json";
import ptBRSettings from "./locales/pt-BR/settings.json";

const resources = {
	en: {
		common: enCommon,
		nav: enNav,
		alerts: enAlerts,
		hosts: enHosts,
		patching: enPatching,
		compliance: enCompliance,
		settings: enSettings,
		reporting: enReporting,
		errors: enErrors,
		auth: enAuth,
		dashboard: enDashboard,
		packages: enPackages,
		docker: enDocker,
		profile: enProfile,
		billing: enBilling,
		automation: enAutomation,
		repositories: enRepositories,
	},
	"pt-BR": {
		common: ptBRCommon,
		nav: ptBRNav,
		alerts: ptBRAlerts,
		hosts: ptBRHosts,
		patching: ptBRPatching,
		compliance: ptBRCompliance,
		settings: ptBRSettings,
		reporting: ptBRReporting,
		errors: ptBRErrors,
		auth: ptBRAuth,
		dashboard: ptBRDashboard,
		packages: ptBRPackages,
		docker: ptBRDocker,
		profile: ptBRProfile,
		billing: ptBRBilling,
		automation: ptBRAutomation,
		repositories: ptBRRepositories,
	},
};

let initialized = false;

export function ensureInit() {
	if (initialized) return;
	initialized = true;

	// In test environment (vitest), force English for deterministic assertions.
	const isTest =
		typeof process !== "undefined" &&
		(process.env.NODE_ENV === "test" || process.env.VITEST);

	i18next.use(initReactI18next).init({
		resources,
		lng: isTest ? DEFAULT_LOCALE : resolveLocale(),
		fallbackLng: DEFAULT_LOCALE,
		defaultNS: "common",
		interpolation: {
			escapeValue: false,
		},
		react: {
			useSuspense: false,
		},
	});
}

// Eager init at module load — must happen before any useTranslation call
ensureInit();

export default i18next;
