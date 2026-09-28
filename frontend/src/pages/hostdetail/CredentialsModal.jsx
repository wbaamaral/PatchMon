import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	CheckCircle,
	Copy,
	Eye,
	EyeOff,
	RotateCcw,
	X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import ModalPortal from "../../components/ui/ModalPortal";
import { adminHostsAPI, settingsAPI } from "../../utils/api";
import WaitingForConnection from "./WaitingForConnection";

const CredentialsModal = ({ host, isOpen, onClose, plaintextApiKey }) => {
	const { t } = useTranslation("hosts");
	const [showApiKey, setShowApiKey] = useState(false);
	const [activeTab, setActiveTab] = useState("quick-install");
	const [forceInstall, setForceInstall] = useState(false);
	const [windowsIgnoreSsl, setWindowsIgnoreSsl] = useState(false);
	const [windowsUseCurl, setWindowsUseCurl] = useState(false);
	const [regeneratedCredentials, setRegeneratedCredentials] = useState(null);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const [showWaitingScreen, setShowWaitingScreen] = useState(false);
	const apiIdInputId = useId();
	const apiKeyInputId = useId();
	const queryClient = useQueryClient();

	// Use plaintext API key if available (from host creation or regeneration).
	// The API never returns the stored hash for security, so we only have a valid key
	// when it was just created (plaintextApiKey) or regenerated (regeneratedCredentials).
	const effectiveApiKey =
		regeneratedCredentials?.apiKey || plaintextApiKey || host.api_key;
	const effectiveApiId = regeneratedCredentials?.apiId || host.api_id;
	const hasValidPlaintextKey = !!(
		regeneratedCredentials?.apiKey || plaintextApiKey
	);
	const isApiKeyHash = !hasValidPlaintextKey;

	const handleRegenerateCredentials = async () => {
		setIsRegenerating(true);
		try {
			const response = await adminHostsAPI.regenerateCredentials(host.id);
			setRegeneratedCredentials({
				apiId: response.data.apiId,
				apiKey: response.data.apiKey,
			});
			queryClient.invalidateQueries({ queryKey: ["host", host.id] });
		} catch (error) {
			console.error("Failed to regenerate credentials:", error);
		} finally {
			setIsRegenerating(false);
		}
	};

	const { data: serverUrlData } = useQuery({
		queryKey: ["serverUrl"],
		queryFn: () => settingsAPI.getServerUrl().then((res) => res.data),
	});

	// Use configured server URL, or derive from current page URL in production
	const serverUrl =
		serverUrlData?.server_url ||
		(import.meta.env.PROD
			? `${window.location.protocol}//${window.location.host}`
			: "http://localhost:3001");

	// Fetch settings for dynamic curl flags (local to modal)
	const { data: settings } = useQuery({
		queryKey: ["settings"],
		queryFn: () => settingsAPI.get().then((res) => res.data),
	});

	// Helper function to get curl flags based on settings
	const getCurlFlags = () => {
		return settings?.ignore_ssl_self_signed ? "-sk" : "-s";
	};

	// Helper function to get the install URL (OS-specific)
	const getInstallUrl = () => {
		const base = `${serverUrl}/api/v1/hosts/install`;
		const params = new URLSearchParams();
		if (host?.expected_platform === "freebsd") params.set("os", "freebsd");
		if (host?.expected_platform === "windows" || host?.os_type === "windows")
			params.set("os", "windows");
		if (forceInstall && host?.expected_platform !== "windows")
			params.set("force", "true");
		const qs = params.toString();
		return qs ? `${base}?${qs}` : base;
	};

	// Helper function to build the shell command suffix (no sudo on FreeBSD/pfSense)
	const getShellCommand = () => {
		const use_sudo = host?.expected_platform !== "freebsd";
		const base = use_sudo ? "sudo sh" : "sh";
		return forceInstall ? `${base} -s -- --force` : base;
	};

	const isWindowsHost =
		host?.expected_platform === "windows" || host?.os_type === "windows";

	// Sync Windows SSL bypass with global setting when it loads
	useEffect(() => {
		if (settings?.ignore_ssl_self_signed !== undefined) {
			setWindowsIgnoreSsl(settings.ignore_ssl_self_signed);
		}
	}, [settings?.ignore_ssl_self_signed]);

	const getWindowsInstallCommand = () => {
		const installUrl = getInstallUrl();
		const sslBlock = windowsIgnoreSsl
			? "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; [Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }; "
			: "";
		if (windowsUseCurl) {
			const curlInsecure = windowsIgnoreSsl ? " -k" : "";
			return `${sslBlock}curl.exe${curlInsecure} -s -H "X-API-ID: ${effectiveApiId}" -H "X-API-KEY: ${effectiveApiKey}" -o "$env:TEMP\\patchmon-install.ps1" "${installUrl}"; if ($LASTEXITCODE -eq 0) { & "$env:TEMP\\patchmon-install.ps1" } else { Write-Error "curl failed with exit code $LASTEXITCODE" }`;
		}
		// -OutFile writes the response bytes straight to disk. Reading
		// $r.Content instead makes Windows PowerShell 5.1 decode the body
		// through the Windows ANSI code page, which corrupts every non-ASCII
		// character in the script.
		return `${sslBlock}Invoke-WebRequest -Uri "${installUrl}" -Headers @{"X-API-ID"="${effectiveApiId}"; "X-API-KEY"="${effectiveApiKey}"} -UseBasicParsing -OutFile "$env:TEMP\\patchmon-install.ps1"; & "$env:TEMP\\patchmon-install.ps1"`;
	};

	const getLinuxInstallCommand = () =>
		`curl ${getCurlFlags()} "${getInstallUrl()}" -H "X-API-ID: ${effectiveApiId}" -H "X-API-KEY: ${effectiveApiKey}" | ${getShellCommand()}`;

	const copyToClipboard = async (text) => {
		try {
			// Try modern clipboard API first
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(text);
				return;
			}

			// Fallback for older browsers or non-secure contexts
			const textArea = document.createElement("textarea");
			textArea.value = text;
			textArea.style.position = "fixed";
			textArea.style.left = "-999999px";
			textArea.style.top = "-999999px";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			try {
				const successful = document.execCommand("copy");
				if (!successful) {
					throw new Error("Copy command failed");
				}
			} catch {
				// If all else fails, show the text in a prompt
				prompt(t("credentials.copy_command_prompt"), text);
			} finally {
				document.body.removeChild(textArea);
			}
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
			// Show the text in a prompt as last resort
			prompt(t("credentials.copy_command_prompt"), text);
		}
	};

	if (!isOpen || !host) return null;

	// Show waiting screen if enabled
	if (showWaitingScreen) {
		return (
			<WaitingForConnection
				host={host}
				onBack={() => setShowWaitingScreen(false)}
				onClose={onClose}
				plaintextApiKey={effectiveApiKey}
				serverUrl={serverUrl}
				curlFlags={getCurlFlags()}
				installUrl={getInstallUrl()}
				shellCommand={getShellCommand()}
				installCommand={isWindowsHost ? getWindowsInstallCommand() : null}
			/>
		);
	}

	const modal = (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] p-4">
			<div className="bg-white dark:bg-secondary-800 rounded-lg p-4 md:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
				<div className="flex justify-between items-center mb-4 gap-3">
					<h3 className="text-base md:text-lg font-medium text-secondary-900 dark:text-white truncate">
						{t("credentials.title", { name: host.friendly_name })}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-secondary-400 hover:text-secondary-600 dark:text-white dark:hover:text-secondary-300 flex-shrink-0"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Mobile Button Navigation */}
				<div className="md:hidden space-y-2 mb-4">
					<button
						type="button"
						onClick={() => setActiveTab("quick-install")}
						className={`w-full flex items-center justify-between px-4 py-3 rounded-md font-medium text-sm transition-colors ${
							activeTab === "quick-install"
								? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800"
								: "bg-secondary-50 dark:bg-secondary-700 text-secondary-700 dark:text-white border border-secondary-200 dark:border-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-600"
						}`}
					>
						<span>{t("credentials.tab_quick_install")}</span>
						{activeTab === "quick-install" && (
							<CheckCircle className="h-5 w-5 text-primary-600 dark:text-primary-400" />
						)}
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("credentials")}
						className={`w-full flex items-center justify-between px-4 py-3 rounded-md font-medium text-sm transition-colors ${
							activeTab === "credentials"
								? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800"
								: "bg-secondary-50 dark:bg-secondary-700 text-secondary-700 dark:text-white border border-secondary-200 dark:border-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-600"
						}`}
					>
						<span>{t("credentials.tab_api_credentials")}</span>
						{activeTab === "credentials" && (
							<CheckCircle className="h-5 w-5 text-primary-600 dark:text-primary-400" />
						)}
					</button>
				</div>

				{/* Desktop Tab Navigation */}
				<div className="hidden md:block border-b border-secondary-200 dark:border-secondary-600 mb-4 md:mb-6">
					<nav className="-mb-px flex space-x-8">
						<button
							type="button"
							onClick={() => setActiveTab("quick-install")}
							className={`py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === "quick-install"
									? "border-primary-500 text-primary-600 dark:text-primary-400"
									: "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-white dark:hover:text-primary-400"
							}`}
						>
							{t("credentials.tab_quick_install")}
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("credentials")}
							className={`py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === "credentials"
									? "border-primary-500 text-primary-600 dark:text-primary-400"
									: "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-white dark:hover:text-primary-400"
							}`}
						>
							{t("credentials.tab_api_credentials")}
						</button>
					</nav>
				</div>

				{/* Tab Content */}
				{activeTab === "quick-install" && (
					<div className="space-y-4">
						<div className="bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-lg p-3 md:p-4">
							<h4 className="text-xs md:text-sm font-medium text-primary-900 dark:text-primary-200 mb-2">
								{t("credentials.one_line_install")}
							</h4>
							<p className="text-xs md:text-sm text-primary-700 dark:text-primary-300 mb-3">
								{t("credentials.one_line_desc")}
							</p>

							{/* Force Install Toggle (Linux/FreeBSD only) */}
							{!isWindowsHost && (
								<div className="mb-3">
									<label className="flex items-center gap-2 text-xs md:text-sm">
										<input
											type="checkbox"
											checked={forceInstall}
											onChange={(e) => setForceInstall(e.target.checked)}
											className="rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 dark:bg-secondary-700"
										/>
										<span className="text-primary-800 dark:text-primary-200">
											{t("credentials.force_install")}
										</span>
									</label>
									<p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
										{t("credentials.force_install_hint")}
									</p>
								</div>
							)}

							{/* Windows options: SSL bypass and curl alternative */}
							{isWindowsHost && (
								<div className="mb-3 flex flex-wrap items-center gap-4">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={windowsIgnoreSsl}
											onChange={(e) => setWindowsIgnoreSsl(e.target.checked)}
											className="rounded border-secondary-400 text-primary-600 focus:ring-primary-500"
										/>
										<span className="text-xs md:text-sm text-primary-800 dark:text-primary-200">
											{t("credentials.windows_ignore_ssl")}
										</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={windowsUseCurl}
											onChange={(e) => setWindowsUseCurl(e.target.checked)}
											className="rounded border-secondary-400 text-primary-600 focus:ring-primary-500"
										/>
										<span className="text-xs md:text-sm text-primary-800 dark:text-primary-200">
											{t("credentials.windows_use_curl")}
										</span>
									</label>
								</div>
							)}

							{isApiKeyHash && (
								<div className="mb-3 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg">
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-start gap-2">
											<AlertTriangle className="h-4 w-4 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
											<div>
												<p className="text-xs md:text-sm font-medium text-warning-800 dark:text-warning-200">
													{t("credentials.api_key_not_available")}
												</p>
												<p className="text-xs text-warning-700 dark:text-warning-300 mt-1">
													{t("credentials.api_key_not_available_desc")}
												</p>
											</div>
										</div>
										<button
											type="button"
											onClick={handleRegenerateCredentials}
											disabled={isRegenerating}
											className="btn-outline flex items-center gap-1 text-xs whitespace-nowrap"
										>
											<RotateCcw
												className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`}
											/>
											{isRegenerating
												? t("credentials.regenerating")
												: t("credentials.regenerate")}
										</button>
									</div>
								</div>
							)}

							<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
								{isWindowsHost ? (
									<textarea
										readOnly
										rows={windowsIgnoreSsl && !windowsUseCurl ? 6 : 2}
										value={
											isApiKeyHash
												? t("credentials.api_key_unavailable_cmd")
												: getWindowsInstallCommand()
										}
										disabled={isApiKeyHash}
										className={`flex-1 px-3 py-2 border rounded-md text-xs md:text-sm font-mono break-all resize-none ${isApiKeyHash ? "border-warning-300 dark:border-warning-600 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300" : "border-primary-300 dark:border-primary-600 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white"}`}
									/>
								) : (
									<input
										type="text"
										value={
											isApiKeyHash
												? t("credentials.api_key_unavailable_cmd")
												: getLinuxInstallCommand()
										}
										readOnly
										disabled={isApiKeyHash}
										className={`flex-1 px-3 py-2 border rounded-md text-xs md:text-sm font-mono break-all ${isApiKeyHash ? "border-warning-300 dark:border-warning-600 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300" : "border-primary-300 dark:border-primary-600 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white"}`}
									/>
								)}
								<button
									type="button"
									onClick={async () => {
										const command = isWindowsHost
											? getWindowsInstallCommand()
											: getLinuxInstallCommand();
										await copyToClipboard(command);
										// Show waiting screen after copying
										if (!isApiKeyHash) {
											setShowWaitingScreen(true);
										}
									}}
									disabled={isApiKeyHash}
									className="btn-outline flex items-center justify-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Copy className="h-4 w-4" />
									{t("credentials.copy")}
								</button>
							</div>
						</div>
					</div>
				)}

				{activeTab === "credentials" && (
					<div className="space-y-4 md:space-y-6">
						<div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-3 md:p-4">
							<h4 className="text-xs md:text-sm font-medium text-secondary-900 dark:text-white mb-3">
								{t("credentials.api_credentials")}
							</h4>
							<div className="space-y-4">
								<div>
									<label
										htmlFor={apiIdInputId}
										className="block text-xs md:text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1"
									>
										{t("credentials.api_id")}
									</label>
									<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
										<input
											id={apiIdInputId}
											type="text"
											value={effectiveApiId}
											readOnly
											className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-secondary-50 dark:bg-secondary-800 text-xs md:text-sm font-mono text-secondary-900 dark:text-white break-all"
										/>
										<button
											type="button"
											onClick={() => copyToClipboard(effectiveApiId)}
											className="btn-outline flex items-center justify-center gap-1 whitespace-nowrap"
										>
											<Copy className="h-4 w-4" />
											{t("credentials.copy")}
										</button>
									</div>
								</div>

								<div>
									<label
										htmlFor={apiKeyInputId}
										className="block text-xs md:text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1"
									>
										{t("credentials.api_key")}
									</label>
									{isApiKeyHash && (
										<div className="mb-2 p-2 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg">
											<p className="text-xs text-warning-700 dark:text-warning-300">
												{t("credentials.api_key_hashed_warning")}
											</p>
										</div>
									)}
									<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
										<input
											id={apiKeyInputId}
											type={showApiKey ? "text" : "password"}
											value={
												isApiKeyHash
													? t("credentials.api_key_hashed_value")
													: effectiveApiKey
											}
											readOnly
											disabled={isApiKeyHash}
											className={`flex-1 px-3 py-2 border rounded-md text-xs md:text-sm font-mono break-all ${isApiKeyHash ? "border-warning-300 dark:border-warning-600 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300" : "border-secondary-300 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-white"}`}
										/>
										<button
											type="button"
											onClick={() => setShowApiKey(!showApiKey)}
											disabled={isApiKeyHash}
											className="btn-outline flex items-center justify-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{showApiKey ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
										<button
											type="button"
											onClick={() => copyToClipboard(effectiveApiKey)}
											disabled={isApiKeyHash}
											className="btn-outline flex items-center justify-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<Copy className="h-4 w-4" />
											{t("credentials.copy")}
										</button>
									</div>
								</div>
							</div>
						</div>

						<div className="bg-warning-50 dark:bg-warning-900 border border-warning-200 dark:border-warning-700 rounded-lg p-3 md:p-4">
							<div className="flex items-start gap-3">
								<AlertTriangle className="h-5 w-5 text-warning-400 dark:text-warning-300 flex-shrink-0 mt-0.5" />
								<div className="min-w-0">
									<h3 className="text-xs md:text-sm font-medium text-warning-800 dark:text-warning-200">
										{t("credentials.security_notice")}
									</h3>
									<p className="text-xs md:text-sm text-warning-700 dark:text-warning-300 mt-1">
										{t("credentials.security_notice_desc")}
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

				<div className="flex justify-end pt-4 md:pt-6">
					<button
						type="button"
						onClick={onClose}
						className="btn-primary w-full sm:w-auto"
					>
						{t("credentials.close")}
					</button>
				</div>
			</div>
		</div>
	);

	return <ModalPortal>{modal}</ModalPortal>;
};

export default CredentialsModal;
