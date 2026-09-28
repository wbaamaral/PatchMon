import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Bell,
	Check,
	CheckCircle2,
	CheckSquare,
	ChevronLeft,
	ChevronRight,
	Clock,
	Edit2,
	Globe,
	Info,
	Loader2,
	Mail,
	Play,
	Plus,
	RefreshCw,
	Send,
	Slack,
	Square,
	Trash2,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiDiscord, SiNtfy } from "react-icons/si";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useToast } from "../../contexts/ToastContext";
import {
	adminHostsAPI,
	formatRelativeTime,
	hostGroupsAPI,
	notificationsAPI,
} from "../../utils/api";
import {
	detectWebhookFormat,
	WEBHOOK_FORMATS,
	webhookFormatLabel,
} from "../../utils/webhookFormat";

/* ───────────────────── Constants ───────────────────── */

const EVENT_TYPES = [
	{ value: "*", labelKey: "channels.eventTypes.all" },
	{ value: "host_down", labelKey: "channels.eventTypes.host_down" },
	{ value: "host_recovered", labelKey: "channels.eventTypes.host_recovered" },
	{ value: "host_enrolled", labelKey: "channels.eventTypes.host_enrolled" },
	{ value: "host_deleted", labelKey: "channels.eventTypes.host_deleted" },
	{ value: "server_update", labelKey: "channels.eventTypes.server_update" },
	{ value: "agent_update", labelKey: "channels.eventTypes.agent_update" },
	{
		value: "patch_run_started",
		labelKey: "channels.eventTypes.patch_run_started",
	},
	{
		value: "patch_run_completed",
		labelKey: "channels.eventTypes.patch_run_completed",
	},
	{ value: "patch_run_failed", labelKey: "channels.eventTypes.patch_run_failed" },
	{
		value: "patch_run_approved",
		labelKey: "channels.eventTypes.patch_run_approved",
	},
	{
		value: "patch_run_cancelled",
		labelKey: "channels.eventTypes.patch_run_cancelled",
	},
	{
		value: "patch_reboot_required",
		labelKey: "channels.eventTypes.patch_reboot_required",
	},
	{
		value: "compliance_scan_completed",
		labelKey: "channels.eventTypes.compliance_scan_completed",
	},
	{
		value: "compliance_scan_failed",
		labelKey: "channels.eventTypes.compliance_scan_failed",
	},
	{
		value: "container_stopped",
		labelKey: "channels.eventTypes.container_stopped",
	},
	{
		value: "container_started",
		labelKey: "channels.eventTypes.container_started",
	},
	{
		value: "container_image_update_available",
		labelKey: "channels.eventTypes.container_image_update_available",
	},
	{
		value: "ssh_session_started",
		labelKey: "channels.eventTypes.ssh_session_started",
	},
	{
		value: "rdp_session_started",
		labelKey: "channels.eventTypes.rdp_session_started",
	},
	{
		value: "host_security_updates_exceeded",
		labelKey: "channels.eventTypes.host_security_updates_exceeded",
	},
	{
		value: "host_pending_updates_exceeded",
		labelKey: "channels.eventTypes.host_pending_updates_exceeded",
	},
	{ value: "user_login", labelKey: "channels.eventTypes.user_login" },
	{
		value: "user_login_failed",
		labelKey: "channels.eventTypes.user_login_failed",
	},
	{ value: "account_locked", labelKey: "channels.eventTypes.account_locked" },
	{ value: "user_created", labelKey: "channels.eventTypes.user_created" },
	{
		value: "user_role_changed",
		labelKey: "channels.eventTypes.user_role_changed",
	},
	{
		value: "user_tfa_disabled",
		labelKey: "channels.eventTypes.user_tfa_disabled",
	},
];

const SEVERITIES = [
	{ value: "informational", labelKey: "channels.severities.informational" },
	{ value: "warning", labelKey: "channels.severities.warning" },
	{ value: "error", labelKey: "channels.severities.error" },
	{ value: "critical", labelKey: "channels.severities.critical" },
];

const REPORT_SECTIONS = [
	{ id: "executive_summary", labelKey: "channels.reportSections.executive_summary" },
	{ id: "compliance_summary", labelKey: "channels.reportSections.compliance_summary" },
	{ id: "recent_patch_runs", labelKey: "channels.reportSections.recent_patch_runs" },
	{ id: "hosts_offline", labelKey: "channels.reportSections.hosts_offline" },
	{ id: "open_alerts", labelKey: "channels.reportSections.open_alerts" },
	{ id: "hosts_by_updates", labelKey: "channels.reportSections.hosts_by_updates" },
	{
		id: "top_security_packages",
		labelKey: "channels.reportSections.top_security_packages",
	},
];

const CHANNEL_TYPES = [
	{
		value: "webhook",
		labelKey: "channels.channelTypes.webhook.label",
		descriptionKey: "channels.channelTypes.webhook.description",
		icon: Globe,
		brandIcons: { discord: SiDiscord, slack: Slack },
	},
	{
		value: "email",
		labelKey: "channels.channelTypes.email.label",
		descriptionKey: "channels.channelTypes.email.description",
		icon: Mail,
	},
	{
		value: "ntfy",
		labelKey: "channels.channelTypes.ntfy.label",
		descriptionKey: "channels.channelTypes.ntfy.description",
		icon: SiNtfy,
	},
	{
		value: "internal",
		labelKey: "channels.channelTypes.internal.label",
		descriptionKey: "channels.channelTypes.internal.description",
		icon: Bell,
	},
];

const FREQUENCY_OPTIONS = [
	{ value: "daily", labelKey: "channels.frequency.daily" },
	{ value: "weekdays", labelKey: "channels.frequency.weekdays" },
	{ value: "weekly", labelKey: "channels.frequency.weekly" },
	{ value: "monthly", labelKey: "channels.frequency.monthly" },
];

const MONTH_DAY_PRESETS = [
	{ value: "1", labelKey: "channels.monthDay.first" },
	{ value: "15", labelKey: "channels.monthDay.fifteenth" },
	{ value: "L", labelKey: "channels.monthDay.last" },
];

const DAY_LABELS = [
	{ value: "1", shortKey: "channels.days.mon" },
	{ value: "2", shortKey: "channels.days.tue" },
	{ value: "3", shortKey: "channels.days.wed" },
	{ value: "4", shortKey: "channels.days.thu" },
	{ value: "5", shortKey: "channels.days.fri" },
	{ value: "6", shortKey: "channels.days.sat" },
	{ value: "0", shortKey: "channels.days.sun" },
];

const TLS_MODES = [
	{ value: "starttls", labelKey: "channels.tls.modes.starttls" },
	{ value: "tls", labelKey: "channels.tls.modes.tls" },
	{ value: "none", labelKey: "channels.tls.modes.none" },
	{ value: "auto", labelKey: "channels.tls.modes.auto" },
];

const TLS_MODE_DEFAULT_PORTS = {
	starttls: 587,
	tls: 465,
	none: 25,
};

const KNOWN_SMTP_PORTS = new Set([25, 465, 587, 2525]);

export const hydrateTLSMode = (cfg) => {
	if (!cfg || typeof cfg !== "object") return "starttls";
	if (
		typeof cfg.tls_mode === "string" &&
		TLS_MODES.some((m) => m.value === cfg.tls_mode)
	) {
		return cfg.tls_mode;
	}
	if (cfg.use_tls === false) return "none";
	return "auto";
};

export const hydrateAllowInsecureAuth = (cfg) => {
	if (!cfg || typeof cfg !== "object") return false;
	return cfg.allow_insecure_auth === true;
};

const buildCron = (frequency, time, days, monthDay) => {
	const [h, m] = (time || "08:00").split(":");
	const hour = Number.parseInt(h, 10) || 0;
	const minute = Number.parseInt(m, 10) || 0;
	switch (frequency) {
		case "weekdays":
			return `${minute} ${hour} * * 1-5`;
		case "weekly":
			return `${minute} ${hour} * * ${days.length > 0 ? days.join(",") : "1"}`;
		case "monthly":
			return `${minute} ${hour} ${monthDay || "1"} * *`;
		default:
			return `${minute} ${hour} * * *`;
	}
};

const describeSchedule = (expr, t) => {
	if (!expr) return "";
	const parts = expr.trim().split(/\s+/);
	if (parts.length !== 5) return expr;
	const [min, hour, dom, , dow] = parts;
	const h = Number.parseInt(hour, 10);
	const m = Number.parseInt(min, 10);
	const time =
		!Number.isNaN(h) && !Number.isNaN(m)
			? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
			: null;
	if (!time) return expr;
	if (dom === "*" && dow === "*")
		return t("channels.schedule.daily", { time });
	if (dom === "*" && dow === "1-5")
		return t("channels.schedule.weekdays", { time });
	if (dom !== "*" && dow === "*") {
		if (dom === "L")
			return t("channels.schedule.lastDayOfMonth", { time });
		const ordinal =
			dom === "1" || dom === "21" || dom === "31"
				? t("channels.schedule.ordinals.st")
				: dom === "2" || dom === "22"
					? t("channels.schedule.ordinals.nd")
					: dom === "3" || dom === "23"
						? t("channels.schedule.ordinals.rd")
						: t("channels.schedule.ordinals.th");
		return t("channels.schedule.dayOfMonth", { day: dom, ordinal, time });
	}
	if (dom === "*" && dow && dow !== "*") {
		const dayNames = {
			0: t("channels.days.sun"),
			1: t("channels.days.mon"),
			2: t("channels.days.tue"),
			3: t("channels.days.wed"),
			4: t("channels.days.thu"),
			5: t("channels.days.fri"),
			6: t("channels.days.sat"),
		};
		const days = dow
			.split(",")
			.map((d) => dayNames[d] || d)
			.join(", ");
		return t("channels.schedule.daysAt", { days, time });
	}
	return expr;
};

const channelIcon = (type) => {
	const ct = CHANNEL_TYPES.find((c) => c.value === type);
	if (!ct) return null;
	const Icon = ct.icon;
	return <Icon className="h-4 w-4" />;
};

const INPUT =
	"w-full px-3 py-2 bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-md text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-secondary-400";
const SELECT = `${INPUT} appearance-none`;

const statusBadge = (status) => {
	const ok = status === "sent";
	return (
		<span
			className={`px-2 py-0.5 text-xs font-medium rounded-md ${ok ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}
		>
			{status}
		</span>
	);
};

/* Shows which payload PatchMon will send to the webhook URL as it is typed. */
const WebhookFormatHint = ({ url }) => {
	const { t } = useTranslation("alerts");
	const format = useMemo(() => detectWebhookFormat(url), [url]);
	const meta = webhookFormatLabel(format);

	if (!meta) {
		return (
			<p className="mt-1 text-xs text-secondary-500">
				{t("channels.webhookHint.autoDetect")}
			</p>
		);
	}

	const isGeneric = format === WEBHOOK_FORMATS.GENERIC;
	return (
		<p className="mt-1 flex items-start gap-1.5 text-xs text-secondary-500">
			{isGeneric ? (
				<Info className="h-3.5 w-3.5 shrink-0 mt-px" />
			) : (
				<CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px text-success-600 dark:text-success-400" />
			)}
			<span>
				{t("channels.webhookHint.detectedPrefix")}{" "}
				<span className="font-medium">{meta.label}</span>.{" "}
				{meta.detail}.
			</span>
		</p>
	);
};

/* ───────────────── Destination Modal ───────────────── */

const DestinationModal = ({
	isOpen,
	onClose,
	onSave,
	editingDest,
	isPending,
}) => {
	const [step, setStep] = useState(editingDest ? 2 : 1);
	const [channelType, setChannelType] = useState(
		editingDest?.channel_type || "",
	);
	const [displayName, setDisplayName] = useState(
		editingDest?.display_name || "",
	);
	const [enabled, setEnabled] = useState(editingDest?.enabled !== false);
	const [config, setConfig] = useState(editingDest?._loadedConfig || {});
	const [tlsMode, setTlsMode] = useState(
		editingDest ? hydrateTLSMode(editingDest._loadedConfig || {}) : "starttls",
	);
	const [allowInsecureAuth, setAllowInsecureAuth] = useState(
		hydrateAllowInsecureAuth(editingDest?._loadedConfig),
	);
	const [isTestingSMTP, setIsTestingSMTP] = useState(false);
	const toast = useToast();
	const { t } = useTranslation("alerts");

	if (!isOpen) return null;

	const credentialsSet = Boolean(
		(config.username && String(config.username).length > 0) ||
			(config.password && String(config.password).length > 0),
	);
	const insecureAuthApplies =
		channelType === "email" && tlsMode === "none" && credentialsSet;
	const insecureAuthBlocked = insecureAuthApplies && !allowInsecureAuth;

	const handleSave = () => {
		if (!displayName.trim()) {
			toast.warning(t("channels.destination.validation.displayNameRequired"));
			return;
		}
		if (channelType === "webhook" && !config.url) {
			toast.warning(t("channels.destination.validation.webhookUrlRequired"));
			return;
		}
		if (
			channelType === "email" &&
			(!config.smtp_host || !config.from || !config.to)
		) {
			toast.warning(t("channels.destination.validation.smtpRequired"));
			return;
		}
		if (channelType === "email" && insecureAuthBlocked) {
			toast.warning(
				t("channels.destination.validation.insecureAuthBlocked"),
			);
			return;
		}
		if (channelType === "ntfy" && !config.topic) {
			toast.warning(t("channels.destination.validation.topicRequired"));
			return;
		}
		let outConfig = config;
		if (channelType === "email") {
			// Dual-write tls_mode (new) and use_tls (legacy) so the existing backend
			// read path keeps working for one release while the new mailer rolls out.
			outConfig = {
				...config,
				tls_mode: tlsMode,
				use_tls: tlsMode !== "none",
				allow_insecure_auth: insecureAuthApplies && allowInsecureAuth,
			};
		}
		onSave({
			channel_type: channelType,
			display_name: displayName.trim(),
			config: outConfig,
			enabled,
		});
	};

	const updateConfig = (key, value) =>
		setConfig((p) => ({ ...p, [key]: value }));

	const handleTLSModeChange = (nextMode) => {
		const prevDefault = TLS_MODE_DEFAULT_PORTS[tlsMode];
		const nextDefault = TLS_MODE_DEFAULT_PORTS[nextMode];
		setTlsMode(nextMode);
		const currentPortRaw = config.smtp_port;
		const currentPort =
			typeof currentPortRaw === "number"
				? currentPortRaw
				: Number(currentPortRaw);
		const portIsKnownDefault =
			!Number.isNaN(currentPort) &&
			KNOWN_SMTP_PORTS.has(currentPort) &&
			(prevDefault === undefined || currentPort === prevDefault);
		if (
			nextDefault !== undefined &&
			(currentPortRaw === undefined ||
				currentPortRaw === "" ||
				portIsKnownDefault)
		) {
			setConfig((p) => ({ ...p, smtp_port: nextDefault }));
		}
	};

	const handleSendTestEmail = async () => {
		if (!editingDest?.id) {
			toast.warning(t("channels.destination.test.saveFirst"));
			return;
		}
		setIsTestingSMTP(true);
		try {
			const resp = await notificationsAPI.testSMTP(editingDest.id);
			const data = resp?.data || {};
			if (data.ok) {
				toast.success(t("channels.destination.test.sent"));
			} else {
				const stage = data.stage
					? t("channels.destination.test.stageFailed", { stage: data.stage })
					: t("channels.destination.test.failed");
				const message = data.message ? `: ${data.message}` : "";
				toast.error(`${stage}${message}`);
			}
		} catch (err) {
			const apiMsg =
				err?.response?.data?.message ||
				err?.response?.data?.error ||
				err?.message ||
				t("channels.destination.test.sendFailed");
			toast.error(apiMsg);
		} finally {
			setIsTestingSMTP(false);
		}
	};

	const renderFields = () => {
		switch (channelType) {
			case "webhook":
				return (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
								{t("channels.destination.fields.webhookUrl")}{" "}
								<span className="text-danger-500">*</span>
							</label>
							<input
								className={INPUT}
								placeholder={t(
									"channels.destination.fields.webhookUrlPlaceholder",
								)}
								value={config.url || ""}
								onChange={(e) => updateConfig("url", e.target.value)}
							/>
							<WebhookFormatHint url={config.url} />
						</div>
						<div>
							<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
								{t("channels.destination.fields.signingSecret")}
							</label>
							<input
								className={INPUT}
								type="password"
								placeholder={t(
									"channels.destination.fields.signingSecretPlaceholder",
								)}
								value={config.signing_secret || ""}
								onChange={(e) => updateConfig("signing_secret", e.target.value)}
							/>
						</div>
					</div>
				);
			case "email":
				return (
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.smtpHost")}{" "}
									<span className="text-danger-500">*</span>
								</label>
								<input
									className={INPUT}
									placeholder={t(
										"channels.destination.fields.smtpHostPlaceholder",
									)}
									value={config.smtp_host || ""}
									onChange={(e) => updateConfig("smtp_host", e.target.value)}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.smtpPort")}
								</label>
								<input
									className={INPUT}
									type="number"
									placeholder="587"
									value={config.smtp_port || 587}
									onChange={(e) =>
										updateConfig("smtp_port", Number(e.target.value) || 587)
									}
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.username")}
								</label>
								<input
									className={INPUT}
									value={config.username || ""}
									onChange={(e) => updateConfig("username", e.target.value)}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.password")}
								</label>
								<input
									className={INPUT}
									type="password"
									value={config.password || ""}
									onChange={(e) => updateConfig("password", e.target.value)}
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.from")}{" "}
									<span className="text-danger-500">*</span>
								</label>
								<input
									className={INPUT}
									placeholder={t(
										"channels.destination.fields.fromPlaceholder",
									)}
									value={config.from || ""}
									onChange={(e) => updateConfig("from", e.target.value)}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.to")}{" "}
									<span className="text-danger-500">*</span>
								</label>
								<input
									className={INPUT}
									placeholder={t("channels.destination.fields.toPlaceholder")}
									value={config.to || ""}
									onChange={(e) => updateConfig("to", e.target.value)}
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
								{t("channels.destination.fields.tlsMode")}
							</label>
							<select
								className={`${SELECT} min-h-[44px]`}
								value={tlsMode}
								onChange={(e) => handleTLSModeChange(e.target.value)}
							>
								{TLS_MODES.map((m) => (
									<option key={m.value} value={m.value}>
										{t(m.labelKey)}
									</option>
								))}
							</select>
							<p className="mt-1 text-xs text-secondary-500">
								{t(`channels.tls.help.${tlsMode}`)}
							</p>
						</div>
						{insecureAuthApplies && (
							<div className="bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-700 rounded-md p-3">
								<p className="text-sm text-danger-700 dark:text-danger-300">
									{t("channels.destination.insecure.warning")}
								</p>
								<button
									type="button"
									aria-pressed={allowInsecureAuth}
									onClick={() => setAllowInsecureAuth((v) => !v)}
									className="mt-2 flex w-full items-center gap-2 min-h-[44px] text-left text-sm font-medium text-danger-800 dark:text-danger-200"
								>
									{allowInsecureAuth ? (
										<CheckSquare className="h-5 w-5 flex-shrink-0 text-danger-600 dark:text-danger-400" />
									) : (
										<Square className="h-5 w-5 flex-shrink-0 text-danger-500 dark:text-danger-400" />
									)}
									{t("channels.destination.insecure.checkbox")}
								</button>
								{insecureAuthBlocked && (
									<p className="mt-2 text-sm text-danger-700 dark:text-danger-300">
										{t("channels.destination.insecure.blocked")}
									</p>
								)}
							</div>
						)}
					</div>
				);
			case "ntfy":
				return (
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.serverUrl")}
								</label>
								<input
									className={INPUT}
									placeholder={t(
										"channels.destination.fields.serverUrlPlaceholder",
									)}
									value={config.server_url || ""}
									onChange={(e) => updateConfig("server_url", e.target.value)}
								/>
								<p className="mt-1 text-xs text-secondary-500">
									{t("channels.destination.fields.serverUrlHelp")}
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.topic")}{" "}
									<span className="text-danger-500">*</span>
								</label>
								<input
									className={INPUT}
									placeholder={t("channels.destination.fields.topicPlaceholder")}
									value={config.topic || ""}
									onChange={(e) => updateConfig("topic", e.target.value)}
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
								{t("channels.destination.fields.accessToken")}
							</label>
							<input
								className={INPUT}
								type="password"
								placeholder={t("channels.destination.fields.optional")}
								value={config.token || ""}
								onChange={(e) => updateConfig("token", e.target.value)}
							/>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.username")}
								</label>
								<input
									className={INPUT}
									placeholder={t(
										"channels.destination.fields.optionalBasicAuth",
									)}
									value={config.username || ""}
									onChange={(e) => updateConfig("username", e.target.value)}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
									{t("channels.destination.fields.password")}
								</label>
								<input
									className={INPUT}
									type="password"
									value={config.password || ""}
									onChange={(e) => updateConfig("password", e.target.value)}
								/>
							</div>
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			onClick={onClose}
		>
			<div
				className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-lg w-full mx-4 relative z-10"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-600 flex items-center justify-between">
					<h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
						{editingDest
							? t("channels.destination.title.edit")
							: step === 1
								? t("channels.destination.title.choose")
								: t("channels.destination.title.configure")}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-secondary-400 hover:text-secondary-600 dark:hover:text-white"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="px-6 py-5">
					{step === 1 && !editingDest && (
						<div className="grid grid-cols-3 gap-4">
							{CHANNEL_TYPES.filter((ct) => ct.value !== "internal").map(
								(ct) => {
									const Icon = ct.icon;
									return (
										<button
											key={ct.value}
											type="button"
											className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
												channelType === ct.value
													? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
													: "border-secondary-300 dark:border-secondary-600 hover:border-primary-400"
											}`}
											onClick={() => setChannelType(ct.value)}
										>
											<Icon className="h-10 w-10 text-secondary-700 dark:text-secondary-200 mb-2" />
											<span className="text-sm font-medium text-secondary-900 dark:text-white">
												{t(ct.labelKey)}
											</span>
											<span className="text-xs text-secondary-500 mt-1 text-center">
												{t(ct.descriptionKey)}
											</span>
										</button>
									);
								},
							)}
						</div>
					)}

					{step === 2 && (
						<div className="space-y-5">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
										{t("channels.destination.fields.displayName")}{" "}
										<span className="text-danger-500">*</span>
									</label>
									<input
										className={INPUT}
										placeholder={t(
											"channels.destination.fields.displayNamePlaceholder",
										)}
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
									/>
								</div>
								<div className="flex items-end pb-1">
									<label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white">
										<div
											className={`relative inline-flex h-5 w-9 items-center rounded-md transition-colors ${enabled ? "bg-primary-600 dark:bg-primary-500" : "bg-secondary-200 dark:bg-secondary-600"}`}
											onClick={() => setEnabled(!enabled)}
											onKeyDown={() => {}}
										>
											<span
												className={`inline-block h-3 w-3 transform rounded-md bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-1"}`}
											/>
										</div>
										{t("channels.common.enabled")}
									</label>
								</div>
							</div>
							{renderFields()}
						</div>
					)}
				</div>

				<div className="px-6 py-4 border-t border-secondary-200 dark:border-secondary-600 flex justify-between">
					{step === 2 && !editingDest ? (
						<button
							type="button"
							className="btn-outline flex items-center gap-1"
							onClick={() => setStep(1)}
						>
							<ChevronLeft className="h-4 w-4" /> {t("channels.actions.back")}
						</button>
					) : (
						<div />
					)}
					<div className="flex flex-wrap gap-2">
						<button type="button" className="btn-outline" onClick={onClose}>
							{t("channels.actions.cancel")}
						</button>
						{step === 2 && channelType === "email" && (
							<button
								type="button"
								className="btn-outline flex items-center gap-1 min-h-[44px]"
								disabled={
									!editingDest?.id ||
									isPending ||
									isTestingSMTP ||
									insecureAuthBlocked
								}
								onClick={handleSendTestEmail}
								title={
									!editingDest?.id
										? t("channels.destination.test.saveFirst")
										: t("channels.destination.test.tooltip")
								}
							>
								{isTestingSMTP ? (
									<RefreshCw className="h-4 w-4 animate-spin" />
								) : (
									<Send className="h-4 w-4" />
								)}
								{isTestingSMTP
									? t("channels.destination.test.sending")
									: t("channels.destination.test.send")}
							</button>
						)}
						{step === 1 && (
							<button
								type="button"
								className="btn-primary"
								disabled={!channelType}
								onClick={() => setStep(2)}
							>
								{t("channels.actions.next")}{" "}
								<ChevronRight className="h-4 w-4 inline ml-1" />
							</button>
						)}
						{step === 2 && (
							<button
								type="button"
								className="btn-primary flex items-center gap-1"
								disabled={isPending || isTestingSMTP || insecureAuthBlocked}
								onClick={handleSave}
							>
								{isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Check className="h-4 w-4" />
								)}
								{editingDest
									? t("channels.actions.save")
									: t("channels.actions.create")}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

/* ───────────────── Route Modal ───────────────── */

const RouteModal = ({
	isOpen,
	onClose,
	onSave,
	editingRoute,
	destinations,
	hostGroups,
	hosts,
	isPending,
}) => {
	const parseArr = (v) => (Array.isArray(v) ? v : []);
	const [form, setForm] = useState({
		destination_id: editingRoute?.destination_id || "",
		event_types:
			parseArr(editingRoute?.event_types).length > 0
				? parseArr(editingRoute.event_types)
				: ["*"],
		min_severity: editingRoute?.min_severity || "informational",
		host_group_ids: parseArr(editingRoute?.host_group_ids),
		host_ids: parseArr(editingRoute?.host_ids),
		enabled: editingRoute?.enabled !== false,
	});
	const toast = useToast();
	const { t } = useTranslation("alerts");

	if (!isOpen) return null;

	const handleSave = () => {
		if (!form.destination_id) {
			toast.warning(t("channels.route.validation.chooseDestination"));
			return;
		}
		onSave({
			destination_id: form.destination_id,
			event_types: form.event_types.length > 0 ? form.event_types : ["*"],
			min_severity: form.min_severity,
			host_group_ids: form.host_group_ids,
			host_ids: form.host_ids,
			enabled: form.enabled,
		});
	};

	const upd = (key, value) => setForm((p) => ({ ...p, [key]: value }));
	const toggleArr = (key, id) =>
		setForm((p) => ({
			...p,
			[key]: p[key].includes(id)
				? p[key].filter((x) => x !== id)
				: [...p[key], id],
		}));

	const allEventValues = EVENT_TYPES.filter((e) => e.value !== "*").map(
		(e) => e.value,
	);

	const toggleEvent = (value) => {
		if (value === "*") {
			// Toggle: if all selected, clear all; if not all, select all
			setForm((p) =>
				p.event_types.includes("*")
					? { ...p, event_types: [] }
					: { ...p, event_types: ["*"] },
			);
			return;
		}
		setForm((p) => {
			// If currently "all", expand to individual events then remove the clicked one
			const next = p.event_types.includes("*")
				? allEventValues.filter((v) => v !== value)
				: p.event_types.includes(value)
					? p.event_types.filter((x) => x !== value)
					: [...p.event_types, value];
			// If all individual events are selected, collapse back to wildcard
			if (next.length >= allEventValues.length)
				return { ...p, event_types: ["*"] };
			return { ...p, event_types: next.length > 0 ? next : ["*"] };
		});
	};

	const allEvents = form.event_types.includes("*");

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			onClick={onClose}
		>
			<div
				className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-lg w-full mx-4 relative z-10 max-h-[90vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-600 flex items-center justify-between sticky top-0 bg-white dark:bg-secondary-800 z-10">
					<h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
						{editingRoute
							? t("channels.route.title.edit")
							: t("channels.route.title.add")}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-secondary-400 hover:text-secondary-600 dark:hover:text-white"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="px-6 py-5 space-y-5">
					<div>
						<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
							{t("channels.route.fields.destination")}{" "}
							<span className="text-danger-500">*</span>
						</label>
						<select
							className={SELECT}
							value={form.destination_id}
							onChange={(e) => upd("destination_id", e.target.value)}
						>
							<option value="">
								{t("channels.route.fields.destinationPlaceholder")}
							</option>
							{destinations.map((d) => (
								<option key={d.id} value={d.id}>
									{d.display_name} ({d.channel_type})
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-2">
							{t("channels.route.fields.events")}
						</label>
						<div className="space-y-1.5">
							<label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white font-medium">
								<input
									type="checkbox"
									checked={allEvents}
									onChange={() => toggleEvent("*")}
								/>
								{t("channels.eventTypes.all")}
							</label>
							<div className="grid grid-cols-2 gap-1.5 pl-4 pt-1">
								{EVENT_TYPES.filter((e) => e.value !== "*").map((o) => (
									<label
										key={o.value}
										className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white"
									>
										<input
											type="checkbox"
											checked={allEvents || form.event_types.includes(o.value)}
											onChange={() => toggleEvent(o.value)}
										/>
										{t(o.labelKey)}
									</label>
								))}
							</div>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
							{t("channels.route.fields.minSeverity")}
						</label>
						<select
							className={SELECT}
							value={form.min_severity}
							onChange={(e) => upd("min_severity", e.target.value)}
						>
							{SEVERITIES.map((o) => (
								<option key={o.value} value={o.value}>
									{t(o.labelKey)}
								</option>
							))}
						</select>
					</div>

					{hostGroups.length > 0 && (
						<div>
							<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-2">
								{t("channels.route.fields.hostGroups")}{" "}
								<span className="text-xs font-normal text-secondary-500">
									{t("channels.route.fields.optionalAll")}
								</span>
							</label>
							<div className="space-y-1.5 max-h-40 overflow-y-auto">
								{hostGroups.map((g) => (
									<label
										key={g.id}
										className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white"
									>
										<input
											type="checkbox"
											checked={form.host_group_ids.includes(g.id)}
											onChange={() => toggleArr("host_group_ids", g.id)}
										/>
										{g.name || g.id}
									</label>
								))}
							</div>
						</div>
					)}

					{hosts.length > 0 && (
						<div>
							<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-2">
								{t("channels.route.fields.individualHosts")}{" "}
								<span className="text-xs font-normal text-secondary-500">
									{t("channels.route.fields.optionalAll")}
								</span>
							</label>
							<div className="space-y-1.5 max-h-40 overflow-y-auto">
								{hosts.map((h) => (
									<label
										key={h.id}
										className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white"
									>
										<input
											type="checkbox"
											checked={form.host_ids.includes(h.id)}
											onChange={() => toggleArr("host_ids", h.id)}
										/>
										{h.friendly_name || h.hostname || h.id}
									</label>
								))}
							</div>
						</div>
					)}

					<label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white">
						<input
							type="checkbox"
							checked={form.enabled}
							onChange={(e) => upd("enabled", e.target.checked)}
						/>
						{t("channels.common.enabled")}
					</label>
				</div>
				<div className="px-6 py-4 border-t border-secondary-200 dark:border-secondary-600 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-secondary-800">
					<button type="button" className="btn-outline" onClick={onClose}>
						{t("channels.actions.cancel")}
					</button>
					<button
						type="button"
						className="btn-primary flex items-center gap-1"
						disabled={isPending}
						onClick={handleSave}
					>
						{isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Check className="h-4 w-4" />
						)}
						{editingRoute
							? t("channels.actions.save")
							: t("channels.actions.add")}
					</button>
				</div>
			</div>
		</div>
	);
};

/* ───────────────── Report Modal ───────────────── */

const ReportModal = ({
	isOpen,
	onClose,
	onSave,
	editingReport,
	destinations,
	hostGroups,
	isPending,
}) => {
	const defRow = editingReport?.definition || {};

	// Parse existing cron on init
	const parseCronInit = () => {
		let frequency = "daily";
		let time = "08:00";
		let days = ["1"];
		let monthDay = "1";
		if (editingReport?.cron_expr) {
			const parts = editingReport.cron_expr.trim().split(/\s+/);
			if (parts.length === 5) {
				const [min, hour, dom, , dow] = parts;
				const h = Number.parseInt(hour, 10);
				const m = Number.parseInt(min, 10);
				if (!Number.isNaN(h) && !Number.isNaN(m)) {
					time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
				}
				if (dow === "1-5") frequency = "weekdays";
				else if (dom !== "*") {
					frequency = "monthly";
					monthDay = dom;
				} else if (dow && dow !== "*") {
					frequency = "weekly";
					days = dow.split(",");
				}
			}
		}
		return { frequency, time, days, monthDay };
	};
	const cronInit = parseCronInit();

	const [form, setForm] = useState({
		name: editingReport?.name || "",
		frequency: cronInit.frequency,
		time: cronInit.time,
		days: cronInit.days,
		monthDay: cronInit.monthDay,
		enabled: editingReport?.enabled !== false,
		destination_ids: Array.isArray(editingReport?.destination_ids)
			? editingReport.destination_ids
			: [],
		sections:
			Array.isArray(defRow.sections) && defRow.sections.length > 0
				? defRow.sections
				: ["executive_summary", "compliance_summary", "recent_patch_runs"],
		host_group_ids: Array.isArray(defRow.host_group_ids)
			? defRow.host_group_ids
			: [],
		top_hosts: defRow.limits?.top_hosts ?? 20,
	});
	const toast = useToast();
	const { t } = useTranslation("alerts");

	if (!isOpen) return null;

	const upd = (key, value) => setForm((p) => ({ ...p, [key]: value }));
	const toggleArr = (key, id) =>
		setForm((p) => ({
			...p,
			[key]: p[key].includes(id)
				? p[key].filter((x) => x !== id)
				: [...p[key], id],
		}));

	const toggleDay = (d) =>
		setForm((p) => ({
			...p,
			days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d],
		}));

	const handleSave = () => {
		if (!form.name.trim()) {
			toast.warning(t("channels.report.validation.nameRequired"));
			return;
		}
		if (form.frequency === "weekly" && form.days.length === 0) {
			toast.warning(t("channels.report.validation.selectDay"));
			return;
		}
		const cronExpr = buildCron(
			form.frequency,
			form.time,
			form.days,
			form.monthDay,
		);
		onSave({
			name: form.name.trim(),
			cron_expr: cronExpr,
			enabled: form.enabled,
			definition: {
				version: 1,
				sections: form.sections,
				host_group_ids: form.host_group_ids,
				limits: { top_hosts: Number(form.top_hosts) || 20 },
			},
			destination_ids: form.destination_ids,
		});
	};

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			onClick={onClose}
		>
			<div
				className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-lg w-full mx-4 relative z-10 max-h-[90vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-600 flex items-center justify-between sticky top-0 bg-white dark:bg-secondary-800 z-10">
					<h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
						{editingReport
							? t("channels.report.title.edit")
							: t("channels.report.title.new")}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-secondary-400 hover:text-secondary-600 dark:hover:text-white"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="px-6 py-5 space-y-5">
					<div>
						<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
							{t("channels.report.fields.reportName")}{" "}
							<span className="text-danger-500">*</span>
						</label>
						<input
							className={INPUT}
							placeholder={t("channels.report.fields.reportNamePlaceholder")}
							value={form.name}
							onChange={(e) => upd("name", e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-2">
							{t("channels.report.fields.schedule")}
						</label>
						<div className="flex flex-wrap gap-3 items-center">
							<select
								className={`${SELECT} w-auto`}
								value={form.frequency}
								onChange={(e) => upd("frequency", e.target.value)}
							>
								{FREQUENCY_OPTIONS.map((p) => (
									<option key={p.value} value={p.value}>
										{t(p.labelKey)}
									</option>
								))}
							</select>
							<span className="text-sm text-secondary-500">
								{t("channels.report.fields.at")}
							</span>
							<input
								type="time"
								className={`${INPUT} w-auto`}
								value={form.time}
								onChange={(e) => upd("time", e.target.value)}
							/>
						</div>
						{form.frequency === "weekly" && (
							<div className="flex gap-1.5 mt-3">
								{DAY_LABELS.map((d) => (
									<button
										key={d.value}
										type="button"
										className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
											form.days.includes(d.value)
												? "bg-primary-600 text-white border-primary-600"
												: "bg-white dark:bg-secondary-900 text-secondary-700 dark:text-secondary-300 border-secondary-300 dark:border-secondary-600 hover:border-primary-400"
										}`}
										onClick={() => toggleDay(d.value)}
									>
										{t(d.shortKey)}
									</button>
								))}
							</div>
						)}
						{form.frequency === "monthly" && (
							<div className="mt-3 space-y-2">
								<div className="flex gap-1.5 flex-wrap">
									{MONTH_DAY_PRESETS.map((p) => (
										<button
											key={p.value}
											type="button"
											className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
												form.monthDay === p.value
													? "bg-primary-600 text-white border-primary-600"
													: "bg-white dark:bg-secondary-900 text-secondary-700 dark:text-secondary-300 border-secondary-300 dark:border-secondary-600 hover:border-primary-400"
											}`}
											onClick={() => upd("monthDay", p.value)}
										>
											{t(p.labelKey)}
										</button>
									))}
									<span className="text-sm text-secondary-500 self-center px-1">
										{t("channels.monthDay.or")}
									</span>
									<input
										type="number"
										min={1}
										max={31}
										placeholder={t("channels.monthDay.dayPlaceholder")}
										className={`${INPUT} w-20 text-center`}
										value={
											!["1", "15", "L"].includes(form.monthDay)
												? form.monthDay
												: ""
										}
										onChange={(e) => {
											const v = e.target.value;
											if (v === "") return;
											const n = Math.max(1, Math.min(31, Number(v) || 1));
											upd("monthDay", String(n));
										}}
										onFocus={() => {
											if (["1", "15", "L"].includes(form.monthDay))
												upd("monthDay", "");
										}}
									/>
								</div>
							</div>
						)}
						<p className="mt-2 text-xs text-secondary-500 flex items-center gap-1">
							<Clock className="h-3 w-3" />{" "}
							{t("channels.report.fields.serverTimezone")}
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-2">
							{t("channels.report.fields.sections")}
						</label>
						<div className="grid grid-cols-2 gap-2">
							{REPORT_SECTIONS.map((s) => (
								<label
									key={s.id}
									className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white"
								>
									<input
										type="checkbox"
										checked={form.sections.includes(s.id)}
										onChange={() => toggleArr("sections", s.id)}
									/>
									{t(s.labelKey)}
								</label>
							))}
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-2">
							{t("channels.report.fields.deliverTo")}
						</label>
						{destinations.length === 0 ? (
							<p className="text-xs text-secondary-500">
								{t("channels.report.fields.addDestinationFirst")}
							</p>
						) : (
							<div className="space-y-1.5">
								{destinations.map((d) => (
									<label
										key={d.id}
										className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white"
									>
										<input
											type="checkbox"
											checked={form.destination_ids.includes(d.id)}
											onChange={() => toggleArr("destination_ids", d.id)}
										/>
										{channelIcon(d.channel_type)}
										{d.display_name}
									</label>
								))}
							</div>
						)}
					</div>

					{hostGroups.length > 0 && (
						<div>
							<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-2">
								{t("channels.report.fields.scopeToHostGroups")}
							</label>
							<div className="space-y-1.5">
								{hostGroups.map((g) => (
									<label
										key={g.id}
										className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white"
									>
										<input
											type="checkbox"
											checked={form.host_group_ids.includes(g.id)}
											onChange={() => toggleArr("host_group_ids", g.id)}
										/>
										{g.name || g.id}
									</label>
								))}
							</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-secondary-700 dark:text-white mb-1">
								{t("channels.report.fields.topRows")}
							</label>
							<input
								className={INPUT}
								type="number"
								min={1}
								value={form.top_hosts}
								onChange={(e) => upd("top_hosts", e.target.value)}
							/>
						</div>
						<div className="flex items-end pb-1">
							<label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-white">
								<input
									type="checkbox"
									checked={form.enabled}
									onChange={(e) => upd("enabled", e.target.checked)}
								/>
								{t("channels.common.enabled")}
							</label>
						</div>
					</div>
				</div>
				<div className="px-6 py-4 border-t border-secondary-200 dark:border-secondary-600 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-secondary-800">
					<button type="button" className="btn-outline" onClick={onClose}>
						{t("channels.actions.cancel")}
					</button>
					<button
						type="button"
						className="btn-primary flex items-center gap-1"
						disabled={isPending}
						onClick={handleSave}
					>
						{isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Check className="h-4 w-4" />
						)}
						{editingReport
							? t("channels.actions.save")
							: t("channels.actions.create")}
					</button>
				</div>
			</div>
		</div>
	);
};

/* ───────────────── Main Page ───────────────── */

/** Renders notification management for a specific panel. Used by Reporting page tabs. */
export const NotificationPanel = ({ panel }) => {
	const queryClient = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();
	const { t } = useTranslation("alerts");
	const { canManageNotifications, canViewNotificationLogs, hasPermission } =
		useAuth();
	const canManage = canManageNotifications();
	const canLog = canViewNotificationLogs();
	const canListHostGroups = hasPermission("can_view_hosts");

	// Modal states
	const [destModal, setDestModal] = useState({ open: false, editing: null });
	const [routeModal, setRouteModal] = useState({ open: false, editing: null });
	const [reportModal, setReportModal] = useState({
		open: false,
		editing: null,
	});
	const [logPage, setLogPage] = useState(0);
	const logPageSize = 50;

	// Queries
	const { data: destinations = [], isLoading: destLoading } = useQuery({
		queryKey: ["notifications", "destinations"],
		queryFn: () => notificationsAPI.listDestinations().then((r) => r.data),
		enabled: canManage,
	});
	const { data: routes = [], isLoading: routesLoading } = useQuery({
		queryKey: ["notifications", "routes"],
		queryFn: () => notificationsAPI.listRoutes().then((r) => r.data),
		enabled: canManage,
	});
	const { data: deliveryLog = [], isLoading: logLoading } = useQuery({
		queryKey: ["notifications", "delivery-log", logPage],
		queryFn: () =>
			notificationsAPI
				.listDeliveryLog({ limit: logPageSize, offset: logPage * logPageSize })
				.then((r) => r.data),
		enabled: canLog,
	});
	const { data: scheduledReports = [], isLoading: reportsLoading } = useQuery({
		queryKey: ["notifications", "scheduled-reports"],
		queryFn: () => notificationsAPI.listScheduledReports().then((r) => r.data),
		enabled: canManage,
	});
	const { data: hostGroups = [] } = useQuery({
		queryKey: ["host-groups"],
		queryFn: () => hostGroupsAPI.list().then((r) => r.data ?? []),
		enabled: canManage && canListHostGroups,
	});
	const { data: hostsData } = useQuery({
		queryKey: ["hosts-list"],
		queryFn: () => adminHostsAPI.list().then((r) => r.data),
		enabled: canManage && canListHostGroups,
	});

	const hostGroupOptions = useMemo(
		() => (Array.isArray(hostGroups) ? hostGroups : []),
		[hostGroups],
	);
	const hostOptions = useMemo(
		() => (Array.isArray(hostsData?.data) ? hostsData.data : []),
		[hostsData],
	);
	const destNameMap = useMemo(() => {
		const m = {};
		for (const d of destinations) m[d.id] = d.display_name;
		return m;
	}, [destinations]);
	const hostGroupNameMap = useMemo(() => {
		const m = {};
		for (const g of hostGroupOptions) m[g.id] = g.name || g.id;
		return m;
	}, [hostGroupOptions]);

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["notifications"] });

	// Mutations
	const createDest = useMutation({
		mutationFn: (body) => notificationsAPI.createDestination(body),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.destinations.toasts.created"));
			setDestModal({ open: false, editing: null });
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.actions.createFailed")),
	});
	const updateDest = useMutation({
		mutationFn: ({ id, body }) => notificationsAPI.updateDestination(id, body),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.destinations.toasts.updated"));
			setDestModal({ open: false, editing: null });
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.actions.updateFailed")),
	});
	const deleteDest = useMutation({
		mutationFn: (id) => notificationsAPI.deleteDestination(id),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.destinations.toasts.deleted"));
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.actions.deleteFailed")),
	});
	const testNotify = useMutation({
		mutationFn: (destination_id) => notificationsAPI.test({ destination_id }),
	});

	const createRoute = useMutation({
		mutationFn: (body) => notificationsAPI.createRoute(body),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.routes.toasts.created"));
			setRouteModal({ open: false, editing: null });
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.actions.createFailed")),
	});
	const updateRoute = useMutation({
		mutationFn: ({ id, body }) => notificationsAPI.updateRoute(id, body),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.routes.toasts.updated"));
			setRouteModal({ open: false, editing: null });
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.actions.updateFailed")),
	});
	const deleteRoute = useMutation({
		mutationFn: (id) => notificationsAPI.deleteRoute(id),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.routes.toasts.deleted"));
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.actions.deleteFailed")),
	});

	const createReport = useMutation({
		mutationFn: (body) => notificationsAPI.createScheduledReport(body),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.reports.toasts.created"));
			setReportModal({ open: false, editing: null });
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.actions.createFailed")),
	});
	const updateReport = useMutation({
		mutationFn: ({ id, body }) =>
			notificationsAPI.updateScheduledReport(id, body),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.reports.toasts.updated"));
			setReportModal({ open: false, editing: null });
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.actions.updateFailed")),
	});
	const deleteReport = useMutation({
		mutationFn: (id) => notificationsAPI.deleteScheduledReport(id),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.reports.toasts.deleted"));
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.actions.deleteFailed")),
	});
	const runReportNow = useMutation({
		mutationFn: (id) => notificationsAPI.runScheduledReportNow(id),
		onSuccess: () => {
			invalidate();
			toast.success(t("channels.report.run.scheduled"));
		},
		onError: (err) =>
			toast.error(err.response?.data?.error || t("channels.report.run.failed")),
	});

	const sendTest = (id) => {
		testNotify.mutate(id, {
			onSuccess: () => {
				toast.info(t("channels.toasts.testEnqueued"));
				setTimeout(
					() =>
						queryClient.invalidateQueries({
							queryKey: ["notifications", "delivery-log"],
						}),
					3000,
				);
			},
			onError: (err) =>
				toast.error(
					err.response?.data?.error || err.message || t("channels.toasts.testFailed"),
				),
		});
	};

	const openEditDest = async (d) => {
		let loadedConfig = {};
		if (d.has_secret) {
			try {
				const resp = await notificationsAPI.getDestinationConfig(d.id);
				loadedConfig = resp.data;
			} catch {
				/* fallback to empty */
			}
		}
		setDestModal({
			open: true,
			editing: { ...d, _loadedConfig: loadedConfig },
		});
	};

	const handleDestSave = (data) => {
		if (destModal.editing) {
			updateDest.mutate({ id: destModal.editing.id, body: data });
		} else {
			createDest.mutate(data);
		}
	};

	const handleRouteSave = (data) => {
		if (routeModal.editing) {
			updateRoute.mutate({ id: routeModal.editing.id, body: data });
		} else {
			createRoute.mutate(data);
		}
	};

	const handleReportSave = (data) => {
		if (reportModal.editing) {
			updateReport.mutate({ id: reportModal.editing.id, body: data });
		} else {
			createReport.mutate(data);
		}
	};

	const TH =
		"px-4 py-2 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider";
	const TD =
		"px-4 py-2 text-sm text-secondary-900 dark:text-white whitespace-nowrap";
	const TDW = "px-4 py-2 text-sm text-secondary-900 dark:text-white";
	const W_STATUS = "w-24";
	const W_ACTIONS = "w-36";

	// When used as a standalone page, render all sections. When panel prop is set, render only that section.
	const showAll = !panel;
	const showDest = showAll || panel === "destinations";
	const showRoutes = showAll || panel === "routes";
	const showReports = showAll || panel === "reports";
	const showLog = showAll || panel === "log";

	return (
		<div className="space-y-6">
			{/* Header - only shown on standalone page */}
			{showAll && (
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-secondary-900 dark:text-white">
							{t("channels.title")}
						</h1>
						<p className="text-sm text-secondary-600 dark:text-white mt-1">
							{t("channels.subtitle")}
						</p>
					</div>
					{canLog && (
						<button
							type="button"
							onClick={() =>
								queryClient.invalidateQueries({
									queryKey: ["notifications", "delivery-log"],
								})
							}
							className="btn-outline flex items-center gap-2"
						>
							<RefreshCw className="h-4 w-4" /> {t("channels.actions.refreshLog")}
						</button>
					)}
				</div>
			)}

			{/* ── Destinations ── */}
			{showDest && canManage && (
				<div className="card p-4 md:p-6 space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
							{t("channels.destinations.title")}
						</h2>
						<button
							type="button"
							className="btn-primary flex items-center gap-2"
							onClick={() => setDestModal({ open: true, editing: null })}
						>
							<Plus className="h-4 w-4" /> {t("channels.actions.addDestination")}
						</button>
					</div>

					{destLoading && <Loader2 className="h-5 w-5 animate-spin mx-auto" />}

					{!destLoading && destinations.length === 0 && (
						<div className="rounded-md p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
							<p className="text-sm text-blue-800 dark:text-blue-200">
								{t("channels.destinations.empty")}
							</p>
						</div>
					)}

					{destinations.length > 0 && (
						<div className="overflow-x-auto">
							<table className="min-w-full table-fixed divide-y divide-secondary-200 dark:divide-secondary-600">
								<thead className="bg-secondary-50 dark:bg-secondary-700">
									<tr>
										<th className={`${TH} w-28`}>
											{t("channels.destinations.table.channel")}
										</th>
										<th className={TH}>{t("channels.destinations.table.name")}</th>
										<th className={`${TH} w-20`}>
											{t("channels.destinations.table.enabled")}
										</th>
										<th className={`${TH} ${W_ACTIONS}`}>
											{t("channels.destinations.table.actions")}
										</th>
									</tr>
								</thead>
								<tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-600">
									{destinations.map((d) => {
										const isBuiltIn = d.id === "internal-alerts";
										return (
											<tr
												key={d.id}
												className="hover:bg-secondary-50 dark:hover:bg-secondary-700"
											>
												<td className={TD}>
													<span className="inline-flex items-center gap-2">
														{channelIcon(d.channel_type)}
														{isBuiltIn ? (
															<span className="text-xs text-secondary-500">
																{t("channels.destinations.builtIn")}
															</span>
														) : (
															d.channel_type
														)}
													</span>
												</td>
												<td className={TD}>{d.display_name}</td>
												<td className={TD}>
													<button
														type="button"
														onClick={() =>
															updateDest.mutate({
																id: d.id,
																body: { enabled: !d.enabled },
															})
														}
														disabled={updateDest.isPending}
														className={`relative inline-flex h-5 w-9 items-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
															d.enabled
																? "bg-primary-600 dark:bg-primary-500"
																: "bg-secondary-200 dark:bg-secondary-600"
														} disabled:opacity-50`}
													>
														<span
															className={`inline-block h-3 w-3 transform rounded-md bg-white transition-transform ${d.enabled ? "translate-x-5" : "translate-x-1"}`}
														/>
													</button>
												</td>
												<td className={`${TD} flex items-center gap-2`}>
													{!isBuiltIn && (
														<button
															type="button"
															className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs"
															onClick={() => sendTest(d.id)}
															disabled={testNotify.isPending}
														>
															<Send className="h-3.5 w-3.5" />{" "}
															{t("channels.actions.test")}
														</button>
													)}
													<button
														type="button"
														className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs"
														onClick={() => openEditDest(d)}
													>
														<Edit2 className="h-3.5 w-3.5" />{" "}
														{t("channels.actions.edit")}
													</button>
													{!isBuiltIn && (
														<button
															type="button"
															className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-xs"
															onClick={async () => {
																if (
																	await confirm({
																		title: t("channels.destinations.confirm.deleteTitle"),
																		message: t(
																			"channels.destinations.confirm.deleteMessage",
																			{ name: d.display_name },
																		),
																		confirmLabel: t(
																			"channels.destinations.confirm.deleteConfirm",
																		),
																	})
																)
																	deleteDest.mutate(d.id);
															}}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</button>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{/* ── Event Rules ── */}
			{showRoutes && canManage && (
				<div className="card p-4 md:p-6 space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
							{t("channels.routes.title")}
						</h2>
						<button
							type="button"
							className="btn-primary flex items-center gap-2"
							onClick={() => setRouteModal({ open: true, editing: null })}
							disabled={destinations.length === 0}
						>
							<Plus className="h-4 w-4" /> {t("channels.actions.addEventRule")}
						</button>
					</div>

					{routesLoading && (
						<Loader2 className="h-5 w-5 animate-spin mx-auto" />
					)}

					{!routesLoading && routes.length === 0 && destinations.length > 0 && (
						<div className="rounded-md p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
							<p className="text-sm text-blue-800 dark:text-blue-200">
								{t("channels.routes.empty")}
							</p>
						</div>
					)}

					{routes.length > 0 && (
						<div className="overflow-x-auto">
							<table className="min-w-full table-fixed divide-y divide-secondary-200 dark:divide-secondary-600">
								<thead className="bg-secondary-50 dark:bg-secondary-700">
									<tr>
										<th className={TH}>{t("channels.routes.table.destination")}</th>
										<th className={TH}>{t("channels.routes.table.events")}</th>
										<th className={`${TH} w-32`}>
											{t("channels.routes.table.minSeverity")}
										</th>
										<th className={TH}>{t("channels.routes.table.scope")}</th>
										<th className={`${TH} ${W_STATUS}`}>
											{t("channels.routes.table.status")}
										</th>
										<th className={`${TH} ${W_ACTIONS}`}>
											{t("channels.routes.table.actions")}
										</th>
									</tr>
								</thead>
								<tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-600">
									{routes.map((row) => (
										<tr
											key={row.id}
											className="hover:bg-secondary-50 dark:hover:bg-secondary-700"
										>
											<td className={TD}>
												{row.destination_display_name || row.destination_id}
											</td>
											<td className={TDW}>
												{Array.isArray(row.event_types) &&
												row.event_types.includes("*")
													? t("channels.eventTypes.all")
													: Array.isArray(row.event_types)
														? row.event_types
																.map((e) => e.replace(/_/g, " "))
																.join(", ")
														: t("channels.eventTypes.all")}
											</td>
											<td className={TD}>
												<span
													className={`px-2 py-0.5 text-xs font-medium rounded-md ${
														row.min_severity === "critical"
															? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
															: row.min_severity === "error"
																? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
																: row.min_severity === "warning"
																	? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
																	: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
													}`}
												>
													{row.min_severity}
												</span>
											</td>
											<td className={TDW}>
												{Array.isArray(row.host_group_ids) &&
												row.host_group_ids.length > 0
													? row.host_group_ids
															.map((id) => hostGroupNameMap[id] || id)
															.join(", ")
													: t("channels.routes.scopeAll")}
											</td>
											<td className={TD}>
												<span
													className={`px-2 py-0.5 text-xs font-medium rounded-md ${row.enabled ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300"}`}
												>
													{row.enabled
														? t("channels.status.active")
														: t("channels.status.disabled")}
												</span>
											</td>
											<td className={`${TD} flex items-center gap-2`}>
												<button
													type="button"
													className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs"
													onClick={() =>
														setRouteModal({ open: true, editing: row })
													}
												>
													<Edit2 className="h-3.5 w-3.5" /> {t("channels.actions.edit")}
												</button>
												<button
													type="button"
													className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-xs"
													onClick={async () => {
														if (
															await confirm({
																title: t("channels.routes.confirm.deleteTitle"),
																message: t("channels.routes.confirm.deleteMessage"),
																confirmLabel: t(
																	"channels.routes.confirm.deleteConfirm",
																),
															})
														)
															deleteRoute.mutate(row.id);
													}}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{/* ── Scheduled Reports ── */}
			{showReports && canManage && (
				<div className="card p-4 md:p-6 space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
							{t("channels.reports.title")}
						</h2>
						<button
							type="button"
							className="btn-primary flex items-center gap-2"
							onClick={() => setReportModal({ open: true, editing: null })}
							disabled={destinations.length === 0}
						>
							<Plus className="h-4 w-4" /> {t("channels.actions.newReport")}
						</button>
					</div>

					{reportsLoading && (
						<Loader2 className="h-5 w-5 animate-spin mx-auto" />
					)}

					{!reportsLoading && scheduledReports.length === 0 && (
						<div className="rounded-md p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
							<p className="text-sm text-blue-800 dark:text-blue-200">
								{t("channels.reports.empty")}
							</p>
						</div>
					)}

					{scheduledReports.length > 0 && (
						<div className="overflow-x-auto">
							<table className="min-w-full table-fixed divide-y divide-secondary-200 dark:divide-secondary-600">
								<thead className="bg-secondary-50 dark:bg-secondary-700">
									<tr>
										<th className={`${TH} w-10`} />
										<th className={TH}>{t("channels.reports.table.name")}</th>
										<th className={TH}>{t("channels.reports.table.schedule")}</th>
										<th className={TH}>{t("channels.reports.table.nextRun")}</th>
										<th className={`${TH} ${W_STATUS}`}>
											{t("channels.reports.table.status")}
										</th>
										<th className={`${TH} ${W_ACTIONS}`}>
											{t("channels.reports.table.actions")}
										</th>
									</tr>
								</thead>
								<tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-600">
									{scheduledReports.map((r) => (
										<tr
											key={r.id}
											className="hover:bg-secondary-50 dark:hover:bg-secondary-700"
										>
											<td className="px-2 py-2">
												<button
													type="button"
													className="inline-flex items-center justify-center w-6 h-6 rounded border border-transparent text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-40"
													onClick={() => runReportNow.mutate(r.id)}
													disabled={runReportNow.isPending || !r.enabled}
													title={
														!r.enabled
															? t("channels.report.run.enableFirst")
															: t("channels.report.run.now")
													}
												>
													<Play className="h-3.5 w-3.5" />
												</button>
											</td>
											<td className={TD}>{r.name}</td>
											<td className={TD}>
												<span className="flex items-center gap-1">
													<Clock className="h-3.5 w-3.5 text-secondary-400" />
													{describeSchedule(r.cron_expr, t)}
												</span>
											</td>
											<td className={TD}>
												{r.next_run_at
													? formatRelativeTime(r.next_run_at)
													: " -"}
											</td>
											<td className={TD}>
												<span
													className={`px-2 py-0.5 text-xs font-medium rounded-md ${r.enabled ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300"}`}
												>
													{r.enabled
														? t("channels.status.active")
														: t("channels.status.disabled")}
												</span>
											</td>
											<td className={`${TD} flex items-center gap-2`}>
												<button
													type="button"
													className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs"
													onClick={() =>
														setReportModal({ open: true, editing: r })
													}
												>
													<Edit2 className="h-3.5 w-3.5" /> {t("channels.actions.edit")}
												</button>
												<button
													type="button"
													className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-xs"
													onClick={async () => {
														if (
															await confirm({
																title: t("channels.reports.confirm.deleteTitle"),
																message: t("channels.reports.confirm.deleteMessage", {
																	name: r.name,
																}),
																confirmLabel: t(
																	"channels.reports.confirm.deleteConfirm",
																),
															})
														)
															deleteReport.mutate(r.id);
													}}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{/* ── Delivery Log ── */}
			{showLog && canLog && (
				<div className="card p-4 md:p-6 space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
							{t("channels.log.title")}
						</h2>
						{logLoading && <Loader2 className="h-5 w-5 animate-spin" />}
					</div>

					{!logLoading && deliveryLog.length === 0 ? (
						<p className="text-sm text-secondary-500">
							{t("channels.log.empty")}
						</p>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="min-w-full table-fixed divide-y divide-secondary-200 dark:divide-secondary-600">
									<thead className="bg-secondary-50 dark:bg-secondary-700">
										<tr>
											<th className={`${TH} w-28`}>{t("channels.log.table.time")}</th>
											<th className={`${TH} ${W_STATUS}`}>
												{t("channels.log.table.status")}
											</th>
											<th className={TH}>{t("channels.log.table.event")}</th>
											<th className={TH}>{t("channels.log.table.destination")}</th>
											<th className={TH}>{t("channels.log.table.reference")}</th>
											<th className={TH}>{t("channels.log.table.error")}</th>
										</tr>
									</thead>
									<tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-600">
										{deliveryLog.map((row) => (
											<tr
												key={row.id}
												className="hover:bg-secondary-50 dark:hover:bg-secondary-700 align-top"
											>
												<td className={TD} title={row.created_at || ""}>
													{row.created_at
														? formatRelativeTime(row.created_at)
														: " -"}
												</td>
												<td className="px-4 py-2">{statusBadge(row.status)}</td>
												<td className={TD}>{row.event_type}</td>
												<td className={TD}>
													{destNameMap[row.destination_id] ||
														row.destination_id}
												</td>
												<td className={TDW}>
													{(() => {
														const rid =
															typeof row.reference_id === "string"
																? row.reference_id
																: "";
														const rt = row.reference_type;
														let href = null;
														if (rid) {
															if (rt === "patch_run")
																href = `/patching/runs/${rid}`;
															else if (
																rt === "host" &&
																row.event_type === "compliance_scan_completed"
															)
																href = `/compliance/hosts/${rid}`;
															else if (rt === "host") href = `/hosts/${rid}`;
															else if (rt === "alert") href = `/hosts/${rid}`;
														}
														return href ? (
															<Link
																to={href}
																className="text-primary-600 hover:text-primary-700 hover:underline"
															>
																{rt}:{rid}
															</Link>
														) : (
															<span>
																{rt}:{rid || " -"}
															</span>
														);
													})()}
												</td>
												<td className="px-4 py-2 text-sm text-red-600 dark:text-red-400 max-w-xs break-words whitespace-normal">
													{row.error_message || " -"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<div className="flex items-center justify-between pt-2">
								<p className="text-xs text-secondary-500">
									{t("channels.log.pagination.page", { page: logPage + 1 })}
									{deliveryLog.length < logPageSize && logPage === 0
										? ` ${t("channels.log.pagination.entries", {
												count: deliveryLog.length,
											})}`
										: ""}
								</p>
								<div className="flex gap-2">
									<button
										type="button"
										className="p-1.5 rounded-lg bg-secondary-100 dark:bg-secondary-700 disabled:opacity-50"
										disabled={logPage === 0}
										onClick={() => setLogPage((p) => Math.max(0, p - 1))}
									>
										<ChevronLeft className="h-4 w-4" />
									</button>
									<button
										type="button"
										className="p-1.5 rounded-lg bg-secondary-100 dark:bg-secondary-700 disabled:opacity-50"
										disabled={deliveryLog.length < logPageSize}
										onClick={() => setLogPage((p) => p + 1)}
									>
										<ChevronRight className="h-4 w-4" />
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			)}

			{showAll && !canManage && !canLog && (
				<div className="card p-8 text-center text-secondary-600">
					{t("channels.noPermission")}
				</div>
			)}

			{/* Modals */}
			<DestinationModal
				key={destModal.editing?.id || "new-dest"}
				isOpen={destModal.open}
				onClose={() => setDestModal({ open: false, editing: null })}
				onSave={handleDestSave}
				editingDest={destModal.editing}
				isPending={createDest.isPending || updateDest.isPending}
			/>
			<RouteModal
				key={routeModal.editing?.id || "new-route"}
				isOpen={routeModal.open}
				onClose={() => setRouteModal({ open: false, editing: null })}
				onSave={handleRouteSave}
				editingRoute={routeModal.editing}
				destinations={destinations}
				hostGroups={hostGroupOptions}
				hosts={hostOptions}
				isPending={createRoute.isPending || updateRoute.isPending}
			/>
			<ReportModal
				key={reportModal.editing?.id || "new-report"}
				isOpen={reportModal.open}
				onClose={() => setReportModal({ open: false, editing: null })}
				onSave={handleReportSave}
				editingReport={reportModal.editing}
				destinations={destinations}
				hostGroups={hostGroupOptions}
				isPending={createReport.isPending || updateReport.isPending}
			/>
		</div>
	);
};

// Default export for standalone settings page (renders all panels)
const AlertChannels = () => <NotificationPanel />;
export default AlertChannels;
