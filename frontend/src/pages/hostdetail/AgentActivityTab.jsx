import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	ChevronLeft,
	ChevronRight,
	RefreshCw,
	Search,
	Server,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import AgentActivityTable from "../../components/host/AgentActivityTable";
import QueueStatCards from "../../components/host/QueueStatCards";
import { dashboardAPI } from "../../utils/api";

const PAGE_SIZE = 50;

// URL params owned by this tab. Listed here so we know exactly which keys to
// strip when clearing filters or rewriting params on tab change.
const PARAM_KEYS = ["direction", "type", "status", "since", "q", "page"];

const DIRECTION_OPTIONS = [
	{ value: "", labelKey: "agent_activity.direction_all" },
	{ value: "in", labelKey: "agent_activity.direction_in" },
	{ value: "out", labelKey: "agent_activity.direction_out" },
];

const TIME_RANGE_OPTIONS = [
	{ value: "24h", labelKey: "agent_activity.time_24h" },
	{ value: "7d", labelKey: "agent_activity.time_7d" },
	{ value: "30d", labelKey: "agent_activity.time_30d" },
	{ value: "all", labelKey: "agent_activity.time_all" },
];

const REPORT_TYPE_OPTIONS = [
	{ value: "ping", labelKey: "agent_activity.type_ping" },
	{ value: "full", labelKey: "agent_activity.type_full" },
	{ value: "partial", labelKey: "agent_activity.type_partial" },
	{ value: "docker", labelKey: "agent_activity.type_docker" },
	{ value: "compliance", labelKey: "agent_activity.type_compliance" },
];

const COMMON_JOB_OPTIONS = [
	{ value: "report_now", labelKey: "agent_activity.job_report_now" },
	{
		value: "refresh_integration_status",
		labelKey: "agent_activity.job_refresh_integration_status",
	},
	{
		value: "docker_inventory_refresh",
		labelKey: "agent_activity.job_docker_inventory_refresh",
	},
	{ value: "update_agent", labelKey: "agent_activity.job_update_agent" },
	{ value: "run_scan", labelKey: "agent_activity.job_run_scan" },
	{
		value: "install_compliance_tools",
		labelKey: "agent_activity.job_install_compliance_tools",
	},
	{ value: "ssg_upgrade", labelKey: "agent_activity.job_ssg_upgrade" },
	{ value: "run_patch", labelKey: "agent_activity.job_run_patch" },
	{
		value: "scheduled_reports_dispatch",
		labelKey: "agent_activity.job_scheduled_reports_dispatch",
	},
	{
		value: "scheduled_report_run",
		labelKey: "agent_activity.job_scheduled_report_run",
	},
	{
		value: "update-threshold-monitor",
		labelKey: "agent_activity.job_update_threshold_monitor",
	},
	{
		value: "host-status-monitor",
		labelKey: "agent_activity.job_host_status_monitor",
	},
	{ value: "metrics-send", labelKey: "agent_activity.job_metrics_send" },
	{
		value: "agent-reports-cleanup",
		labelKey: "agent_activity.job_agent_reports_cleanup",
	},
	{
		value: "patch-run-cleanup",
		labelKey: "agent_activity.job_patch_run_cleanup",
	},
	{
		value: "compliance-scan-cleanup",
		labelKey: "agent_activity.job_compliance_scan_cleanup",
	},
	{
		value: "ssg-update-check",
		labelKey: "agent_activity.job_ssg_update_check",
	},
	{
		value: "version-update-check",
		labelKey: "agent_activity.job_version_update_check",
	},
	{
		value: "system-statistics",
		labelKey: "agent_activity.job_system_statistics",
	},
	{
		value: "docker-inventory-cleanup",
		labelKey: "agent_activity.job_docker_inventory_cleanup",
	},
	{
		value: "orphaned-package-cleanup",
		labelKey: "agent_activity.job_orphaned_package_cleanup",
	},
	{
		value: "orphaned-repo-cleanup",
		labelKey: "agent_activity.job_orphaned_repo_cleanup",
	},
	{ value: "session-cleanup", labelKey: "agent_activity.job_session_cleanup" },
];

const STATUS_OPTIONS = [
	{ value: "success", labelKey: "agent_activity.status_success" },
	{ value: "completed", labelKey: "agent_activity.status_completed" },
	{ value: "active", labelKey: "agent_activity.status_active" },
	{ value: "waiting", labelKey: "agent_activity.status_waiting" },
	{ value: "delayed", labelKey: "agent_activity.status_delayed" },
	{ value: "failed", labelKey: "agent_activity.status_failed" },
	{ value: "error", labelKey: "agent_activity.status_error" },
];

const DEFAULT_TIME_RANGE = "7d";

// Convert a UI keyword time-range to an RFC3339 timestamp for the server's
// `since` query param. Server-side parser only accepts RFC3339 — sending
// "7d" was previously a silent no-op and the user got every row.
const TIME_RANGE_MS = {
	"24h": 24 * 60 * 60 * 1000,
	"7d": 7 * 24 * 60 * 60 * 1000,
	"30d": 30 * 24 * 60 * 60 * 1000,
};

const sinceFromRange = (range) => {
	const ms = TIME_RANGE_MS[range];
	if (!ms) return "";
	return new Date(Date.now() - ms).toISOString();
};

const parseList = (value) =>
	(value || "")
		.split(",")
		.map((v) => v.trim())
		.filter((v) => v.length > 0);

// Multiselect rendered as toggleable chips. Cheap, accessible, no extra deps.
const ChipMultiSelect = ({ label, options, values, onChange }) => {
	const { t } = useTranslation("hosts");
	const toggle = (value) => {
		if (values.includes(value)) {
			onChange(values.filter((v) => v !== value));
		} else {
			onChange([...values, value]);
		}
	};
	return (
		<div>
			<span className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1">
				{label}
			</span>
			<div className="flex flex-wrap gap-1.5">
				{options.map((opt) => {
					const active = values.includes(opt.value);
					return (
						<button
							type="button"
							key={opt.value}
							onClick={() => toggle(opt.value)}
							className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-medium transition-colors min-h-[44px] sm:min-h-0 ${
								active
									? "bg-primary-100 border-primary-300 text-primary-800 dark:bg-primary-900 dark:border-primary-700 dark:text-primary-200"
									: "bg-white border-secondary-300 text-secondary-600 hover:border-primary-400 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-200"
							}`}
						>
							{t(opt.labelKey)}
						</button>
					);
				})}
			</div>
		</div>
	);
};

const AgentActivityTab = ({ hostId }) => {
	const { t } = useTranslation("hosts");
	const [searchParams, setSearchParams] = useSearchParams();

	// Read filter values straight off the URL — single source of truth so deep
	// links and browser back/forward "just work".
	const direction = searchParams.get("direction") || "";
	const typeRaw = searchParams.get("type") || "";
	const statusRaw = searchParams.get("status") || "";
	// Memoise the parsed arrays against their raw URL strings so the array
	// reference is stable across renders. Without this, parseList() would
	// produce a fresh array each render, which propagates into the queryParams
	// useMemo (typeFilter/statusFilter are deps) and forces sinceFromRange()
	// to recompute Date.now() on every render — TanStack Query then sees a
	// new query key every ~10ms and refetches in a tight loop.
	const typeFilter = useMemo(() => parseList(typeRaw), [typeRaw]);
	const statusFilter = useMemo(() => parseList(statusRaw), [statusRaw]);
	const timeRange = searchParams.get("since") || DEFAULT_TIME_RANGE;
	const urlSearch = searchParams.get("q") || "";
	const page = Math.max(
		1,
		Number.parseInt(searchParams.get("page") || "1", 10) || 1,
	);

	const [searchTerm, setSearchTerm] = useState(urlSearch);
	const searchDebounceRef = useRef(null);

	// Mutate only the keys we own; preserves `tab` and any unrelated params.
	const updateParams = useCallback(
		(updates) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					Object.entries(updates).forEach(([key, value]) => {
						if (
							value === undefined ||
							value === null ||
							value === "" ||
							(Array.isArray(value) && value.length === 0)
						) {
							next.delete(key);
						} else if (Array.isArray(value)) {
							next.set(key, value.join(","));
						} else {
							next.set(key, String(value));
						}
					});
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	// Debounce the search input -> URL. Reset the page when search changes.
	useEffect(() => {
		if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		searchDebounceRef.current = setTimeout(() => {
			const trimmed = searchTerm.trim();
			if (trimmed === urlSearch) return;
			updateParams({ q: trimmed, page: null });
		}, 400);
		return () => {
			if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		};
	}, [searchTerm, urlSearch, updateParams]);

	// Keep local input in sync if URL changes externally (browser nav, deep
	// links, clear-filters).
	useEffect(() => {
		setSearchTerm(urlSearch);
	}, [urlSearch]);

	const setDirection = (value) =>
		updateParams({ direction: value, page: null });
	const setTypeFilter = (values) => updateParams({ type: values, page: null });
	const setStatusFilter = (values) =>
		updateParams({ status: values, page: null });
	const setTimeRange = (value) =>
		updateParams({
			since: value === DEFAULT_TIME_RANGE ? null : value,
			page: null,
		});

	const [showFilters, setShowFilters] = useState(false);

	// The query key carries the time-range KEYWORD, never a resolved timestamp:
	// a timestamp in the key would mint a new key on every render. The absolute
	// `since` bound is resolved inside queryFn instead, so the 30s auto-refresh
	// keeps "Last 24 hours" anchored to now rather than to when the tab opened.
	const queryParams = useMemo(
		() => ({
			direction,
			type: typeFilter,
			status: statusFilter,
			timeRange,
			search: urlSearch,
			limit: PAGE_SIZE,
			offset: (page - 1) * PAGE_SIZE,
		}),
		[direction, typeFilter, statusFilter, timeRange, urlSearch, page],
	);

	const {
		data: response,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useQuery({
		queryKey: ["host-activity", hostId, queryParams],
		queryFn: () => {
			const { timeRange: range, ...rest } = queryParams;
			return dashboardAPI
				.getHostActivity(hostId, {
					...rest,
					since: range === "all" ? "" : sinceFromRange(range),
				})
				.then((res) => res.data);
		},
		enabled: !!hostId,
		staleTime: 30 * 1000,
		refetchInterval: 30 * 1000,
		placeholderData: keepPreviousData,
	});

	// HostActivity returns the body at the top level (no {success, data}
	// wrapper). The queryFn already unwraps the axios envelope via .data, so
	// `response` here is the parsed JSON body.
	const data = response || {};
	const stats = data.stats || {};
	const items = Array.isArray(data.items) ? data.items : [];
	const total = typeof data.total === "number" ? data.total : items.length;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const end = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

	const typeOptions = useMemo(
		() => [...REPORT_TYPE_OPTIONS, ...COMMON_JOB_OPTIONS],
		[],
	);

	const clearFilters = () => {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				for (const key of PARAM_KEYS) {
					next.delete(key);
				}
				return next;
			},
			{ replace: true },
		);
		setSearchTerm("");
	};

	const hasActiveFilters =
		direction !== "" ||
		typeFilter.length > 0 ||
		statusFilter.length > 0 ||
		timeRange !== DEFAULT_TIME_RANGE ||
		urlSearch.trim() !== "";

	const setPage = (next) => {
		const clamped = Math.min(Math.max(1, next), totalPages);
		updateParams({ page: clamped === 1 ? null : clamped });
	};

	return (
		<div className="space-y-4">
			<QueueStatCards stats={stats} />

			<div className="card p-4 sm:p-6 space-y-4">
				<div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
					<div className="flex-1">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400 dark:text-white" />
							<input
								type="text"
								placeholder={t("agent_activity.search_placeholder")}
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10 pr-4 py-2 w-full border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-500 dark:placeholder-secondary-400 min-h-[44px] sm:min-h-0"
							/>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowFilters((prev) => !prev)}
							className={`btn-outline flex items-center gap-1.5 sm:gap-2 px-3 py-2 min-h-[44px] text-xs sm:text-sm ${
								showFilters || hasActiveFilters
									? "bg-primary-50 border-primary-300 dark:bg-primary-900/30 dark:border-primary-700"
									: ""
							}`}
						>
							{showFilters ? <X className="h-4 w-4 flex-shrink-0" /> : null}
							<span>{t("agent_activity.filters")}</span>
							{hasActiveFilters && !showFilters && (
								<span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-primary-600 text-white text-[10px] font-semibold">
									{
										[
											direction !== "",
											typeFilter.length > 0,
											statusFilter.length > 0,
											timeRange !== DEFAULT_TIME_RANGE,
											urlSearch.trim() !== "",
										].filter(Boolean).length
									}
								</span>
							)}
						</button>
						<button
							type="button"
							onClick={() => refetch()}
							disabled={isFetching}
							className="btn-outline flex items-center gap-2 px-3 py-2 min-h-[44px] text-xs sm:text-sm"
							title={t("agent_activity.refresh_title")}
						>
							<RefreshCw
								className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
							/>
							<span className="hidden sm:inline">
								{t("agent_activity.refresh")}
							</span>
						</button>
					</div>
				</div>

				{showFilters && (
					<div className="bg-secondary-50 dark:bg-secondary-700 p-3 sm:p-4 rounded-lg border dark:border-secondary-600 space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
							<div>
								<span className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1">
									{t("agent_activity.direction_label")}
								</span>
								<select
									value={direction}
									onChange={(e) => setDirection(e.target.value)}
									className="w-full border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white min-h-[44px] sm:min-h-0"
								>
									{DIRECTION_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{t(opt.labelKey)}
										</option>
									))}
								</select>
							</div>
							<div>
								<span className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1">
									{t("agent_activity.time_range_label")}
								</span>
								<select
									value={timeRange}
									onChange={(e) => setTimeRange(e.target.value)}
									className="w-full border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white min-h-[44px] sm:min-h-0"
								>
									{TIME_RANGE_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{t(opt.labelKey)}
										</option>
									))}
								</select>
							</div>
							<div className="flex items-end">
								<button
									type="button"
									onClick={clearFilters}
									disabled={!hasActiveFilters}
									className="btn-outline w-full min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{t("agent_activity.clear_filters")}
								</button>
							</div>
						</div>
						<ChipMultiSelect
							label={t("agent_activity.type_label")}
							options={typeOptions}
							values={typeFilter}
							onChange={setTypeFilter}
						/>
						<ChipMultiSelect
							label={t("agent_activity.status_label")}
							options={STATUS_OPTIONS}
							values={statusFilter}
							onChange={setStatusFilter}
						/>
					</div>
				)}

				{error ? (
					<div className="bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-700 rounded-md p-4">
						<div className="flex">
							<AlertTriangle className="h-5 w-5 text-danger-500 dark:text-danger-400 flex-shrink-0" />
							<div className="ml-3">
								<h3 className="text-sm font-medium text-danger-800 dark:text-danger-200">
									{t("agent_activity.load_failed")}
								</h3>
								<p className="text-sm text-danger-700 dark:text-danger-300 mt-1">
									{error?.response?.data?.error ||
										error?.message ||
										t("agent_activity.unknown_error")}
								</p>
								<button
									type="button"
									onClick={() => refetch()}
									className="mt-2 btn-danger text-xs"
								>
									{t("agent_activity.try_again")}
								</button>
							</div>
						</div>
					</div>
				) : isLoading ? (
					<div className="flex items-center justify-center h-32">
						<RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
					</div>
				) : items.length === 0 ? (
					<div className="text-center py-8">
						<Server className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
						<p className="text-secondary-500 dark:text-white">
							{t("agent_activity.empty")}
						</p>
						<p className="text-sm text-secondary-400 dark:text-white mt-2">
							{hasActiveFilters
								? t("agent_activity.empty_filtered")
								: t("agent_activity.empty_hint")}
						</p>
					</div>
				) : (
					<>
						<AgentActivityTable items={items} />
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-secondary-200 dark:border-secondary-600">
							<p className="text-sm text-secondary-700 dark:text-white">
								{total > 0
									? t("agent_activity.range", { start, end, total })
									: t("agent_activity.range_empty")}
							</p>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setPage(page - 1)}
									disabled={page === 1 || isFetching}
									className="p-2 rounded hover:bg-secondary-100 dark:hover:bg-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
									title={t("agent_activity.previous_page")}
								>
									<ChevronLeft className="h-4 w-4" />
								</button>
								<span className="text-sm text-secondary-700 dark:text-white whitespace-nowrap">
									{t("agent_activity.page_of", { page, pages: totalPages })}
								</span>
								<button
									type="button"
									onClick={() => setPage(page + 1)}
									disabled={page >= totalPages || isFetching}
									className="p-2 rounded hover:bg-secondary-100 dark:hover:bg-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
									title={t("agent_activity.next_page")}
								>
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default AgentActivityTab;
