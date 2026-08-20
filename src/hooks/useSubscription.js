import { useState, useCallback } from "react";
import { getSubscription, startTrial as startTrialService, resetToFree as resetToFreeService, trialDaysRemaining } from "../services/subscription";

// Single source of truth for subscription state — must be called once in
// App.jsx and passed down via props (isPlus). Calling it from child screens
// would create out-of-sync localStorage reads (one screen unlocked, another not).
export function useSubscription() {
  const [subscription, setSubscription] = useState(getSubscription);

  const reload = useCallback(() => setSubscription(getSubscription()), []);

  const startTrial = useCallback(() => { setSubscription(startTrialService()); }, []);
  const resetToFree = useCallback(() => { setSubscription(resetToFreeService()); }, []);

  return {
    isPlus: subscription.status === "plus",
    status: subscription.status,
    daysRemaining: trialDaysRemaining(subscription),
    startTrial,
    resetToFree,
    reload,
  };
}
