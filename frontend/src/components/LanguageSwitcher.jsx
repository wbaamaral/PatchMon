import { Globe } from "lucide-react";
import { useState } from "react";
import { useLocale } from "../contexts/LocaleContext";
import { LANGUAGE_OPTIONS } from "../i18n/locales";

export default function LanguageSwitcher({ className = "" }) {
	const { locale, setLocale } = useLocale();
	const [open, setOpen] = useState(false);

	return (
		<div className={`relative ${className}`}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
				title="Language"
				aria-label="Language"
			>
				<Globe className="h-4 w-4" />
				<span className="hidden sm:inline">
					{LANGUAGE_OPTIONS.find((o) => o.value === locale)?.label ?? locale}
				</span>
			</button>
			{open && (
				<>
					<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
					<div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
						{LANGUAGE_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => {
									setLocale(opt.value);
									setOpen(false);
								}}
								className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
									locale === opt.value
										? "font-medium text-blue-600 dark:text-blue-400"
										: "text-gray-700 dark:text-gray-200"
								}`}
							>
								{opt.label}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}
