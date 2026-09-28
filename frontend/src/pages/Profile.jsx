import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	Bell,
	CheckCircle,
	Clock,
	Copy,
	Download,
	Eye,
	EyeOff,
	Key,
	Link2,
	LogOut,
	Mail,
	MapPin,
	Monitor,
	Moon,
	RefreshCw,
	Save,
	Shield,
	ShieldCheck,
	Smartphone,
	Sun,
	Trash2,
	Unlink,
	User,
} from "lucide-react";

import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import DiscordIcon from "../components/DiscordIcon";
import { FORM_INPUT_CLASS } from "../components/FormInput";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "../contexts/AuthContext";
import { THEME_PRESETS, useColorTheme } from "../contexts/ColorThemeContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import {
	authAPI,
	discordAPI,
	formatDate,
	isCorsError,
	tfaAPI,
	trustedDevicesAPI,
} from "../utils/api";
import { isRenderableAvatarSrc } from "../utils/avatar";

const Profile = () => {
	const { t } = useTranslation("profile");
	const usernameId = useId();
	const emailId = useId();
	const firstNameId = useId();
	const lastNameId = useId();
	const currentPasswordId = useId();
	const newPasswordId = useId();
	const confirmPasswordId = useId();
	const { user, updateProfile, changePassword, refetchUser } = useAuth();
	const { toggleTheme, isDark } = useTheme();
	const { colorTheme, setColorTheme } = useColorTheme();
	const { settings: publicSettings } = useSettings();
	const { success: toastSuccess, error: toastError } = useToast();
	const [activeTab, setActiveTab] = useState("profile");
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [newsletterLoading, setNewsletterLoading] = useState(false);

	// Self-hosted only — hidden under SaaS/managed (admin_mode === true)
	const showNewsletterSection = !publicSettings?.admin_mode;
	const isNewsletterSubscribed = !!user?.newsletter_subscribed;
	const newsletterSubscribedAt = user?.newsletter_subscribed_at;

	const handleNewsletterSubscribe = async () => {
		setNewsletterLoading(true);
		try {
			await authAPI.subscribeNewsletter();
			await refetchUser?.();
			toastSuccess(t("newsletter.subscribe_success"));
		} catch (err) {
			const apiMessage = err?.response?.data?.error;
			toastError(apiMessage || t("newsletter.subscribe_failed"));
		} finally {
			setNewsletterLoading(false);
		}
	};

	// Check if user is OIDC user
	const isOIDCUser = user?.oidc_sub || user?.oidc_provider;

	const [profileData, setProfileData] = useState({
		username: user?.username || "",
		email: user?.email || "",
		first_name: user?.first_name || "",
		last_name: user?.last_name || "",
	});

	// Update profileData when user data changes
	useEffect(() => {
		if (user) {
			setProfileData({
				username: user.username || "",
				email: user.email || "",
				first_name: user.first_name || "",
				last_name: user.last_name || "",
			});
		}
	}, [user]);

	// Handle discord_linked query param on mount
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get("discord_linked") === "true") {
			setMessage({
				type: "success",
				text: t("connections.linked"),
			});
			setActiveTab("connections");
			window.history.replaceState({}, document.title, "/settings/profile");
			refetchUser?.();
		}
	}, [refetchUser, t]);

	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const [discordLinking, setDiscordLinking] = useState(false);
	const [discordUnlinking, setDiscordUnlinking] = useState(false);

	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false,
	});

	const handleProfileSubmit = async (e) => {
		e.preventDefault();

		// Prevent submission if user is OIDC user trying to modify OIDC-managed fields
		if (isOIDCUser) {
			setMessage({
				type: "error",
				text: t("oidc.blocked_submit"),
			});
			return;
		}

		setIsLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const result = await updateProfile(profileData);
			if (result.success) {
				setMessage({ type: "success", text: t("form.updated") });
			} else {
				setMessage({
					type: "error",
					text: result.error || t("form.update_failed"),
				});
			}
		} catch (error) {
			if (isCorsError(error)) {
				setMessage({
					type: "error",
					text: t("errors.cors"),
				});
			} else {
				setMessage({ type: "error", text: t("errors.network") });
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handlePasswordSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setMessage({ type: "", text: "" });

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			setMessage({ type: "error", text: t("password.mismatch") });
			setIsLoading(false);
			return;
		}

		if (passwordData.newPassword.length < 6) {
			setMessage({
				type: "error",
				text: t("password.too_short"),
			});
			setIsLoading(false);
			return;
		}

		try {
			const result = await changePassword(
				passwordData.currentPassword,
				passwordData.newPassword,
			);
			if (result.success) {
				setMessage({ type: "success", text: t("password.changed") });
				setPasswordData({
					currentPassword: "",
					newPassword: "",
					confirmPassword: "",
				});
			} else {
				setMessage({
					type: "error",
					text: result.error || t("password.change_failed"),
				});
			}
		} catch (error) {
			if (isCorsError(error)) {
				setMessage({
					type: "error",
					text: t("errors.cors"),
				});
			} else {
				setMessage({ type: "error", text: t("errors.network") });
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		if (activeTab === "profile") {
			setProfileData((prev) => ({ ...prev, [name]: value }));
		} else {
			setPasswordData((prev) => ({ ...prev, [name]: value }));
		}
	};

	const togglePasswordVisibility = (field) => {
		setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
	};

	const tabs = [
		{ id: "profile", name: t("tabs.profile"), icon: User },
		{ id: "password", name: t("tabs.password"), icon: Key },
		...(isOIDCUser
			? []
			: [{ id: "tfa", name: t("tabs.tfa"), icon: Smartphone }]), // Hide TFA tab for OIDC users
		{ id: "sessions", name: t("tabs.sessions"), icon: Monitor },
		...(isOIDCUser
			? []
			: [
					{
						id: "trusted-devices",
						name: t("tabs.trusted_devices"),
						icon: ShieldCheck,
					},
				]),
		{ id: "connections", name: t("tabs.connections"), icon: Link2 },
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<p className="text-sm text-secondary-600 dark:text-white">
					{t("header.subtitle")}
				</p>
			</div>

			{/* User Info Card */}
			<div className="bg-white dark:bg-secondary-800 shadow rounded-lg p-4 md:p-6">
				<div className="flex items-center space-x-3 md:space-x-4">
					<div className="flex-shrink-0">
						{isRenderableAvatarSrc(user?.avatar_url) ? (
							<img
								src={user.avatar_url}
								alt={user.username}
								className="h-12 w-12 md:h-16 md:w-16 rounded-full object-cover"
							/>
						) : (
							<div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
								<User className="h-6 w-6 md:h-8 md:w-8 text-primary-600 dark:text-primary-400" />
							</div>
						)}
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="text-base md:text-lg font-medium text-secondary-900 dark:text-white truncate">
							{user?.first_name && user?.last_name
								? `${user.first_name} ${user.last_name}`
								: user?.first_name || user?.username}
						</h3>
						<p className="text-sm text-secondary-600 dark:text-white truncate">
							{user?.email}
						</p>
						<div className="mt-2">
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
									user?.role === "superadmin"
										? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
										: user?.role === "admin"
											? "bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
											: user?.role === "host_manager"
												? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
												: user?.role === "readonly"
													? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
													: "bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200"
								}`}
							>
								<Shield className="h-3 w-3 mr-1" />
								{user?.role
									? t(`role.${user.role}`, {
											defaultValue:
												user.role.charAt(0).toUpperCase() +
												user.role.slice(1).replace("_", " "),
										})
									: ""}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="bg-white dark:bg-secondary-800 shadow rounded-lg">
				{/* Mobile Button Navigation */}
				<div className="md:hidden p-4 space-y-2 border-b border-secondary-200 dark:border-secondary-600">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						return (
							<button
								type="button"
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`w-full flex items-center justify-between px-4 py-3 rounded-md font-medium text-sm transition-colors ${
									activeTab === tab.id
										? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800"
										: "bg-secondary-50 dark:bg-secondary-700 text-secondary-700 dark:text-white border border-secondary-200 dark:border-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-600"
								}`}
							>
								<div className="flex items-center space-x-3">
									<Icon className="h-5 w-5" />
									<span>{tab.name}</span>
								</div>
								{activeTab === tab.id && (
									<CheckCircle className="h-5 w-5 text-primary-600 dark:text-primary-400" />
								)}
							</button>
						);
					})}
				</div>

				{/* Desktop Tab Navigation */}
				<div className="hidden md:block border-b border-secondary-200 dark:border-secondary-600">
					<nav className="-mb-px flex space-x-8 px-6">
						{tabs.map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									type="button"
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
										activeTab === tab.id
											? "border-primary-500 text-primary-600 dark:text-primary-400"
											: "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-white dark:hover:text-primary-400"
									}`}
								>
									<Icon className="h-4 w-4 mr-2" />
									{tab.name}
								</button>
							);
						})}
					</nav>
				</div>

				<div className="p-4 md:p-6">
					{/* Success/Error Message */}
					{message.text && (
						<div
							className={`mb-6 rounded-md p-4 ${
								message.type === "success"
									? "bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700"
									: "bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700"
							}`}
						>
							<div className="flex">
								{message.type === "success" ? (
									<CheckCircle className="h-5 w-5 text-green-400 dark:text-green-300" />
								) : (
									<AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
								)}
								<div className="ml-3">
									<p
										className={`text-sm font-medium ${
											message.type === "success"
												? "text-green-800 dark:text-green-200"
												: "text-red-800 dark:text-red-200"
										}`}
									>
										{message.text}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Profile Information Tab */}
					{activeTab === "profile" && (
						<div className="space-y-6">
							<form onSubmit={handleProfileSubmit} className="space-y-6">
								<div>
									<h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
										{t("form.title")}
									</h3>
									<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
										<div>
											<label
												htmlFor={usernameId}
												className="block text-sm font-medium text-secondary-700 dark:text-secondary-200"
											>
												{t("form.username")}
												{isOIDCUser && (
													<span className="ml-2 text-xs text-secondary-500 dark:text-white italic">
														{t("oidc.managed_field")}
													</span>
												)}
											</label>
											<div className="mt-1 relative">
												<input
													type="text"
													name="username"
													id={usernameId}
													value={profileData.username}
													onChange={handleInputChange}
													disabled={isOIDCUser}
													className={`${FORM_INPUT_CLASS} pl-10 ${
														isOIDCUser
															? "bg-secondary-100 dark:bg-secondary-800 text-secondary-500 dark:text-white cursor-not-allowed"
															: ""
													}`}
													required
												/>
												<User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400 dark:text-white" />
											</div>
										</div>

										<div>
											<label
												htmlFor={emailId}
												className="block text-sm font-medium text-secondary-700 dark:text-secondary-200"
											>
												{t("form.email")}
												{isOIDCUser && (
													<span className="ml-2 text-xs text-secondary-500 dark:text-white italic">
														{t("oidc.managed_field")}
													</span>
												)}
											</label>
											<div className="mt-1 relative">
												<input
													type="email"
													name="email"
													id={emailId}
													value={profileData.email}
													onChange={handleInputChange}
													disabled={isOIDCUser}
													className={`${FORM_INPUT_CLASS} pl-10 ${
														isOIDCUser
															? "bg-secondary-100 dark:bg-secondary-800 text-secondary-500 dark:text-white cursor-not-allowed"
															: ""
													}`}
													required
												/>
												<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400 dark:text-white" />
											</div>
										</div>

										<div>
											<label
												htmlFor={firstNameId}
												className="block text-sm font-medium text-secondary-700 dark:text-secondary-200"
											>
												{t("form.first_name")}
												{isOIDCUser && (
													<span className="ml-2 text-xs text-secondary-500 dark:text-white italic">
														{t("oidc.managed_field")}
													</span>
												)}
											</label>
											<div className="mt-1">
												<input
													type="text"
													name="first_name"
													id={firstNameId}
													value={profileData.first_name}
													onChange={handleInputChange}
													disabled={isOIDCUser}
													className={`${FORM_INPUT_CLASS} ${
														isOIDCUser
															? "bg-secondary-100 dark:bg-secondary-800 text-secondary-500 dark:text-white cursor-not-allowed"
															: ""
													}`}
												/>
											</div>
										</div>

										<div>
											<label
												htmlFor={lastNameId}
												className="block text-sm font-medium text-secondary-700 dark:text-secondary-200"
											>
												{t("form.last_name")}
												{isOIDCUser && (
													<span className="ml-2 text-xs text-secondary-500 dark:text-white italic">
														{t("oidc.managed_field")}
													</span>
												)}
											</label>
											<div className="mt-1">
												<input
													type="text"
													name="last_name"
													id={lastNameId}
													value={profileData.last_name}
													onChange={handleInputChange}
													disabled={isOIDCUser}
													className={`${FORM_INPUT_CLASS} ${
														isOIDCUser
															? "bg-secondary-100 dark:bg-secondary-800 text-secondary-500 dark:text-white cursor-not-allowed"
															: ""
													}`}
												/>
											</div>
										</div>
									</div>
								</div>

								{/* Theme Settings */}
								<div className="border-t border-secondary-200 dark:border-secondary-600 pt-4 md:pt-6">
									<h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-3">
										{t("appearance.title")}
									</h4>
									<div className="max-w-md">
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
												<div className="flex-shrink-0">
													{isDark ? (
														<Moon className="h-5 w-5 text-secondary-600 dark:text-white" />
													) : (
														<Sun className="h-5 w-5 text-secondary-600 dark:text-white" />
													)}
												</div>
												<div className="min-w-0">
													<p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
														{isDark
															? t("appearance.dark_mode")
															: t("appearance.light_mode")}
													</p>
													<p className="text-xs text-secondary-500 dark:text-white truncate">
														{isDark
															? t("appearance.switch_to_light")
															: t("appearance.switch_to_dark")}
													</p>
												</div>
											</div>
											<button
												type="button"
												onClick={toggleTheme}
												className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-md border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
													isDark ? "bg-primary-600" : "bg-secondary-200"
												}`}
												role="switch"
												aria-checked={isDark}
											>
												<span
													aria-hidden="true"
													className={`pointer-events-none inline-block h-5 w-5 transform rounded-md bg-white shadow ring-0 transition duration-200 ease-in-out ${
														isDark ? "translate-x-5" : "translate-x-0"
													}`}
												/>
											</button>
										</div>
									</div>

									{/* Color Theme Settings */}
									<div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-secondary-200 dark:border-secondary-600">
										<h4 className="text-sm font-medium text-secondary-900 dark:text-white mb-2">
											{t("appearance.color_theme")}
										</h4>
										<p className="text-xs text-secondary-500 dark:text-white mb-4">
											{t("appearance.color_theme_description")}
										</p>

										<div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
											{Object.entries(THEME_PRESETS).map(
												([themeKey, theme]) => {
													const isSelected = colorTheme === themeKey;
													const gradientColors = theme.login.xColors;

													return (
														<button
															key={themeKey}
															type="button"
															onClick={() => setColorTheme(themeKey)}
															className={`relative p-4 rounded-lg border-2 transition-all ${
																isSelected
																	? "border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800"
																	: "border-secondary-200 dark:border-secondary-600 hover:border-primary-300"
															} cursor-pointer`}
														>
															{/* Theme Preview */}
															<div
																className="h-20 rounded-md mb-3 overflow-hidden"
																style={{
																	background: `linear-gradient(135deg, ${gradientColors.join(", ")})`,
																}}
															/>

															{/* Theme Name */}
															<div className="text-sm font-medium text-secondary-900 dark:text-white mb-1">
																{theme.name}
															</div>

															{/* Selected Indicator */}
															{isSelected && (
																<div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full p-1">
																	<svg
																		className="w-4 h-4"
																		fill="currentColor"
																		viewBox="0 0 20 20"
																		aria-label={t("appearance.selected_aria")}
																	>
																		<title>
																			{t("appearance.selected_title")}
																		</title>
																		<path
																			fillRule="evenodd"
																			d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																			clipRule="evenodd"
																		/>
																	</svg>
																</div>
															)}
														</button>
													);
												},
											)}
										</div>
									</div>

									{/* Language Settings */}
									<div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-secondary-200 dark:border-secondary-600">
										<h4 className="text-sm font-medium text-secondary-900 dark:text-white mb-2">
											{t("appearance.language")}
										</h4>
										<p className="text-xs text-secondary-500 dark:text-white mb-4">
											{t("appearance.language_description")}
										</p>
										<LanguageSwitcher className="max-w-xs" />
									</div>
								</div>

								<div className="flex justify-end">
									<button
										type="submit"
										disabled={isLoading || isOIDCUser}
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 w-full sm:w-auto justify-center sm:justify-end"
									>
										<Save className="h-4 w-4 mr-2" />
										{isLoading ? t("form.saving") : t("form.save")}
									</button>
								</div>
								{isOIDCUser && (
									<div className="mt-4 rounded-md p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700">
										<div className="flex">
											<AlertCircle className="h-5 w-5 text-blue-400 dark:text-blue-300" />
											<div className="ml-3">
												<p className="text-sm font-medium text-blue-800 dark:text-blue-200">
													{t("oidc.info_banner")}
												</p>
											</div>
										</div>
									</div>
								)}
							</form>

							{/* Email notifications (self-hosted only) */}
							{showNewsletterSection && (
								<div className="card p-4 sm:p-6">
									<div className="flex items-start gap-3 mb-4">
										<Bell className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
										<div>
											<h3 className="text-lg font-medium text-secondary-900 dark:text-white">
												{t("newsletter.title")}
											</h3>
											<p className="text-sm text-secondary-600 dark:text-white mt-1">
												{t("newsletter.description")}
											</p>
										</div>
									</div>

									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-secondary-200 dark:border-secondary-600">
										<div className="flex items-center gap-3 flex-wrap">
											{isNewsletterSubscribed ? (
												<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
													{t("newsletter.subscribed")}
												</span>
											) : (
												<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200">
													{t("newsletter.not_subscribed")}
												</span>
											)}
											{isNewsletterSubscribed && newsletterSubscribedAt && (
												<span className="text-xs text-secondary-500 dark:text-white">
													{t("newsletter.since", {
														date: formatDate(newsletterSubscribedAt),
													})}
												</span>
											)}
										</div>
										{isNewsletterSubscribed ? (
											<span className="text-xs text-secondary-600 dark:text-secondary-300 sm:text-right">
												{t("newsletter.unsubscribe_hint")}{" "}
												<a
													href="mailto:support@patchmon.net"
													className="text-primary-600 dark:text-primary-400 hover:underline"
												>
													support@patchmon.net
												</a>
											</span>
										) : (
											<button
												type="button"
												onClick={handleNewsletterSubscribe}
												disabled={newsletterLoading}
												className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
											>
												{newsletterLoading ? (
													<>
														<RefreshCw className="h-4 w-4 animate-spin" />
														{t("newsletter.subscribing")}
													</>
												) : (
													t("newsletter.subscribe")
												)}
											</button>
										)}
									</div>
								</div>
							)}
						</div>
					)}

					{/* Change Password Tab */}
					{activeTab === "password" && (
						<form onSubmit={handlePasswordSubmit} className="space-y-6">
							<div>
								<h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
									{t("password.title")}
								</h3>
								<div className="space-y-4">
									<div>
										<label
											htmlFor={currentPasswordId}
											className="block text-sm font-medium text-secondary-700 dark:text-secondary-200"
										>
											{t("password.current")}
										</label>
										<div className="mt-1 relative">
											<input
												type={showPasswords.current ? "text" : "password"}
												name="currentPassword"
												id={currentPasswordId}
												value={passwordData.currentPassword}
												onChange={handleInputChange}
												className="block w-full border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 pl-10 pr-10 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
												required
											/>
											<Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400 dark:text-white" />
											<button
												type="button"
												onClick={() => togglePasswordVisibility("current")}
												className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 dark:text-white hover:text-secondary-600 dark:hover:text-secondary-300"
											>
												{showPasswords.current ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</button>
										</div>
									</div>

									<div>
										<label
											htmlFor={newPasswordId}
											className="block text-sm font-medium text-secondary-700 dark:text-secondary-200"
										>
											{t("password.new")}
										</label>
										<div className="mt-1 relative">
											<input
												type={showPasswords.new ? "text" : "password"}
												name="newPassword"
												id={newPasswordId}
												value={passwordData.newPassword}
												onChange={handleInputChange}
												className="block w-full border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 pl-10 pr-10 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
												required
												minLength="6"
											/>
											<Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400 dark:text-white" />
											<button
												type="button"
												onClick={() => togglePasswordVisibility("new")}
												className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 dark:text-white hover:text-secondary-600 dark:hover:text-secondary-300"
											>
												{showPasswords.new ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</button>
										</div>
										<p className="mt-1 text-xs text-secondary-500 dark:text-white">
											{t("password.hint")}
										</p>
									</div>

									<div>
										<label
											htmlFor={confirmPasswordId}
											className="block text-sm font-medium text-secondary-700 dark:text-secondary-200"
										>
											{t("password.confirm")}
										</label>
										<div className="mt-1 relative">
											<input
												type={showPasswords.confirm ? "text" : "password"}
												name="confirmPassword"
												id={confirmPasswordId}
												value={passwordData.confirmPassword}
												onChange={handleInputChange}
												className="block w-full border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 pl-10 pr-10 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
												required
												minLength="6"
											/>
											<Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400 dark:text-white" />
											<button
												type="button"
												onClick={() => togglePasswordVisibility("confirm")}
												className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 dark:text-white hover:text-secondary-600 dark:hover:text-secondary-300"
											>
												{showPasswords.confirm ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</button>
										</div>
									</div>
								</div>
							</div>

							<div className="flex justify-end">
								<button
									type="submit"
									disabled={isLoading}
									className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 w-full sm:w-auto justify-center sm:justify-end"
								>
									<Key className="h-4 w-4 mr-2" />
									{isLoading ? t("password.changing") : t("password.change")}
								</button>
							</div>
						</form>
					)}

					{/* Multi-Factor Authentication Tab */}
					{activeTab === "tfa" && <TfaTab />}

					{/* Sessions Tab */}
					{activeTab === "sessions" && <SessionsTab />}

					{/* Trusted Devices Tab */}
					{activeTab === "trusted-devices" && <TrustedDevicesTab />}

					{/* Connected Accounts Tab */}
					{activeTab === "connections" && (
						<div className="space-y-6">
							<div>
								<h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-1">
									{t("connections.title")}
								</h3>
								<p className="text-sm text-secondary-500 dark:text-white">
									{t("connections.description")}
								</p>
							</div>

							{/* Discord Connection */}
							<div className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div
											className="p-2 rounded-lg"
											style={{ backgroundColor: "#5865F2" }}
										>
											<DiscordIcon className="h-5 w-5 text-white" />
										</div>
										<div>
											<h4 className="font-medium text-secondary-900 dark:text-white">
												{t("connections.discord")}
											</h4>
											{user?.discord_id ? (
												<p className="text-sm text-secondary-500 dark:text-white">
													{user.discord_username || `ID: ${user.discord_id}`}
												</p>
											) : (
												<p className="text-sm text-secondary-500 dark:text-white">
													{t("connections.not_connected")}
												</p>
											)}
										</div>
									</div>
									<div>
										{user?.discord_id ? (
											<button
												type="button"
												onClick={async () => {
													if (!user?.has_password && !user?.oidc_sub) {
														setMessage({
															type: "error",
															text: t("connections.unlink_blocked"),
														});
														return;
													}
													setDiscordUnlinking(true);
													try {
														await discordAPI.unlink();
														setMessage({
															type: "success",
															text: t("connections.unlinked"),
														});
														window.location.reload();
													} catch (err) {
														setMessage({
															type: "error",
															text:
																err.response?.data?.error ||
																t("connections.unlink_failed"),
														});
													} finally {
														setDiscordUnlinking(false);
													}
												}}
												disabled={
													discordUnlinking ||
													(!user?.has_password && !user?.oidc_sub)
												}
												className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
												title={
													!user?.has_password && !user?.oidc_sub
														? t("connections.unlink_blocked_title")
														: ""
												}
											>
												{discordUnlinking ? (
													<RefreshCw className="h-4 w-4 animate-spin" />
												) : (
													<Unlink className="h-4 w-4" />
												)}
												{t("connections.unlink")}
											</button>
										) : (
											<button
												type="button"
												onClick={async () => {
													setDiscordLinking(true);
													try {
														const res = await discordAPI.link();
														window.location.href = res.data.url;
													} catch (err) {
														setMessage({
															type: "error",
															text:
																err.response?.data?.error ||
																t("connections.link_failed"),
														});
														setDiscordLinking(false);
													}
												}}
												disabled={discordLinking}
												className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-white hover:opacity-90 disabled:opacity-50"
												style={{ backgroundColor: "#5865F2" }}
											>
												{discordLinking ? (
													<RefreshCw className="h-4 w-4 animate-spin" />
												) : (
													<Link2 className="h-4 w-4" />
												)}
												{t("connections.link")}
											</button>
										)}
									</div>
								</div>
							</div>

							{/* OIDC Connection (read-only) */}
							{user?.oidc_sub && (
								<div className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
												<Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
											</div>
											<div>
												<h4 className="font-medium text-secondary-900 dark:text-white">
													{t("connections.oidc_title")}
												</h4>
												<p className="text-sm text-secondary-500 dark:text-white">
													{user.oidc_provider ||
														t("connections.oidc_connected")}
												</p>
											</div>
										</div>
										<span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
											{t("connections.active")}
										</span>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

// TFA Tab Component
const TfaTab = () => {
	const { t } = useTranslation("profile");
	const { user } = useAuth();
	const isOIDCUser = user?.oidc_sub || user?.oidc_provider;
	const verificationTokenId = useId();
	const disablePasswordId = useId();
	const [setupStep, setSetupStep] = useState("status"); // 'status', 'setup', 'verify', 'backup-codes'
	const [verificationToken, setVerificationToken] = useState("");
	const [password, setPassword] = useState("");
	const [backupCodes, setBackupCodes] = useState([]);
	const [message, setMessage] = useState({ type: "", text: "" });
	const queryClient = useQueryClient();

	// Fetch TFA status
	const { data: tfaStatus, isLoading: statusLoading } = useQuery({
		queryKey: ["tfaStatus"],
		queryFn: () => tfaAPI.status().then((res) => res.data),
	});

	// Setup TFA mutation
	const setupMutation = useMutation({
		mutationFn: () => tfaAPI.setup().then((res) => res.data),
		onSuccess: () => {
			setSetupStep("setup");
			setMessage({
				type: "info",
				text: t("tfa.scan_qr_info"),
			});
		},
		onError: (error) => {
			setMessage({
				type: "error",
				text: error.response?.data?.error || t("tfa.setup_failed"),
			});
		},
	});

	// Verify setup mutation
	const verifyMutation = useMutation({
		mutationFn: (data) => tfaAPI.verifySetup(data).then((res) => res.data),
		onSuccess: (data) => {
			setBackupCodes(data.backupCodes);
			setSetupStep("backup-codes");
			setMessage({
				type: "success",
				text: t("tfa.enabled_success"),
			});
		},
		onError: (error) => {
			setMessage({
				type: "error",
				text: error.response?.data?.error || t("tfa.verify_failed"),
			});
		},
	});

	// Disable TFA mutation
	const disableMutation = useMutation({
		mutationFn: (data) => tfaAPI.disable(data).then((res) => res.data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tfaStatus"] });
			setSetupStep("status");
			setMessage({
				type: "success",
				text: t("tfa.disabled_success"),
			});
		},
		onError: (error) => {
			setMessage({
				type: "error",
				text: error.response?.data?.error || t("tfa.disable_failed"),
			});
		},
	});

	// Regenerate backup codes mutation
	const regenerateBackupCodesMutation = useMutation({
		mutationFn: () => tfaAPI.regenerateBackupCodes().then((res) => res.data),
		onSuccess: (data) => {
			setBackupCodes(data.backupCodes);
			setMessage({
				type: "success",
				text: t("tfa.regenerated_success"),
			});
		},
		onError: (error) => {
			setMessage({
				type: "error",
				text: error.response?.data?.error || t("tfa.regenerate_failed"),
			});
		},
	});

	const handleSetup = () => {
		setupMutation.mutate();
	};

	const handleVerify = (e) => {
		e.preventDefault();
		if (verificationToken.length !== 6) {
			setMessage({
				type: "error",
				text: t("tfa.token_required"),
			});
			return;
		}
		verifyMutation.mutate({ token: verificationToken });
	};

	const handleDisable = (e) => {
		e.preventDefault();
		if (!password) {
			setMessage({
				type: "error",
				text: t("tfa.password_required"),
			});
			return;
		}
		disableMutation.mutate({ password });
	};

	const handleRegenerateBackupCodes = () => {
		regenerateBackupCodesMutation.mutate();
	};

	const copyToClipboard = async (text) => {
		try {
			// Try modern clipboard API first
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(text);
				setMessage({ type: "success", text: t("tfa.copied") });
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
				if (successful) {
					setMessage({ type: "success", text: t("tfa.copied") });
				} else {
					throw new Error("Copy command failed");
				}
			} catch {
				// If all else fails, show the text in a prompt
				prompt(t("tfa.copy_prompt"), text);
				setMessage({
					type: "info",
					text: t("tfa.copy_prompt_fallback"),
				});
			} finally {
				document.body.removeChild(textArea);
			}
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
			// Show the text in a prompt as last resort
			prompt(t("tfa.copy_prompt"), text);
			setMessage({
				type: "info",
				text: t("tfa.copy_prompt_fallback"),
			});
		}
	};

	const downloadBackupCodes = () => {
		const content = `${t("tfa.download_title")}\n\n${backupCodes
			.map((code, index) => `${index + 1}. ${code}`)
			.join("\n")}\n\n${t("tfa.download_note")}`;
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "patchmon-backup-codes.txt";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	if (statusLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
			</div>
		);
	}

	// Show message for OIDC users
	if (isOIDCUser) {
		return (
			<div className="space-y-6">
				<div>
					<h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
						{t("tfa.title")}
					</h3>
					<div className="rounded-md p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700">
						<div className="flex">
							<AlertCircle className="h-5 w-5 text-blue-400 dark:text-blue-300" />
							<div className="ml-3">
								<p className="text-sm font-medium text-blue-800 dark:text-blue-200">
									{t("tfa.oidc_managed")}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
					{t("tfa.title")}
				</h3>
				<p className="text-sm text-secondary-600 dark:text-white mb-6">
					{t("tfa.description")}
				</p>
			</div>

			{/* Status Message */}
			{message.text && (
				<div
					className={`rounded-md p-4 ${
						message.type === "success"
							? "bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700"
							: message.type === "error"
								? "bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700"
								: "bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700"
					}`}
				>
					<div className="flex">
						{message.type === "success" ? (
							<CheckCircle className="h-5 w-5 text-green-400 dark:text-green-300" />
						) : message.type === "error" ? (
							<AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
						) : (
							<AlertCircle className="h-5 w-5 text-blue-400 dark:text-blue-300" />
						)}
						<div className="ml-3">
							<p
								className={`text-sm font-medium ${
									message.type === "success"
										? "text-green-800 dark:text-green-200"
										: message.type === "error"
											? "text-red-800 dark:text-red-200"
											: "text-blue-800 dark:text-blue-200"
								}`}
							>
								{message.text}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* TFA Status */}
			{setupStep === "status" && (
				<div className="space-y-4 md:space-y-6">
					<div className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 rounded-lg p-4 md:p-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div className="flex items-center space-x-3 flex-1 min-w-0">
								<div
									className={`p-2 rounded-full flex-shrink-0 ${tfaStatus?.enabled ? "bg-green-100 dark:bg-green-900" : "bg-secondary-100 dark:bg-secondary-700"}`}
								>
									<Smartphone
										className={`h-5 w-5 md:h-6 md:w-6 ${tfaStatus?.enabled ? "text-green-600 dark:text-green-400" : "text-secondary-600 dark:text-white"}`}
									/>
								</div>
								<div className="min-w-0">
									<h4 className="text-base md:text-lg font-medium text-secondary-900 dark:text-white">
										{tfaStatus?.enabled
											? t("tfa.enabled_title")
											: t("tfa.disabled_title")}
									</h4>
									<p className="text-sm text-secondary-600 dark:text-white">
										{tfaStatus?.enabled
											? t("tfa.enabled_description")
											: t("tfa.disabled_description")}
									</p>
								</div>
							</div>
							<div className="flex-shrink-0">
								{tfaStatus?.enabled ? (
									<button
										type="button"
										onClick={() => setSetupStep("disable")}
										className="btn-outline text-danger-600 border-danger-300 hover:bg-danger-50 w-full sm:w-auto"
									>
										<Trash2 className="h-4 w-4 mr-2" />
										{t("tfa.disable")}
									</button>
								) : (
									<button
										type="button"
										onClick={handleSetup}
										disabled={setupMutation.isPending}
										className="btn-primary w-full sm:w-auto"
									>
										<Smartphone className="h-4 w-4 mr-2" />
										{setupMutation.isPending
											? t("tfa.enabling")
											: t("tfa.enable")}
									</button>
								)}
							</div>
						</div>
					</div>

					{tfaStatus?.enabled && (
						<div className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 rounded-lg p-4 md:p-6">
							<h4 className="text-base md:text-lg font-medium text-secondary-900 dark:text-white mb-3 md:mb-4">
								{t("tfa.backup_codes")}
							</h4>
							<p className="text-sm text-secondary-600 dark:text-white mb-4">
								{t("tfa.backup_codes_description")}
							</p>
							<button
								type="button"
								onClick={handleRegenerateBackupCodes}
								disabled={regenerateBackupCodesMutation.isPending}
								className="btn-outline w-full sm:w-auto"
							>
								<RefreshCw
									className={`h-4 w-4 mr-2 ${regenerateBackupCodesMutation.isPending ? "animate-spin" : ""}`}
								/>
								{regenerateBackupCodesMutation.isPending
									? t("tfa.regenerating")
									: t("tfa.regenerate")}
							</button>
						</div>
					)}
				</div>
			)}

			{/* TFA Setup */}
			{setupStep === "setup" && setupMutation.data && (
				<div className="space-y-4 md:space-y-6">
					<div className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 rounded-lg p-4 md:p-6">
						<h4 className="text-base md:text-lg font-medium text-secondary-900 dark:text-white mb-4">
							{t("tfa.setup_title")}
						</h4>
						<div className="space-y-4">
							<div className="text-center">
								<img
									src={setupMutation.data.qrCode}
									alt={t("tfa.qr_alt")}
									className="mx-auto h-40 w-40 md:h-48 md:w-48 border border-secondary-200 dark:border-secondary-600 rounded-lg"
								/>
								<p className="text-sm text-secondary-600 dark:text-white mt-2">
									{t("tfa.scan_qr")}
								</p>
							</div>

							<div className="bg-secondary-50 dark:bg-secondary-700 p-3 md:p-4 rounded-lg">
								<p className="text-sm font-medium text-secondary-900 dark:text-white mb-2">
									{t("tfa.manual_key")}
								</p>
								<div className="flex items-center gap-2">
									<code className="flex-1 bg-white dark:bg-secondary-800 px-2 md:px-3 py-2 rounded border text-xs md:text-sm font-mono break-all">
										{setupMutation.data.manualEntryKey}
									</code>
									<button
										type="button"
										onClick={() =>
											copyToClipboard(setupMutation.data.manualEntryKey)
										}
										className="p-2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 flex-shrink-0"
										title={t("tfa.copy_clipboard")}
									>
										<Copy className="h-4 w-4" />
									</button>
								</div>
							</div>

							<div className="text-center">
								<button
									type="button"
									onClick={() => setSetupStep("verify")}
									className="btn-primary w-full sm:w-auto"
								>
									{t("tfa.continue_verify")}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* TFA Verification */}
			{setupStep === "verify" && (
				<div className="space-y-4 md:space-y-6">
					<div className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 rounded-lg p-4 md:p-6">
						<h4 className="text-base md:text-lg font-medium text-secondary-900 dark:text-white mb-4">
							{t("tfa.verify_title")}
						</h4>
						<p className="text-sm text-secondary-600 dark:text-white mb-4">
							{t("tfa.verify_description")}
						</p>
						<form onSubmit={handleVerify} className="space-y-4">
							<div>
								<label
									htmlFor={verificationTokenId}
									className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1"
								>
									{t("tfa.verification_code")}
								</label>
								<input
									id={verificationTokenId}
									type="text"
									value={verificationToken}
									onChange={(e) =>
										setVerificationToken(
											e.target.value.replace(/\D/g, "").slice(0, 6),
										)
									}
									placeholder="000000"
									className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-center text-base md:text-lg font-mono tracking-widest"
									maxLength="6"
									required
								/>
							</div>
							<div className="flex flex-col sm:flex-row gap-3">
								<button
									type="submit"
									disabled={
										verifyMutation.isPending || verificationToken.length !== 6
									}
									className="btn-primary w-full sm:w-auto"
								>
									{verifyMutation.isPending
										? t("tfa.verifying")
										: t("tfa.verify_enable")}
								</button>
								<button
									type="button"
									onClick={() => setSetupStep("status")}
									className="btn-outline w-full sm:w-auto"
								>
									{t("tfa.cancel")}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Backup Codes */}
			{setupStep === "backup-codes" && backupCodes.length > 0 && (
				<div className="space-y-4 md:space-y-6">
					<div className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 rounded-lg p-4 md:p-6">
						<h4 className="text-base md:text-lg font-medium text-secondary-900 dark:text-white mb-4">
							{t("tfa.backup_codes")}
						</h4>
						<p className="text-sm text-secondary-600 dark:text-white mb-4">
							{t("tfa.backup_codes_save")}
						</p>
						<div className="bg-secondary-50 dark:bg-secondary-700 p-3 md:p-4 rounded-lg mb-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs md:text-sm">
								{backupCodes.map((code, index) => (
									<div
										key={code}
										className="flex items-center justify-between py-1"
									>
										<span className="text-secondary-600 dark:text-white">
											{index + 1}.
										</span>
										<span className="text-secondary-900 dark:text-white break-all ml-2">
											{code}
										</span>
									</div>
								))}
							</div>
						</div>
						<div className="flex flex-col sm:flex-row gap-3">
							<button
								type="button"
								onClick={downloadBackupCodes}
								className="btn-outline w-full sm:w-auto"
							>
								<Download className="h-4 w-4 mr-2" />
								{t("tfa.download_codes")}
							</button>
							<button
								type="button"
								onClick={() => {
									setSetupStep("status");
									queryClient.invalidateQueries({ queryKey: ["tfaStatus"] });
								}}
								className="btn-primary w-full sm:w-auto"
							>
								{t("tfa.done")}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Disable TFA */}
			{setupStep === "disable" && (
				<div className="space-y-4 md:space-y-6">
					<div className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 rounded-lg p-4 md:p-6">
						<h4 className="text-base md:text-lg font-medium text-secondary-900 dark:text-white mb-4">
							{t("tfa.disable_title")}
						</h4>
						<p className="text-sm text-secondary-600 dark:text-white mb-4">
							{t("tfa.disable_description")}
						</p>
						<form onSubmit={handleDisable} className="space-y-4">
							<div>
								<label
									htmlFor={disablePasswordId}
									className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1"
								>
									{t("tfa.password_label")}
								</label>
								<input
									id={disablePasswordId}
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
									required
								/>
							</div>
							<div className="flex flex-col sm:flex-row gap-3">
								<button
									type="submit"
									disabled={disableMutation.isPending || !password}
									className="btn-danger w-full sm:w-auto"
								>
									{disableMutation.isPending
										? t("tfa.disabling")
										: t("tfa.disable")}
								</button>
								<button
									type="button"
									onClick={() => setSetupStep("status")}
									className="btn-outline w-full sm:w-auto"
								>
									{t("tfa.cancel")}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

// Sessions Tab Component
const SessionsTab = () => {
	const { t } = useTranslation("profile");
	const confirm = useConfirm();
	const [message, setMessage] = useState({ type: "", text: "" });

	// Fetch user sessions
	const {
		data: sessionsData,
		isLoading: sessionsLoading,
		refetch,
	} = useQuery({
		queryKey: ["user-sessions"],
		queryFn: async () => {
			const response = await fetch("/api/v1/auth/sessions", {
				credentials: "include",
			});
			if (!response.ok) throw new Error(t("sessions.fetch_failed"));
			return response.json();
		},
	});

	// Revoke individual session mutation
	const revokeSessionMutation = useMutation({
		mutationFn: async (sessionId) => {
			const response = await fetch(`/api/v1/auth/sessions/${sessionId}`, {
				method: "DELETE",
				credentials: "include",
			});
			if (!response.ok) throw new Error(t("sessions.revoke_failed"));
			return response.json();
		},
		onSuccess: () => {
			setMessage({ type: "success", text: t("sessions.revoked_success") });
			refetch();
		},
		onError: (error) => {
			setMessage({ type: "error", text: error.message });
		},
	});

	// Revoke all sessions mutation
	const revokeAllSessionsMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch("/api/v1/auth/sessions", {
				method: "DELETE",
				credentials: "include",
			});
			if (!response.ok) throw new Error(t("sessions.revoke_all_failed"));
			return response.json();
		},
		onSuccess: () => {
			setMessage({
				type: "success",
				text: t("sessions.revoke_all_success"),
			});
			refetch();
		},
		onError: (error) => {
			setMessage({ type: "error", text: error.message });
		},
	});

	const formatRelativeTime = (dateString) => {
		const now = new Date();
		const date = new Date(dateString);
		const diff = now - date;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (days > 0) return t("sessions.time.days", { count: days });
		if (hours > 0) return t("sessions.time.hours", { count: hours });
		if (minutes > 0) return t("sessions.time.minutes", { count: minutes });
		return t("sessions.time.just_now");
	};

	const handleRevokeSession = async (sessionId) => {
		const confirmed = await confirm({
			title: t("sessions.revoke_confirm_title"),
			subtitle: t("sessions.revoke_confirm_subtitle"),
			message: t("sessions.revoke_confirm_message"),
			confirmLabel: t("sessions.revoke_confirm_label"),
		});
		if (confirmed) revokeSessionMutation.mutate(sessionId);
	};

	const handleRevokeAllSessions = async () => {
		const confirmed = await confirm({
			title: t("sessions.revoke_all_confirm_title"),
			subtitle: t("sessions.revoke_all_confirm_subtitle"),
			message: t("sessions.revoke_all_confirm_message"),
			confirmLabel: t("sessions.revoke_all_confirm_label"),
		});
		if (confirmed) revokeAllSessionsMutation.mutate();
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
					{t("sessions.title")}
				</h3>
				<p className="text-sm text-secondary-600 dark:text-white">
					{t("sessions.description")}
				</p>
			</div>

			{/* Message */}
			{message.text && (
				<div
					className={`rounded-md p-4 ${
						message.type === "success"
							? "bg-success-50 border border-success-200 text-success-700"
							: "bg-danger-50 border border-danger-200 text-danger-700"
					}`}
				>
					<div className="flex">
						{message.type === "success" ? (
							<CheckCircle className="h-5 w-5" />
						) : (
							<AlertCircle className="h-5 w-5" />
						)}
						<div className="ml-3">
							<p className="text-sm">{message.text}</p>
						</div>
					</div>
				</div>
			)}

			{/* Sessions List */}
			{sessionsLoading ? (
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
				</div>
			) : sessionsData?.sessions?.length > 0 ? (
				<div className="space-y-4">
					{/* Revoke All Button */}
					{sessionsData.sessions.filter((s) => !s.is_current_session).length >
						0 && (
						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleRevokeAllSessions}
								disabled={revokeAllSessionsMutation.isPending}
								className="inline-flex items-center px-4 py-2 border border-danger-300 text-sm font-medium rounded-md text-danger-700 bg-white hover:bg-danger-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500 disabled:opacity-50 w-full sm:w-auto justify-center sm:justify-end"
							>
								<LogOut className="h-4 w-4 mr-2" />
								{revokeAllSessionsMutation.isPending
									? t("sessions.revoking")
									: t("sessions.revoke_all")}
							</button>
						</div>
					)}

					{/* Sessions */}
					{sessionsData.sessions.map((session) => (
						<div
							key={session.id}
							className={`border rounded-lg p-3 md:p-4 ${
								session.is_current_session
									? "border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20"
									: "border-secondary-200 bg-white dark:border-secondary-700 dark:bg-secondary-800"
							}`}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex-1 min-w-0">
									<div className="flex items-start space-x-2 md:space-x-3">
										<Monitor className="h-4 w-4 md:h-5 md:w-5 text-secondary-500 flex-shrink-0 mt-0.5" />
										<div className="flex-1 min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<h4 className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
													{t("sessions.device_on", {
														browser: session.device_info?.browser,
														os: session.device_info?.os,
													})}
												</h4>
												{session.is_current_session && (
													<span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 flex-shrink-0">
														{t("sessions.current_session")}
													</span>
												)}
												{session.tfa_remember_me && (
													<span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200 flex-shrink-0">
														{t("sessions.remembered")}
													</span>
												)}
											</div>
											<p className="text-sm text-secondary-600 dark:text-white mt-1">
												{session.device_info?.device} • {session.ip_address}
											</p>
										</div>
									</div>

									<div className="mt-3 space-y-2 text-sm text-secondary-600 dark:text-white">
										<div className="flex items-center space-x-2">
											<MapPin className="h-4 w-4 flex-shrink-0" />
											<span className="truncate">
												{session.location_info?.city},{" "}
												{session.location_info?.country}
											</span>
										</div>
										<div className="flex items-center space-x-2">
											<Clock className="h-4 w-4 flex-shrink-0" />
											<span>
												{t("sessions.last_active", {
													time: formatRelativeTime(session.last_activity),
												})}
											</span>
										</div>
										<div className="text-xs md:text-sm">
											<span>
												{t("sessions.created", {
													date: formatDate(session.created_at),
												})}
											</span>
										</div>
										<div className="text-xs md:text-sm">
											<span>
												{t("sessions.login_count", {
													total: session.login_count,
												})}
											</span>
										</div>
									</div>
								</div>

								{!session.is_current_session && (
									<button
										type="button"
										onClick={() => handleRevokeSession(session.id)}
										disabled={revokeSessionMutation.isPending}
										className="inline-flex items-center px-3 py-2 border border-danger-300 text-sm font-medium rounded-md text-danger-700 bg-white hover:bg-danger-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500 disabled:opacity-50 flex-shrink-0"
									>
										<LogOut className="h-4 w-4" />
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="text-center py-8">
					<Monitor className="mx-auto h-12 w-12 text-secondary-400" />
					<h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
						{t("sessions.empty_title")}
					</h3>
					<p className="mt-1 text-sm text-secondary-600 dark:text-white">
						{t("sessions.empty_description")}
					</p>
				</div>
			)}
		</div>
	);
};

// Trusted Devices Tab Component
// Lists the user's "remember this device" records. These are separate from
// active sessions — they persist across logouts and exist solely to skip MFA
// on this browser until natural expiry or explicit revocation.
const TrustedDevicesTab = () => {
	const { t } = useTranslation("profile");
	const confirm = useConfirm();
	const [message, setMessage] = useState({ type: "", text: "" });

	const {
		data: devicesData,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["trusted-devices"],
		queryFn: async () => {
			const res = await trustedDevicesAPI.list();
			return res.data;
		},
	});

	const revokeMutation = useMutation({
		mutationFn: (id) => trustedDevicesAPI.revoke(id),
		onSuccess: () => {
			setMessage({
				type: "success",
				text: t("trusted_devices.forgotten_success"),
			});
			refetch();
		},
		onError: (error) => {
			setMessage({
				type: "error",
				text: error.response?.data?.error || t("trusted_devices.forget_failed"),
			});
		},
	});

	const revokeAllMutation = useMutation({
		mutationFn: () => trustedDevicesAPI.revokeAll(),
		onSuccess: () => {
			setMessage({
				type: "success",
				text: t("trusted_devices.forget_all_success"),
			});
			refetch();
		},
		onError: (error) => {
			setMessage({
				type: "error",
				text:
					error.response?.data?.error || t("trusted_devices.forget_all_failed"),
			});
		},
	});

	const handleRevoke = async (id) => {
		const confirmed = await confirm({
			title: t("trusted_devices.forget_confirm_title"),
			subtitle: t("trusted_devices.forget_confirm_subtitle"),
			message: t("trusted_devices.forget_confirm_message"),
			confirmLabel: t("trusted_devices.forget_confirm_label"),
		});
		if (confirmed) revokeMutation.mutate(id);
	};

	const handleRevokeAll = async () => {
		const confirmed = await confirm({
			title: t("trusted_devices.forget_all_confirm_title"),
			subtitle: t("trusted_devices.forget_all_confirm_subtitle"),
			message: t("trusted_devices.forget_all_confirm_message"),
			confirmLabel: t("trusted_devices.forget_all_confirm_label"),
		});
		if (confirmed) revokeAllMutation.mutate();
	};

	const devices = devicesData?.trusted_devices || [];

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
					{t("trusted_devices.title")}
				</h3>
				<p className="text-sm text-secondary-600 dark:text-white">
					{t("trusted_devices.description")}
				</p>
			</div>

			{message.text && (
				<div
					className={`rounded-md p-4 ${
						message.type === "success"
							? "bg-success-50 border border-success-200 text-success-700"
							: "bg-danger-50 border border-danger-200 text-danger-700"
					}`}
				>
					<div className="flex">
						{message.type === "success" ? (
							<CheckCircle className="h-5 w-5" />
						) : (
							<AlertCircle className="h-5 w-5" />
						)}
						<div className="ml-3">
							<p className="text-sm">{message.text}</p>
						</div>
					</div>
				</div>
			)}

			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
				</div>
			) : devices.length > 0 ? (
				<div className="space-y-4">
					{devices.length > 1 && (
						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleRevokeAll}
								disabled={revokeAllMutation.isPending}
								className="inline-flex items-center px-4 py-2 border border-danger-300 text-sm font-medium rounded-md text-danger-700 bg-white hover:bg-danger-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500 disabled:opacity-50 w-full sm:w-auto justify-center sm:justify-end"
							>
								<LogOut className="h-4 w-4 mr-2" />
								{revokeAllMutation.isPending
									? t("trusted_devices.forgetting")
									: t("trusted_devices.forget_all")}
							</button>
						</div>
					)}

					{devices.map((device) => (
						<div
							key={device.id}
							className={`border rounded-lg p-3 md:p-4 ${
								device.is_current
									? "border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20"
									: "border-secondary-200 bg-white dark:border-secondary-700 dark:bg-secondary-800"
							}`}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex-1 min-w-0">
									<div className="flex items-start space-x-2 md:space-x-3">
										<ShieldCheck className="h-4 w-4 md:h-5 md:w-5 text-secondary-500 flex-shrink-0 mt-0.5" />
										<div className="flex-1 min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<h4 className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
													{device.label || t("trusted_devices.unknown_device")}
												</h4>
												{device.is_current && (
													<span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 flex-shrink-0">
														{t("trusted_devices.this_device")}
													</span>
												)}
											</div>
											{device.ip_address && (
												<p className="text-sm text-secondary-600 dark:text-white mt-1">
													{t("trusted_devices.ip_at_trust", {
														ip: device.ip_address,
													})}
												</p>
											)}
										</div>
									</div>

									<div className="mt-3 space-y-2 text-sm text-secondary-600 dark:text-white">
										<div className="flex items-center space-x-2">
											<Clock className="h-4 w-4 flex-shrink-0" />
											<span>
												{t("trusted_devices.last_used", {
													date: formatDate(device.last_used_at),
												})}
											</span>
										</div>
										<div className="text-xs md:text-sm">
											<span>
												{t("trusted_devices.trusted_since", {
													date: formatDate(device.created_at),
												})}
											</span>
										</div>
										<div className="text-xs md:text-sm">
											<span>
												{t("trusted_devices.expires", {
													date: formatDate(device.expires_at),
												})}
											</span>
										</div>
									</div>
								</div>

								<button
									type="button"
									onClick={() => handleRevoke(device.id)}
									disabled={revokeMutation.isPending}
									title={t("trusted_devices.forget")}
									className="inline-flex items-center px-3 py-2 border border-danger-300 text-sm font-medium rounded-md text-danger-700 bg-white hover:bg-danger-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500 disabled:opacity-50 flex-shrink-0"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="text-center py-8">
					<ShieldCheck className="mx-auto h-12 w-12 text-secondary-400" />
					<h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
						{t("trusted_devices.empty_title")}
					</h3>
					<p className="mt-1 text-sm text-secondary-600 dark:text-white">
						{t("trusted_devices.empty_description")}
					</p>
				</div>
			)}
		</div>
	);
};

export default Profile;
