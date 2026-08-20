const KEY = "sv_subscription";
export const TRIAL_DAYS = 7;

const DEFAULT_SUBSCRIPTION = { status: "free", trialStartedAt: null };

export function getSubscription() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!stored || (stored.status !== "free" && stored.status !== "plus")) return DEFAULT_SUBSCRIPTION;
    return stored;
  } catch { return DEFAULT_SUBSCRIPTION; }
}

function setSubscription(sub) {
  try { localStorage.setItem(KEY, JSON.stringify(sub)); } catch {}
  return sub;
}

export function startTrial() {
  return setSubscription({ status: "plus", trialStartedAt: new Date().toISOString() });
}

export function resetToFree() {
  return setSubscription({ ...DEFAULT_SUBSCRIPTION });
}

export function trialDaysRemaining(sub) {
  if (!sub?.trialStartedAt) return 0;
  const started = new Date(sub.trialStartedAt).getTime();
  if (Number.isNaN(started)) return 0;
  const elapsedDays = Math.floor((Date.now() - started) / (24 * 60 * 60 * 1000));
  return Math.max(0, Math.min(TRIAL_DAYS, TRIAL_DAYS - elapsedDays));
}
