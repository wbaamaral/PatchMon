import { useTranslation } from "react-i18next";
import { TIERS } from "../constants/tiers";

const TierBadge = ({ tier, className = "" }) => {
	const { t } = useTranslation("billing");
	const tierDef = TIERS[tier];
	if (!tierDef) return null;
	const tierName = t(tierDef.nameKey);

	return (
		<span
			className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold uppercase tracking-wide leading-tight ${tierDef.badgeClass} ${className}`}
			title={`Requires ${tierName} plan`}
		>
			{tierName}
		</span>
	);
};

export default TierBadge;
