import { useState, useCallback, useEffect } from "react";
import {
  getSubscription,
  startTrial as startTrialService,
  resetToFree as resetToFreeService,
  trialDaysRemaining,
  isPremium as isPremiumService,
  isTrialActive as isTrialActiveService,
} from "../services/subscriptionService";

// Single source of truth for subscription state — must be called once in
// App.jsx and passed down via props (isPremium). Calling it from child
// screens would create out-of-sync localStorage reads (one screen unlocked,
// another not).
export function useSubscription() {
  const [subscription, setSubscription] = useState(getSubscription);

  const reload = useCallback(() => setSubscription(getSubscription()), []);

  // Reavalia ao voltar de background — é assim que um teste expirado (Date.now()
  // ultrapassou trialEndsAt) se reflete sem precisar de reload manual da página.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const startTrial = useCallback(() => { setSubscription(startTrialService()); }, []);
  const resetToFree = useCallback(() => { setSubscription(resetToFreeService()); }, []);

  return {
    plan: subscription.plan,
    status: subscription.status,
    isPremium: isPremiumService(subscription),
    isTrialActive: isTrialActiveService(subscription),
    daysRemaining: trialDaysRemaining(subscription),
    startTrial,
    resetToFree,
    reload,
  };
}
