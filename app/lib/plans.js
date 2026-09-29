// What each plan includes. There is no billing yet, so every account is on the free plan; when
// payments arrive, planFor() reads the real subscription and nothing else here has to change.
// Numbers match the pricing page (PricingSection.jsx) -- keep the two in sync if either changes.
export const PLAN_LIMITS = {
  free: { pulseMonitors: 1, reportsPerMonth: 2, comparisonsPerMonth: 1 },
  pro: { pulseMonitors: 5, reportsPerMonth: 10, comparisonsPerMonth: 3 },
  enterprise: { pulseMonitors: Infinity, reportsPerMonth: Infinity, comparisonsPerMonth: Infinity },
};

export function planFor(/* user */) {
  return "free";
}

// null = unlimited (Infinity doesn't survive JSON). Admins are exempt from every plan limit here --
// they need to freely test the product (including hitting limits deliberately, on a non-admin
// account) without their own usage getting in the way.
function limitFor(user, key) {
  if (user?.isAdmin) return null;
  const n = PLAN_LIMITS[planFor(user)][key];
  return Number.isFinite(n) ? n : null;
}

export const pulseLimit = (user) => limitFor(user, "pulseMonitors");
export const reportsLimit = (user) => limitFor(user, "reportsPerMonth");
export const comparisonsLimit = (user) => limitFor(user, "comparisonsPerMonth");
