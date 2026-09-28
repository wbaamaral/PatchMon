import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	CheckCircle,
	CheckSquare,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Edit,
	History,
	LayoutDashboard,
	ListChecks,
	PlayCircle,
	Plus,
	RefreshCw,
	Search,
	Server,
	Shield,
	Square,
	Trash2,
	User,
	Users,
	X,
	XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
	Link,
	useLocation,
	useNavigate,
	useSearchParams,
} from "react-router-dom";
import { CompactPackageSummary } from "../components/PackageListDisplay";
import { PatchRunStatusBadge } from "../components/PatchRunStatusBadge";
import PatchWizard from "../components/PatchWizard";
import {
	PatchingActivePolicies,
	PatchingPendingApproval,
	PatchingRecentRuns,
	PatchRunOutcomesDoughnut,
	PatchRunStatusBoxes,
	PatchRunsByType,
} from "../components/patching/widgets";
import TierBadge from "../components/TierBadge";
import UpgradeRequiredContent from "../components/UpgradeRequiredContent";
import { getRequiredTier } from "../constants/tiers";
import { useAuth } from "../contexts/AuthContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { useSettings } from "../contexts/SettingsContext";
import { useToast } from "../contexts/ToastContext";
import { adminHostsAPI, formatDate, hostGroupsAPI } from "../utils/api";
import { patchingAPI } from "../utils/patchingApi";
import { hasExtraDependencies } from "../utils/patchRun";

const usePatchingTabs = () => {
	const { t } = useTranslation("patching");
	return [
		{ id: "overview", label: t("tabs.overview"), icon: LayoutDashboard },
		{ id: "runs", label: t("tabs.runs"), icon: History },
		{ id: "policies", label: t("tabs.policies"), icon: Shield },
	];
};

const ValidatedBadge = () => {
	const { t } = useTranslation("patching");
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
			<AlertTriangle className="h-3 w-3" />
			{t("run.extra_deps_short")}
		</span>
	);
};

const Patching = () => {
	const { t } = useTranslation("patching");
	const PATCHING_TABS = usePatchingTabs();
	const [searchParams] = useSearchParams();
	const location = useLocation();
	const navigate = useNavigate();
	const { hasModule } = useAuth();
	const policiesLocked = !hasModule("patching_policies");
	const urlTab = searchParams.get("tab");
	const initialTab = ["runs", "policies"].includes(urlTab)
		? urlTab
		: "overview";
	const initialStatus = searchParams.get("status") || "";
	const initialType = searchParams.get("type") || "";
	const [activeTab, setActiveTab] = useState(initialTab);

	// Sync tab and filter state on actual URL navigation (not in-page tab clicks)
	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const tab = params.get("tab");
		if (tab && ["overview", "runs", "policies"].includes(tab)) {
			setActiveTab(tab);
		}
		const status = params.get("status") || "";
		setRunsFilterStatus(status);
		const type = params.get("type") || "";
		setRunsFilterType(type);
		setRunsPage(1);
	}, [location.search]);

	const [runsFilterStatus, setRunsFilterStatus] = useState(initialStatus);
	const [runsFilterType, setRunsFilterType] = useState(initialType);
	const [runsPage, setRunsPage] = useState(1);
	const [runsLimit, setRunsLimit] = useState(() => {
		if (typeof window === "undefined") return 25;
		const stored = Number(window.localStorage.getItem("patching-runs-limit"));
		return [25, 50, 100, 200].includes(stored) ? stored : 25;
	});
	const queryClient = useQueryClient();

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem("patching-runs-limit", String(runsLimit));
	}, [runsLimit]);

	const {
		data: dashboard,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["patching-dashboard"],
		queryFn: () => patchingAPI.getDashboard(),
		staleTime: 30 * 1000,
		refetchInterval: 30 * 1000,
	});

	const { data: runsData } = useQuery({
		// runsLimit is in the key because the queryFn uses it; without it,
		// changing page size on page 1 serves the cached result.
		queryKey: [
			"patching-runs",
			runsFilterStatus,
			runsFilterType,
			runsPage,
			runsLimit,
		],
		queryFn: () =>
			patchingAPI.getRuns({
				...(runsFilterStatus ? { status: runsFilterStatus } : {}),
				...(runsFilterType ? { patch_type: runsFilterType } : {}),
				limit: runsLimit,
				offset: (runsPage - 1) * runsLimit,
			}),
		staleTime: 15 * 1000,
		enabled: activeTab === "runs",
	});

	const runs = runsData?.runs || [];
	const runsPagination = runsData?.pagination || { total: 0, pages: 0 };

	const retryValidationMutation = useMutation({
		mutationFn: (runId) => patchingAPI.retryValidation(runId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patching-runs"] });
			queryClient.invalidateQueries({ queryKey: ["patching-dashboard"] });
		},
	});
	const [retryingId, setRetryingId] = useState(null);
	const [selectedRunIds, setSelectedRunIds] = useState(new Set());
	const [selectedApproveIds, setSelectedApproveIds] = useState(new Set());
	const [bulkApproveResult, setBulkApproveResult] = useState(null);

	// State for the approve wizard. Holds an array of run summaries that the
	// wizard will display in its Confirm step. Setting this to a non-empty
	// array opens the wizard; clearing it closes. One wizard for both single-
	// row and bulk approvals keeps the UI consistent.
	// Each entry shape: { runId, host, patchType, packageNames }
	const [approveWizardRuns, setApproveWizardRuns] = useState(null);
	// Approvals now happen inside the wizard, so the old per-row "Approving…"
	// spinner state is gone. We keep these as constants so the existing
	// button JSX (disabled/label branches) still compiles without being
	// touched in this refactor.
	const bulkApproving = false;
	const approvingId = null;

	const deletableStatuses = new Set([
		"queued",
		"pending_validation",
		"pending_approval",
		"validated",
		"approved",
		"scheduled",
	]);
	const deletableRuns = runs.filter((r) => deletableStatuses.has(r.status));
	const allDeletableSelected =
		deletableRuns.length > 0 &&
		deletableRuns.every((r) => selectedRunIds.has(r.id));

	const approvableStatuses = new Set([
		"validated",
		"pending_validation",
		"pending_approval",
	]);
	const approvableRuns = runs.filter((r) => approvableStatuses.has(r.status));
	const allApprovableSelected =
		approvableRuns.length > 0 &&
		approvableRuns.every((r) => selectedApproveIds.has(r.id));

	const deleteRunMutation = useMutation({
		mutationFn: (runId) => patchingAPI.deleteRun(runId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patching-runs"] });
			queryClient.invalidateQueries({ queryKey: ["patching-dashboard"] });
		},
	});
	const [deletingIds, setDeletingIds] = useState(new Set());

	const handleToggleSelect = (runId) => {
		setSelectedRunIds((prev) => {
			const next = new Set(prev);
			if (next.has(runId)) next.delete(runId);
			else next.add(runId);
			return next;
		});
	};

	const handleToggleSelectAll = () => {
		if (allDeletableSelected) {
			setSelectedRunIds(new Set());
		} else {
			setSelectedRunIds(new Set(deletableRuns.map((r) => r.id)));
		}
	};

	const handleDeleteSelected = async () => {
		const ids = [...selectedRunIds];
		setDeletingIds(new Set(ids));
		try {
			await Promise.all(ids.map((id) => deleteRunMutation.mutateAsync(id)));
			setSelectedRunIds(new Set());
		} catch (_err) {
			// Mutation error - queries will refetch; user sees updated list
		} finally {
			setDeletingIds(new Set());
		}
	};

	const handleToggleApproveSelect = (runId) => {
		setSelectedApproveIds((prev) => {
			const next = new Set(prev);
			if (next.has(runId)) next.delete(runId);
			else next.add(runId);
			return next;
		});
	};

	const handleToggleApproveSelectAll = () => {
		if (allApprovableSelected) {
			setSelectedApproveIds(new Set());
		} else {
			setSelectedApproveIds(new Set(approvableRuns.map((r) => r.id)));
		}
	};

	// Build a single wizard-row descriptor from a raw run object. The wizard
	// needs just enough context to show host name, patch type, and any
	// requested package names for confirmation.
	const buildApproveRow = (run) => ({
		runId: run.id,
		host: {
			id: run.host_id,
			friendly_name: run.hosts?.friendly_name,
			hostname: run.hosts?.hostname,
		},
		patchType: run.patch_type,
		packageNames:
			Array.isArray(run.package_names) && run.package_names.length > 0
				? run.package_names
				: run.package_name
					? [run.package_name]
					: [],
	});

	// Single-row Approve / Skip & Patch: open the wizard preloaded with one
	// row. The wizard handles the actual approveRun call so the user can
	// override the policy first if they want.
	const handleApprove = (runId) => {
		const run = runs.find((r) => r.id === runId);
		if (!run) return;
		setApproveWizardRuns([buildApproveRow(run)]);
	};

	// Bulk Approve selected: open the wizard with N rows. The Confirm step
	// lets the user set a per-run policy override before approving, then
	// fires approveRun once per row.
	const handleApproveSelected = () => {
		const ids = [...selectedApproveIds];
		if (ids.length === 0) return;
		const byId = new Map(runs.map((r) => [r.id, r]));
		const rows = ids
			.map((id) => byId.get(id))
			.filter(Boolean)
			.map(buildApproveRow);
		if (rows.length === 0) return;
		setBulkApproveResult(null);
		setApproveWizardRuns(rows);
	};

	// Called by the wizard on successful approval(s). Deep-links into a
	// single immediate run; otherwise shows a short summary the user can
	// dismiss.
	const handleApproveWizardSuccess = (_mode, info) => {
		const runsOut = info?.runs || [];
		const approved = runsOut.length;
		const sourceCount = approveWizardRuns?.length || 0;
		setApproveWizardRuns(null);
		setSelectedApproveIds(new Set());
		queryClient.invalidateQueries({ queryKey: ["patching-runs"] });
		queryClient.invalidateQueries({ queryKey: ["patching-dashboard"] });
		const immediate = runsOut.filter((r) => r.immediate);
		if (immediate.length === 1 && sourceCount === 1) {
			navigate(`/patching/runs/${immediate[0].runId}`);
			return;
		}
		if (sourceCount > 1) {
			const failed = Math.max(sourceCount - approved, 0);
			setBulkApproveResult({ ok: approved, failed });
		}
	};

	const handleRetryValidation = async (runId) => {
		setRetryingId(runId);
		try {
			await retryValidationMutation.mutateAsync(runId);
		} finally {
			setRetryingId(null);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
				<p className="text-red-200">{t("error.load_dashboard")}</p>
			</div>
		);
	}

	const summary = dashboard?.summary || {};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold text-secondary-900 dark:text-white">
					Patching
				</h1>
				<p className="text-sm text-secondary-600 dark:text-white mt-1">
					View and manage patch runs across hosts
				</p>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
				<button
					type="button"
					onClick={() => navigate("/patching?tab=runs")}
					className="card p-4 hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-shadow text-left"
					title={t("summary.total_runs_title")}
				>
					<div className="flex items-center">
						<ListChecks className="h-5 w-5 text-primary-600 mr-2" />
						<div>
							<p className="text-sm text-secondary-500 dark:text-white">
								{t("summary.total_runs")}
							</p>
							<p className="text-xl font-semibold text-secondary-900 dark:text-white">
								{summary.total_runs ?? 0}
							</p>
						</div>
					</div>
				</button>
				<button
					type="button"
					onClick={() => navigate("/patching?tab=runs&status=active")}
					className="card p-4 hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-shadow text-left"
					title={t("summary.queued_running_title")}
				>
					<div className="flex items-center">
						<Clock className="h-5 w-5 text-blue-600 mr-2" />
						<div>
							<p className="text-sm text-secondary-500 dark:text-white">
								{t("summary.queued_running")}
							</p>
							<p className="text-xl font-semibold text-secondary-900 dark:text-white">
								{(summary.queued ?? 0) + (summary.running ?? 0)}
							</p>
						</div>
					</div>
				</button>
				<button
					type="button"
					onClick={() => navigate("/patching?tab=runs&status=completed")}
					className="card p-4 hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-shadow text-left"
					title={t("summary.completed_title")}
				>
					<div className="flex items-center">
						<CheckCircle className="h-5 w-5 text-green-600 mr-2" />
						<div>
							<p className="text-sm text-secondary-500 dark:text-white">
								{t("summary.completed")}
							</p>
							<p className="text-xl font-semibold text-secondary-900 dark:text-white">
								{summary.completed ?? 0}
							</p>
						</div>
					</div>
				</button>
				<button
					type="button"
					onClick={() => navigate("/patching?tab=runs&status=failed")}
					className="card p-4 hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-shadow text-left"
					title={t("summary.failed_title")}
				>
					<div className="flex items-center">
						<XCircle className="h-5 w-5 text-red-600 mr-2" />
						<div>
							<p className="text-sm text-secondary-500 dark:text-white">
								{t("summary.failed")}
							</p>
							<p className="text-xl font-semibold text-secondary-900 dark:text-white">
								{summary.failed ?? 0}
							</p>
						</div>
					</div>
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("policies")}
					className="card p-4 hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-shadow text-left"
				>
					<div className="flex items-center">
						<Shield className="h-5 w-5 text-secondary-600 mr-2" />
						<div>
							<p className="text-sm text-secondary-500 dark:text-white">
								{t("summary.policies")}
							</p>
							<p className="text-sm font-medium text-primary-600 dark:text-primary-400">
								{t("summary.manage_policies")}
							</p>
						</div>
					</div>
				</button>
			</div>

			{/* Tabs */}
			<div className="border-b border-secondary-200 dark:border-secondary-600 overflow-x-auto scrollbar-hide">
				<nav
					className="-mb-px flex space-x-4 sm:space-x-8 px-4"
					aria-label={t("tabs.aria_label")}
				>
					{PATCHING_TABS.map((tab) => {
						const Icon = tab.icon;
						const isPoliciesLocked = tab.id === "policies" && policiesLocked;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`${
									activeTab === tab.id
										? "border-primary-500 text-primary-600 dark:text-primary-400"
										: "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-white dark:hover:text-primary-400"
								} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
							>
								<Icon className="h-4 w-4" />
								<span>{tab.label}</span>
								{isPoliciesLocked && (
									<TierBadge tier={getRequiredTier("patching_policies")} />
								)}
							</button>
						);
					})}
				</nav>
			</div>

			{activeTab === "overview" && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
					<PatchRunStatusBoxes data={dashboard} />
					<PatchRunOutcomesDoughnut data={dashboard} />
					<PatchingRecentRuns data={dashboard} />
					<PatchingPendingApproval data={dashboard} />
					<PatchRunsByType data={dashboard} />
					<PatchingActivePolicies data={dashboard} />
				</div>
			)}

			{activeTab === "runs" && (
				<RunsTab
					runs={runs}
					runsPage={runsPage}
					setRunsPage={setRunsPage}
					runsLimit={runsLimit}
					setRunsLimit={setRunsLimit}
					runsPagination={runsPagination}
					runsFilterStatus={runsFilterStatus}
					setRunsFilterStatus={setRunsFilterStatus}
					runsFilterType={runsFilterType}
					setRunsFilterType={setRunsFilterType}
					selectedRunIds={selectedRunIds}
					setSelectedRunIds={setSelectedRunIds}
					selectedApproveIds={selectedApproveIds}
					setSelectedApproveIds={setSelectedApproveIds}
					deletableStatuses={deletableStatuses}
					deletableRuns={deletableRuns}
					allDeletableSelected={allDeletableSelected}
					approvableStatuses={approvableStatuses}
					approvableRuns={approvableRuns}
					allApprovableSelected={allApprovableSelected}
					handleToggleSelect={handleToggleSelect}
					handleToggleSelectAll={handleToggleSelectAll}
					handleToggleApproveSelect={handleToggleApproveSelect}
					handleToggleApproveSelectAll={handleToggleApproveSelectAll}
					handleDeleteSelected={handleDeleteSelected}
					handleApproveSelected={handleApproveSelected}
					handleApprove={handleApprove}
					handleRetryValidation={handleRetryValidation}
					retryingId={retryingId}
					approvingId={approvingId}
					deletingIds={deletingIds}
					bulkApproving={bulkApproving}
					bulkApproveResult={bulkApproveResult}
					setBulkApproveResult={setBulkApproveResult}
				/>
			)}
			{activeTab === "policies" &&
				(policiesLocked ? (
					<UpgradeRequiredContent module="patching_policies" variant="inline" />
				) : (
					<PoliciesTab />
				))}

			{/* Flow 7: Approve wizard - single-row Approve/Skip & Patch and
			    bulk Approve selected both route through here. Step 3 only
			    (no host selection, no validation) so the user can just set
			    a policy override per row and confirm. */}
			{approveWizardRuns && approveWizardRuns.length > 0 && (
				<PatchWizard
					isOpen
					onClose={() => setApproveWizardRuns(null)}
					mode="approve"
					patchType="patch_package"
					packageNames={[]}
					lockHosts
					lockPackages
					presetHosts={approveWizardRuns.map((r) => r.host)}
					validationRunIds={approveWizardRuns.map((r) => r.runId)}
					packagesByRun={Object.fromEntries(
						approveWizardRuns.map((r) => [r.runId, r.packageNames]),
					)}
					patchTypeByRun={Object.fromEntries(
						approveWizardRuns.map((r) => [r.runId, r.patchType]),
					)}
					onSuccess={handleApproveWizardSuccess}
				/>
			)}
		</div>
	);
};

/* ───────────────────── Runs & History Tab ───────────────────── */

const useStatusOptions = () => {
	const { t } = useTranslation("patching");
	return [
		{ value: "", label: t("status.all") },
		{ value: "active", label: t("status.active") },
		{ value: "queued", label: t("status.queued") },
		{ value: "pending_validation", label: t("status.pending_validation") },
		{ value: "pending_approval", label: t("status.pending_approval") },
		{ value: "validated", label: t("status.validated") },
		{ value: "approved", label: t("status.approved") },
		{ value: "scheduled", label: t("status.scheduled") },
		{ value: "running", label: t("status.running") },
		{ value: "completed", label: t("status.completed") },
		{ value: "failed", label: t("status.failed") },
		{ value: "cancelled", label: t("status.cancelled") },
		{ value: "timed_out", label: t("status.timed_out") },
		{ value: "agent_disconnected", label: t("status.agent_disconnected") },
	];
};

const useTypeOptions = () => {
	const { t } = useTranslation("patching");
	return [
		{ value: "", label: t("type.all") },
		{ value: "patch_all", label: t("type.patch_all") },
		{ value: "patch_package", label: t("type.patch_package") },
	];
};

/**
 * Inline row-action buttons shared between mobile cards and desktop rows.
 * Rendered with compact size for desktop, full-width-friendly size for mobile.
 */
function RunRowActions({
	run,
	onApprove,
	onRetry,
	retryingId,
	approvingId,
	size = "sm",
}) {
	const { t } = useTranslation("patching");
	const isMobile = size === "md";
	const baseBtn = isMobile
		? "inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-md min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
		: "inline-flex items-center gap-1 text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed";
	const iconSize = isMobile ? "h-4 w-4" : "h-3 w-3";

	return (
		<>
			{run.status === "pending_validation" && (
				<>
					<button
						type="button"
						onClick={() => onRetry(run.id)}
						disabled={retryingId === run.id}
						className={`${baseBtn} border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700`}
						title={t("actions.retry_title")}
					>
						<RefreshCw
							className={`${iconSize} ${retryingId === run.id ? "animate-spin" : ""}`}
						/>
						{t("actions.retry")}
					</button>
					<button
						type="button"
						onClick={() => onApprove(run.id)}
						disabled={approvingId === run.id}
						className={`${baseBtn} bg-amber-600 hover:bg-amber-700 text-white`}
						title={t("actions.skip_patch_title")}
					>
						{approvingId === run.id ? (
							<RefreshCw className={`${iconSize} animate-spin`} />
						) : (
							<PlayCircle className={iconSize} />
						)}
						{t("actions.skip_patch")}
					</button>
				</>
			)}
			{run.status === "pending_approval" && (
				<button
					type="button"
					onClick={() => onApprove(run.id)}
					disabled={approvingId === run.id}
					className={`${baseBtn} bg-primary-600 hover:bg-primary-700 text-white`}
					title={t("actions.approve_title")}
				>
					{approvingId === run.id ? (
						<RefreshCw className={`${iconSize} animate-spin`} />
					) : (
						<PlayCircle className={iconSize} />
					)}
					{t("actions.approve")}
				</button>
			)}
			{run.status === "validated" && (
				<button
					type="button"
					onClick={() => onApprove(run.id)}
					disabled={approvingId === run.id}
					className={`${baseBtn} bg-primary-600 hover:bg-primary-700 text-white`}
					title={t("actions.approve_validated_title")}
				>
					{approvingId === run.id ? (
						<RefreshCw className={`${iconSize} animate-spin`} />
					) : (
						<PlayCircle className={iconSize} />
					)}
					Approve
				</button>
			)}
			<Link
				to={`/patching/runs/${run.id}`}
				className={
					isMobile
						? "inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-md min-h-[44px] border border-secondary-300 dark:border-secondary-600 text-primary-600 dark:text-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700"
						: "text-primary-600 dark:text-primary-400 hover:underline text-sm px-2"
				}
			>
				View
			</Link>
		</>
	);
}

function RunsTab({
	runs,
	runsPage,
	setRunsPage,
	runsLimit,
	setRunsLimit,
	runsPagination,
	runsFilterStatus,
	setRunsFilterStatus,
	runsFilterType,
	setRunsFilterType,
	selectedRunIds,
	setSelectedRunIds,
	selectedApproveIds,
	setSelectedApproveIds,
	deletableStatuses,
	deletableRuns,
	allDeletableSelected,
	approvableStatuses,
	approvableRuns,
	allApprovableSelected,
	handleToggleSelect,
	handleToggleSelectAll,
	handleToggleApproveSelect,
	handleToggleApproveSelectAll,
	handleDeleteSelected,
	handleApproveSelected,
	handleApprove,
	handleRetryValidation,
	retryingId,
	approvingId,
	deletingIds,
	bulkApproving,
	bulkApproveResult,
	setBulkApproveResult,
}) {
	const totalRuns = runsPagination.total || 0;
	const totalPages = Math.max(runsPagination.pages || 0, 1);
	const rangeStart = totalRuns === 0 ? 0 : (runsPage - 1) * runsLimit + 1;
	const rangeEnd = Math.min(runsPage * runsLimit, totalRuns);
	const hasFilters = Boolean(runsFilterStatus || runsFilterType);
	const hasSelection = selectedRunIds.size > 0 || selectedApproveIds.size > 0;

	return (
		<div className="mt-4 space-y-4">
			{/* Bulk action bar (§4.5) — shown only when items are selected */}
			{hasSelection && (
				<div className="card p-3 sm:p-4">
					<div className="flex flex-wrap items-center gap-2 sm:gap-3">
						{selectedRunIds.size > 0 && (
							<>
								<span className="text-sm text-secondary-600 dark:text-white/80 flex-shrink-0">
									{t("bulk.selected_for_delete", { count: selectedRunIds.size })}
								</span>
								<button
									type="button"
									onClick={handleDeleteSelected}
									disabled={deletingIds.size > 0}
									className="btn-danger flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] text-xs sm:text-sm"
								>
									<Trash2 className="h-4 w-4 flex-shrink-0" />
									<span className="hidden sm:inline">
										{t("bulk.delete_selected", { count: selectedRunIds.size })}
									</span>
									<span className="sm:hidden">{t("bulk.delete")}</span>
								</button>
								<button
									type="button"
									onClick={() => setSelectedRunIds(new Set())}
									className="text-xs sm:text-sm text-secondary-500 hover:text-secondary-700 dark:text-white/70 dark:hover:text-white min-h-[44px] px-2"
								>
									<span className="hidden sm:inline">{t("bulk.clear_delete")}</span>
									<span className="sm:hidden">{t("bulk.clear")}</span>
								</button>
							</>
						)}
						{selectedRunIds.size > 0 && selectedApproveIds.size > 0 && (
							<span
								className="hidden sm:inline h-5 w-px bg-secondary-200 dark:bg-secondary-600"
								aria-hidden="true"
							/>
						)}
						{selectedApproveIds.size > 0 && (
							<>
								<span className="text-sm text-secondary-600 dark:text-white/80 flex-shrink-0">
									{t("bulk.selected_for_approve", { count: selectedApproveIds.size })}
								</span>
								<button
									type="button"
									onClick={handleApproveSelected}
									disabled={bulkApproving}
									className="btn-primary flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] text-xs sm:text-sm"
								>
									{bulkApproving ? (
										<RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" />
									) : (
										<CheckCircle className="h-4 w-4 flex-shrink-0" />
									)}
									<span className="hidden sm:inline">
										{bulkApproving
											? t("bulk.approving_selected", { count: selectedApproveIds.size })
											: t("bulk.approve_selected", { count: selectedApproveIds.size })}
									</span>
									<span className="sm:hidden">
										{bulkApproving ? "…" : t("bulk.approve_short")}
									</span>
								</button>
								<button
									type="button"
									onClick={() => setSelectedApproveIds(new Set())}
									disabled={bulkApproving}
									className="text-xs sm:text-sm text-secondary-500 hover:text-secondary-700 dark:text-white/70 dark:hover:text-white min-h-[44px] px-2"
								>
									<span className="hidden sm:inline">{t("bulk.clear_approve")}</span>
									<span className="sm:hidden">{t("bulk.clear")}</span>
								</button>
							</>
						)}
					</div>
				</div>
			)}

			{/* Bulk-approve result banner */}
			{bulkApproveResult && (
				<div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-800 text-sm">
					<div className="flex items-center gap-2 flex-wrap">
						{bulkApproveResult.failed === 0 ? (
							<CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
						) : (
							<AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
						)}
						<span className="text-secondary-800 dark:text-secondary-200">
							Approved {bulkApproveResult.ok}
							{bulkApproveResult.failed > 0
								? `, ${bulkApproveResult.failed} failed`
								: ""}
						</span>
					</div>
					<button
						type="button"
						onClick={() => setBulkApproveResult(null)}
						className="text-secondary-500 hover:text-secondary-700 dark:text-white/70 dark:hover:text-white"
						aria-label={t("actions.dismiss")}
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			{/* Card containing filters + table/cards + pagination */}
			<div className="card">
				{/* Filter bar (§5.1) */}
				<div className="p-3 sm:p-4 border-b border-secondary-200 dark:border-secondary-600">
					<div className="flex flex-col sm:flex-row sm:items-center gap-3">
						<div className="flex-1 min-w-0">
							<label
								htmlFor="patching-runs-filter-status"
								className="block text-xs font-medium text-secondary-500 dark:text-white/80 mb-1 uppercase tracking-wider"
							>
								{t("filters.status")}
							</label>
							<div className="relative">
								<select
									id="patching-runs-filter-status"
									value={runsFilterStatus}
									onChange={(e) => {
										setRunsFilterStatus(e.target.value);
										setRunsPage(1);
									}}
									className="appearance-none w-full pl-3 pr-8 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white text-sm"
								>
									{STATUS_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
								<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
							</div>
						</div>
						<div className="flex-1 min-w-0">
							<label
								htmlFor="patching-runs-filter-type"
								className="block text-xs font-medium text-secondary-500 dark:text-white/80 mb-1 uppercase tracking-wider"
							>
								{t("filters.type")}
							</label>
							<div className="relative">
								<select
									id="patching-runs-filter-type"
									value={runsFilterType}
									onChange={(e) => {
										setRunsFilterType(e.target.value);
										setRunsPage(1);
									}}
									className="appearance-none w-full pl-3 pr-8 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white text-sm"
								>
									{TYPE_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
								<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
							</div>
						</div>
						{hasFilters && (
							<div className="flex items-end">
								<button
									type="button"
									onClick={() => {
										setRunsFilterStatus("");
										setRunsFilterType("");
										setRunsPage(1);
									}}
									className="btn-outline min-h-[44px] sm:min-h-0 text-sm"
								>
									{t("filters.clear")}
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Empty states (§14) */}
				{runs.length === 0 ? (
					<div className="p-4">
						{hasFilters ? (
							<div className="text-center py-8">
								<Search className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
								<p className="text-secondary-500 dark:text-white">
									{t("empty.no_runs_match")}
								</p>
								<p className="text-sm text-secondary-400 dark:text-white mt-2">
									{t("empty.no_runs_match_hint")}
								</p>
							</div>
						) : (
							<div className="text-center py-8">
								<History className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
								<p className="text-secondary-500 dark:text-white">
									{t("empty.no_runs")}
								</p>
								<p className="text-sm text-secondary-400 dark:text-white mt-2">
									Patch runs triggered from the Overview tab or from host detail
									pages will appear here
								</p>
							</div>
						)}
					</div>
				) : (
					<>
						{/* Mobile cards (§20.2) */}
						<div className="md:hidden p-3 space-y-3">
							{runs.map((run) => {
								const isDeletable = deletableStatuses.has(run.status);
								const isApprovable = approvableStatuses.has(run.status);
								const isSelectedForDelete = selectedRunIds.has(run.id);
								const isSelectedForApprove = selectedApproveIds.has(run.id);
								const hasExtraDeps = hasExtraDependencies(run);
								const hostLabel =
									run.hosts?.friendly_name ||
									run.hosts?.hostname ||
									run.host_id;
								return (
									<div
										key={run.id}
										className={`card p-4 space-y-3 ${
											isSelectedForDelete
												? "ring-2 ring-danger-500"
												: isSelectedForApprove
													? "ring-2 ring-primary-500"
													: ""
										}`}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 text-base font-semibold text-secondary-900 dark:text-white truncate">
													<Server className="h-4 w-4 text-secondary-400 shrink-0" />
													<span className="truncate">{hostLabel}</span>
												</div>
												<div className="mt-1">
													<CompactPackageSummary run={run} />
												</div>
											</div>
											<div className="flex items-center gap-1 shrink-0">
												{isDeletable && (
													<button
														type="button"
														onClick={() => handleToggleSelect(run.id)}
														className="min-w-[44px] min-h-[44px] flex items-center justify-center"
														title={t("actions.select_for_delete")}
														aria-label={t("actions.select_for_delete")}
													>
														{isSelectedForDelete ? (
															<CheckSquare className="h-5 w-5 text-danger-600" />
														) : (
															<Square className="h-5 w-5 text-secondary-400" />
														)}
													</button>
												)}
												{isApprovable && (
													<button
														type="button"
														onClick={() => handleToggleApproveSelect(run.id)}
														className="min-w-[44px] min-h-[44px] flex items-center justify-center"
														title={t("actions.select_for_approve")}
														aria-label={t("actions.select_for_approve")}
													>
														{isSelectedForApprove ? (
															<CheckSquare className="h-5 w-5 text-primary-600" />
														) : (
															<Square className="h-5 w-5 text-secondary-400" />
														)}
													</button>
												)}
											</div>
										</div>

										<div className="flex items-center gap-1.5 flex-wrap">
											<PatchRunStatusBadge run={run} />
											{hasExtraDeps && <ValidatedBadge />}
										</div>

										<div className="grid grid-cols-2 gap-2 text-xs text-secondary-500 dark:text-secondary-400 pt-2 border-t border-secondary-200 dark:border-secondary-600">
											<div className="min-w-0">
												<div className="uppercase tracking-wider text-[10px] mb-0.5">
													{t("table.initiated_by")}
												</div>
												<div className="flex items-center gap-1 text-secondary-700 dark:text-white truncate">
													{run.triggered_by_username ? (
														<>
															<User className="h-3.5 w-3.5 shrink-0" />
															<span className="truncate">
																{run.triggered_by_username}
															</span>
														</>
													) : (
														<span>—</span>
													)}
												</div>
											</div>
											<div className="min-w-0">
												<div className="uppercase tracking-wider text-[10px] mb-0.5">
													{t("table.started")}
												</div>
												<div className="text-secondary-700 dark:text-white truncate">
													{formatDate(run.created_at)}
												</div>
											</div>
											{run.completed_at && (
												<div className="min-w-0 col-span-2">
													<div className="uppercase tracking-wider text-[10px] mb-0.5">
														{t("summary.completed")}
													</div>
													<div className="text-secondary-700 dark:text-white truncate">
														{formatDate(run.completed_at)}
													</div>
												</div>
											)}
										</div>

										<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-secondary-200 dark:border-secondary-600">
											<RunRowActions
												run={run}
												onApprove={handleApprove}
												onRetry={handleRetryValidation}
												retryingId={retryingId}
												approvingId={approvingId}
												size="md"
											/>
										</div>
									</div>
								);
							})}
						</div>

						{/* Desktop table (§4.1) */}
						<div className="hidden md:block overflow-x-auto">
							<table className="min-w-full w-full divide-y divide-secondary-200 dark:divide-secondary-600 table-auto">
								<thead className="bg-secondary-50 dark:bg-secondary-700 sticky top-0 z-10">
									<tr>
										<th
											scope="col"
											className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider w-10"
										>
											{deletableRuns.length > 0 ? (
												<button
													type="button"
													onClick={handleToggleSelectAll}
													className="flex items-center text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"
													title={t("actions.select_all_deletable")}
													aria-label={t("actions.select_all_deletable")}
												>
													{allDeletableSelected ? (
														<CheckSquare className="h-4 w-4 text-danger-600" />
													) : (
														<Square className="h-4 w-4" />
													)}
												</button>
											) : null}
										</th>
										<th
											scope="col"
											className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider w-10"
										>
											{approvableRuns.length > 0 ? (
												<button
													type="button"
													onClick={handleToggleApproveSelectAll}
													className="flex items-center text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"
													title={t("actions.select_all_approvable")}
													aria-label={t("actions.select_all_approvable")}
												>
													{allApprovableSelected ? (
														<CheckSquare className="h-4 w-4 text-primary-600" />
													) : (
														<Square className="h-4 w-4" />
													)}
												</button>
											) : null}
										</th>
										<th
											scope="col"
											className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider"
										>
											{t("table.host")}
										</th>
										<th
											scope="col"
											className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider"
										>
											{t("table.type")}
										</th>
										<th
											scope="col"
											className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider whitespace-nowrap"
										>
											{t("table.status")}
										</th>
										<th
											scope="col"
											className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider whitespace-nowrap"
										>
											{t("table.initiated_by")}
										</th>
										<th
											scope="col"
											className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider whitespace-nowrap"
										>
											{t("table.started")}
										</th>
										<th
											scope="col"
											className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider whitespace-nowrap"
										>
											{t("summary.completed")}
										</th>
										<th
											scope="col"
											className="px-3 sm:px-4 py-2 text-right text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider whitespace-nowrap"
										>
											{t("table.actions")}
										</th>
									</tr>
								</thead>
								<tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-600">
									{runs.map((run) => {
										const isDeletable = deletableStatuses.has(run.status);
										const isApprovable = approvableStatuses.has(run.status);
										const isSelectedForDelete = selectedRunIds.has(run.id);
										const isSelectedForApprove = selectedApproveIds.has(run.id);
										const isSelected =
											isSelectedForDelete || isSelectedForApprove;
										const hasExtraDeps = hasExtraDependencies(run);
										const hostLabel =
											run.hosts?.friendly_name ||
											run.hosts?.hostname ||
											run.host_id;
										return (
											<tr
												key={run.id}
												className={`transition-colors ${
													isSelected
														? "bg-primary-50 dark:bg-primary-600/20 hover:bg-primary-50 dark:hover:bg-primary-600/30"
														: "hover:bg-secondary-50 dark:hover:bg-secondary-700"
												}`}
											>
												<td className="px-3 sm:px-4 py-2 whitespace-nowrap w-10">
													{isDeletable ? (
														<button
															type="button"
															onClick={() => handleToggleSelect(run.id)}
															className="flex items-center text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"
															title={t("actions.select_for_delete")}
															aria-label={t("actions.select_for_delete")}
														>
															{isSelectedForDelete ? (
																<CheckSquare className="h-4 w-4 text-danger-600" />
															) : (
																<Square className="h-4 w-4" />
															)}
														</button>
													) : null}
												</td>
												<td className="px-3 sm:px-4 py-2 whitespace-nowrap w-10">
													{isApprovable ? (
														<button
															type="button"
															onClick={() => handleToggleApproveSelect(run.id)}
															className="flex items-center text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"
															title={t("actions.select_for_approve")}
															aria-label={t("actions.select_for_approve")}
														>
															{isSelectedForApprove ? (
																<CheckSquare className="h-4 w-4 text-primary-600" />
															) : (
																<Square className="h-4 w-4" />
															)}
														</button>
													) : null}
												</td>
												<td className="px-3 sm:px-4 py-2 text-sm text-secondary-900 dark:text-white min-w-0">
													<div
														className="truncate max-w-[220px]"
														title={hostLabel}
													>
														{hostLabel}
													</div>
												</td>
												<td className="px-3 sm:px-4 py-2 text-sm text-secondary-900 dark:text-white min-w-0">
													<div className="max-w-[320px]">
														<CompactPackageSummary run={run} />
													</div>
												</td>
												<td className="px-3 sm:px-4 py-2 whitespace-nowrap">
													<div className="flex items-center gap-1.5">
														<PatchRunStatusBadge run={run} />
														{hasExtraDeps && <ValidatedBadge />}
													</div>
												</td>
												<td className="px-3 sm:px-4 py-2 whitespace-nowrap text-sm text-secondary-600 dark:text-secondary-400">
													{run.triggered_by_username ? (
														<span className="inline-flex items-center gap-1">
															<User className="h-4 w-4" />
															{run.triggered_by_username}
														</span>
													) : (
														"—"
													)}
												</td>
												<td className="px-3 sm:px-4 py-2 whitespace-nowrap text-sm text-secondary-600 dark:text-secondary-400">
													{formatDate(run.created_at)}
												</td>
												<td className="px-3 sm:px-4 py-2 whitespace-nowrap text-sm text-secondary-600 dark:text-secondary-400">
													{run.completed_at
														? formatDate(run.completed_at)
														: "—"}
												</td>
												<td className="px-3 sm:px-4 py-2 whitespace-nowrap text-right">
													<div className="flex items-center justify-end gap-2">
														<RunRowActions
															run={run}
															onApprove={handleApprove}
															onRetry={handleRetryValidation}
															retryingId={retryingId}
															approvingId={approvingId}
															size="sm"
														/>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</>
				)}

				{/* Pagination (§6.1) */}
				{totalRuns > 0 && (
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t border-secondary-200 dark:border-secondary-600">
						<div className="flex flex-wrap items-center gap-3 sm:gap-4">
							<div className="flex items-center gap-2">
								<label
									htmlFor="patching-runs-page-size"
									className="text-sm text-secondary-700 dark:text-white"
								>
									{t("pagination.rows_per_page")}
								</label>
								<select
									id="patching-runs-page-size"
									value={runsLimit}
									onChange={(e) => {
										setRunsLimit(Number(e.target.value));
										setRunsPage(1);
									}}
									className="text-sm border border-secondary-300 dark:border-secondary-600 rounded px-2 py-1 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
								>
									<option value={25}>25</option>
									<option value={50}>50</option>
									<option value={100}>100</option>
									<option value={200}>200</option>
								</select>
							</div>
							<span className="text-sm text-secondary-700 dark:text-white">
								{t("pagination.range", { start: rangeStart, end: rangeEnd, total: totalRuns })}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								disabled={runsPage <= 1}
								onClick={() => setRunsPage((p) => Math.max(1, p - 1))}
								className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-600 text-secondary-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label={t("pagination.previous")}
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<span className="text-sm text-secondary-700 dark:text-white">
								{t("pagination.page_of", { page: runsPage, pages: totalPages })}
							</span>
							<button
								type="button"
								disabled={runsPage >= totalPages}
								onClick={() => setRunsPage((p) => p + 1)}
								className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-600 text-secondary-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label={t("pagination.next")}
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

/* ───────────────────── Policies Tab ───────────────────── */

const useDelayTypeLabels = () => {
	const { t } = useTranslation("patching");
	return {
		immediate: t("policies.delay_labels.immediate"),
		delayed: t("policies.delay_labels.delayed"),
		fixed_time: t("policies.delay_labels.fixed_time"),
	};
};

function PoliciesTab() {
	const { t } = useTranslation("patching");
	const queryClient = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();
	const { settings } = useSettings();
	const orgTimezone = settings?.timezone || "UTC";
	const [showModal, setShowModal] = useState(false);
	const [editingPolicy, setEditingPolicy] = useState(null);
	const [form, setForm] = useState({
		name: "",
		description: "",
		patch_delay_type: "immediate",
		delay_minutes: 60,
		fixed_time_utc: "03:00",
	});
	const [expandedPolicyId, setExpandedPolicyId] = useState(null);

	const { data: policies = [], isLoading } = useQuery({
		queryKey: ["patching-policies"],
		queryFn: () => patchingAPI.getPolicies(),
	});

	const { data: hostGroups = [] } = useQuery({
		queryKey: ["hostGroups"],
		queryFn: () => hostGroupsAPI.list().then((res) => res.data),
	});

	const { data: hostsData } = useQuery({
		// Distinct key: other pages cache the default first-page response under
		// "hosts-list", and the exclusion picker intersects this with group
		// membership, so a truncated page renders as "nothing left to exclude".
		queryKey: ["hosts-list", "all"],
		queryFn: () => adminHostsAPI.list({ all: true }).then((res) => res.data),
	});
	const hosts = hostsData?.data || [];

	const createMutation = useMutation({
		mutationFn: (data) => patchingAPI.createPolicy(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patching-policies"] });
			setShowModal(false);
			resetForm();
			toast.success(t("toasts.policy_created"));
		},
		onError: (err) => toast.error(err.response?.data?.error || err.message),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }) => patchingAPI.updatePolicy(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patching-policies"] });
			setShowModal(false);
			setEditingPolicy(null);
			toast.success(t("toasts.policy_updated"));
		},
		onError: (err) => toast.error(err.response?.data?.error || err.message),
	});

	const deleteMutation = useMutation({
		mutationFn: (id) => patchingAPI.deletePolicy(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patching-policies"] });
			toast.success(t("toasts.policy_deleted"));
		},
		onError: (err) => toast.error(err.response?.data?.error || err.message),
	});

	const resetForm = () =>
		setForm({
			name: "",
			description: "",
			patch_delay_type: "immediate",
			delay_minutes: 60,
			fixed_time_utc: "03:00",
		});

	const openCreate = () => {
		setEditingPolicy(null);
		resetForm();
		setShowModal(true);
	};

	const openEdit = (policy) => {
		setEditingPolicy(policy);
		setForm({
			name: policy.name,
			description: policy.description || "",
			patch_delay_type: policy.patch_delay_type || "immediate",
			delay_minutes: policy.delay_minutes ?? 60,
			fixed_time_utc: policy.fixed_time_utc || "03:00",
		});
		setShowModal(true);
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const payload = {
			name: form.name.trim(),
			description: form.description.trim() || null,
			patch_delay_type: form.patch_delay_type,
			delay_minutes:
				form.patch_delay_type === "delayed" ? Number(form.delay_minutes) : null,
			fixed_time_utc:
				form.patch_delay_type === "fixed_time" ? form.fixed_time_utc : null,
		};
		if (editingPolicy) {
			updateMutation.mutate({ id: editingPolicy.id, data: payload });
		} else {
			createMutation.mutate(payload);
		}
	};

	const delay_type_labels = useDelayTypeLabels();
	const formatSchedule = (policy) => {
		const label =
			delay_type_labels[policy.patch_delay_type] || policy.patch_delay_type;
		if (policy.patch_delay_type === "delayed" && policy.delay_minutes != null) {
			return `${label} (${policy.delay_minutes} min)`;
		}
		if (policy.patch_delay_type === "fixed_time" && policy.fixed_time_utc) {
			return `${label} at ${policy.fixed_time_utc} (${orgTimezone})`;
		}
		return label;
	};

	return (
		<div className="mt-4 space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-secondary-600 dark:text-secondary-400">
					Patch policies control when patches run. Assign policies to hosts or
					host groups.
				</p>
				<button
					type="button"
					onClick={openCreate}
					className="btn-primary flex items-center gap-2"
				>
					<Plus className="h-4 w-4" />
					{t("policies.create")}
				</button>
			</div>

			<div className="card p-4 md:p-6">
				{isLoading ? (
					<div className="p-8 text-center text-secondary-500">Loading...</div>
				) : policies.length === 0 ? (
					<div className="p-8 text-center text-secondary-500">
						{t("policies.empty")}
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-600">
							<thead className="bg-secondary-50 dark:bg-secondary-700">
								<tr>
									<th
										scope="col"
										className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider"
									>
										{t("policies.name")}
									</th>
									<th
										scope="col"
										className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider"
									>
										{t("policies.description")}
									</th>
									<th
										scope="col"
										className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider"
									>
										{t("policies.schedule")}
									</th>
									<th
										scope="col"
										className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider"
									>
										{t("policies.assignments")}
									</th>
									<th
										scope="col"
										className="px-4 py-3 text-right text-xs font-medium text-secondary-500 dark:text-white uppercase tracking-wider"
									>
										{t("table.actions")}
									</th>
								</tr>
							</thead>
							<tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-600">
								{policies.map((policy) => (
									<Fragment key={policy.id}>
										<tr className="hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors">
											<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-secondary-900 dark:text-white">
												{policy.name}
											</td>
											<td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400 max-w-xs truncate">
												{policy.description || "-"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600 dark:text-secondary-400">
												<span className="inline-flex items-center gap-1">
													<Clock className="h-3.5 w-3.5" />
													{formatSchedule(policy)}
												</span>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm">
												<button
													type="button"
													onClick={() =>
														setExpandedPolicyId(
															expandedPolicyId === policy.id ? null : policy.id,
														)
													}
													className="text-primary-600 dark:text-primary-400 hover:underline"
												>
													{expandedPolicyId === policy.id
														? "Hide"
														: `${policy._count?.assignments ?? 0} assignment(s)`}
												</button>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-right">
												<div className="flex items-center justify-end gap-2">
													<button
														type="button"
														onClick={() => openEdit(policy)}
														className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-600 dark:text-secondary-300"
														title={t("common:buttons.edit")}
													>
														<Edit className="h-4 w-4" />
													</button>
													<button
														type="button"
														onClick={async () => {
															if (
																await confirm({
																	title: "Delete policy",
																	message: `Delete the patching policy "${policy.name}"?`,
																	confirmLabel: "Delete policy",
																})
															)
																deleteMutation.mutate(policy.id);
														}}
														className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
														title={t("common:buttons.delete")}
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</td>
										</tr>
										{expandedPolicyId === policy.id && (
											<tr key={`${policy.id}-assignments`}>
												<td colSpan={5} className="p-0">
													<PolicyAssignments
														policy={policy}
														hosts={hosts}
														hostGroups={hostGroups}
														onUpdate={() =>
															queryClient.invalidateQueries({
																queryKey: ["patching-policies"],
															})
														}
													/>
												</td>
											</tr>
										)}
									</Fragment>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Create/Edit Modal */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
					<div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-600">
							<h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
								{editingPolicy ? t("policies.edit_title") : t("policies.create_title")}
							</h3>
							<button
								type="button"
								onClick={() => setShowModal(false)}
								className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleSubmit} className="p-4 space-y-4">
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
									{t("policies.name")}
								</label>
								<input
									type="text"
									value={form.name}
									onChange={(e) =>
										setForm((f) => ({ ...f, name: e.target.value }))
									}
									className="w-full rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
									Description (optional)
								</label>
								<input
									type="text"
									value={form.description}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											description: e.target.value,
										}))
									}
									className="w-full rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
									Patch delay
								</label>
								<select
									value={form.patch_delay_type}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											patch_delay_type: e.target.value,
										}))
									}
									className="w-full rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2"
								>
									<option value="immediate">Immediate</option>
									<option value="delayed">Delayed (run after N minutes)</option>
									<option value="fixed_time">Fixed time (e.g. 3:00 AM)</option>
								</select>
							</div>
							{form.patch_delay_type === "delayed" && (
								<div>
									<label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
										Delay (minutes)
									</label>
									<input
										type="number"
										min={1}
										value={form.delay_minutes}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												delay_minutes: e.target.value,
											}))
										}
										className="w-full rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2"
									/>
								</div>
							)}
							{form.patch_delay_type === "fixed_time" && (
								<div>
									<label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
										Time (HH:MM)
									</label>
									<input
										type="text"
										placeholder="03:00"
										value={form.fixed_time_utc}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												fixed_time_utc: e.target.value,
											}))
										}
										className="w-full rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2"
									/>
									<p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
										Local time in the organization timezone (
										<span className="font-medium">{orgTimezone}</span>). Change
										it under Settings &rarr; General.
									</p>
								</div>
							)}
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="btn-outline"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="btn-primary"
									disabled={
										createMutation.isPending || updateMutation.isPending
									}
								>
									{editingPolicy ? t("policies.update") : t("common:buttons.create", { defaultValue: "Create" })}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

/* ───────────────── Policy Assignments (inline) ───────────────── */

function PolicyAssignments({ policy, hosts, hostGroups, onUpdate }) {
	const { t } = useTranslation("patching");
	const queryClient = useQueryClient();
	const toast = useToast();
	const [addTargetType, setAddTargetType] = useState("host");
	const [addTargetId, setAddTargetId] = useState("");
	const [addExclusionHostId, setAddExclusionHostId] = useState("");

	const {
		data: fullPolicy,
		isPending: policyPending,
		isError: policyError,
	} = useQuery({
		queryKey: ["patching-policy", policy.id],
		queryFn: () => patchingAPI.getPolicyById(policy.id),
		enabled: !!policy.id,
	});

	const assignments = fullPolicy?.assignments || [];
	const exclusions = fullPolicy?.exclusions || [];

	const addAssignmentMutation = useMutation({
		mutationFn: () =>
			patchingAPI.addPolicyAssignment(policy.id, addTargetType, addTargetId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patching-policies"] });
			queryClient.invalidateQueries({
				queryKey: ["patching-policy", policy.id],
			});
			setAddTargetId("");
			onUpdate?.();
			toast.success(t("toasts.assignment_added"));
		},
		onError: (err) => toast.error(err.response?.data?.error || err.message),
	});

	const removeAssignmentMutation = useMutation({
		mutationFn: (assignmentId) =>
			patchingAPI.removePolicyAssignment(policy.id, assignmentId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patching-policies"] });
			queryClient.invalidateQueries({
				queryKey: ["patching-policy", policy.id],
			});
			onUpdate?.();
			toast.success(t("toasts.assignment_removed"));
		},
		onError: (err) => toast.error(err.response?.data?.error || err.message),
	});

	const addExclusionMutation = useMutation({
		mutationFn: () =>
			patchingAPI.addPolicyExclusion(policy.id, addExclusionHostId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["patching-policy", policy.id],
			});
			setAddExclusionHostId("");
			onUpdate?.();
			toast.success(t("toasts.exclusion_added"));
		},
		onError: (err) => toast.error(err.response?.data?.error || err.message),
	});

	const removeExclusionMutation = useMutation({
		mutationFn: (hostId) =>
			patchingAPI.removePolicyExclusion(policy.id, hostId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["patching-policy", policy.id],
			});
			onUpdate?.();
			toast.success(t("toasts.exclusion_removed"));
		},
		onError: (err) => toast.error(err.response?.data?.error || err.message),
	});

	const getTargetLabel = (a) => {
		if (a.target_type === "host") {
			const h = hosts.find((x) => x.id === a.target_id);
			return h?.friendly_name || h?.hostname || a.target_id;
		}
		const g = hostGroups.find((x) => x.id === a.target_id);
		return g?.name || a.target_id;
	};

	const assignedGroupIds = useMemo(
		() =>
			new Set(
				assignments
					.filter((a) => a.target_type === "host_group")
					.map((a) => a.target_id),
			),
		[assignments],
	);

	// An exclusion only has meaning against a group assignment, so the picker
	// offers members of the assigned groups that are not already excluded.
	const excludableHosts = useMemo(() => {
		if (assignedGroupIds.size === 0) return [];
		const excludedHostIds = new Set(exclusions.map((e) => e.host_id));
		return hosts.filter(
			(h) =>
				!excludedHostIds.has(h.id) &&
				(h.host_group_memberships || []).some((m) =>
					assignedGroupIds.has(m?.host_groups?.id ?? m?.id),
				),
		);
	}, [hosts, exclusions, assignedGroupIds]);

	return (
		<div className="px-4 pb-4 pt-3 bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-600">
			<div className="space-y-3">
				<div className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
					<Users className="h-4 w-4" />
					{t("assignments.applied_to")}
				</div>
				{assignments.length === 0 ? (
					<p className="text-sm text-secondary-500">
						{t("assignments.empty")}
					</p>
				) : (
					<ul className="flex flex-wrap gap-2">
						{assignments.map((a) => (
							<li
								key={a.id}
								className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary-200 dark:bg-secondary-700 text-sm"
							>
								{a.target_type === "host" ? (
									<Server className="h-3 w-3" />
								) : (
									<Users className="h-3 w-3" />
								)}
								{getTargetLabel(a)}
								<button
									type="button"
									onClick={() => removeAssignmentMutation.mutate(a.id)}
									className="ml-1 text-secondary-500 hover:text-red-600"
								>
									<X className="h-3 w-3" />
								</button>
							</li>
						))}
					</ul>
				)}
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={addTargetType}
						onChange={(e) => {
							setAddTargetType(e.target.value);
							setAddTargetId("");
						}}
						className="rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm px-2 py-1"
					>
						<option value="host">{t("assignments.host")}</option>
						<option value="host_group">{t("assignments.host_group")}</option>
					</select>
					<select
						value={addTargetId}
						onChange={(e) => setAddTargetId(e.target.value)}
						className="rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm px-2 py-1 min-w-[160px]"
					>
						<option value="">
							{addTargetType === "host"
								? t("assignments.select_host")
								: t("assignments.select_group")}
						</option>
						{addTargetType === "host"
							? hosts.map((h) => (
									<option key={h.id} value={h.id}>
										{h.friendly_name || h.hostname || h.id}
									</option>
								))
							: hostGroups.map((g) => (
									<option key={g.id} value={g.id}>
										{g.name}
									</option>
								))}
					</select>
					<button
						type="button"
						onClick={() => addTargetId && addAssignmentMutation.mutate()}
						disabled={!addTargetId || addAssignmentMutation.isPending}
						className="btn-outline text-sm py-1"
					>
						{t("assignments.add")}
					</button>
				</div>

				<div className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 pt-2 border-t border-secondary-200 dark:border-secondary-600">
					<Clock className="h-4 w-4" />
					{t("assignments.exclusions_title")}
				</div>
				{exclusions.length === 0 ? (
					<p className="text-sm text-secondary-500">{t("assignments.no_exclusions")}</p>
				) : (
					<ul className="flex flex-wrap gap-2">
						{exclusions.map((exc) => (
							<li
								key={exc.id}
								className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-sm"
							>
								{exc.hosts?.friendly_name || exc.hosts?.hostname || exc.host_id}
								<button
									type="button"
									onClick={() => removeExclusionMutation.mutate(exc.host_id)}
									className="ml-1 text-amber-700 dark:text-amber-400 hover:text-red-600"
								>
									<X className="h-3 w-3" />
								</button>
							</li>
						))}
					</ul>
				)}
				{policyPending ? (
					<p className="text-sm text-secondary-500 dark:text-secondary-400">
						{t("assignments.loading")}
					</p>
				) : policyError ? (
					<p className="text-sm text-danger-600 dark:text-danger-400">
						{t("assignments.error")}
					</p>
				) : assignedGroupIds.size === 0 ? (
					<p className="text-sm text-secondary-500 dark:text-secondary-400">
						{t("assignments.need_group")}
					</p>
				) : (
					<div className="flex flex-wrap items-center gap-2">
						<select
							value={addExclusionHostId}
							onChange={(e) => setAddExclusionHostId(e.target.value)}
							disabled={excludableHosts.length === 0}
							className="rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm px-2 py-1 min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<option value="">
								{excludableHosts.length === 0
									? "No hosts left to exclude"
									: "Select host to exclude..."}
							</option>
							{excludableHosts.map((h) => (
								<option key={h.id} value={h.id}>
									{h.friendly_name || h.hostname || h.id}
								</option>
							))}
						</select>
						<button
							type="button"
							onClick={() =>
								addExclusionHostId && addExclusionMutation.mutate()
							}
							disabled={!addExclusionHostId || addExclusionMutation.isPending}
							className="btn-outline text-sm py-1 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{t("assignments.exclude_host")}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

export default Patching;
