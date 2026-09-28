// What each plan includes. There is no billing yet, so every account is on the free plan; when
// payments arrive, planFor() reads the real subscription and nothing else here has to change.
export const PLAN_LIMITS = {
  free: { pulseMonitors: 1 },
  pro: { pulseMonitors: 5 },
  enterprise: { pulseMonitors: Infinity },
};

export function planFor(/* user */) {
  return "free";
}

// null = unlimited (Infinity doesn't survive JSON).
export function pulseLimit(user) {
  const n = PLAN_LIMITS[planFor(user)].pulseMonitors;
  return Number.isFinite(n) ? n : null;
}
