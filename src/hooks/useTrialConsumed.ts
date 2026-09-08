import { useMemo } from 'react';
import {
  isSubscriptionActive,
  useMySubscription,
  useSubscriptionPlans,
} from '../api/subscription';
import { useAppleCatalogue } from './useAppleCatalogue';
import { buildPaywallOffers } from '../components/subscription/paywallOffers';

/**
 * True when this account's free trial is spent AND nothing is entitling them
 * today — the state the trial-ended prompt and the no-trial paywall answer.
 *
 * The "spent" half is read off the paywall's own offer builder rather than off
 * `trialEligible` directly, so the prompt can never claim something the paywall
 * it opens does not also say. That keeps this false on the Apple rail, where the
 * backend reports every caller ineligible because the ₹1 plan is not sold there.
 */
export const useTrialConsumed = (): boolean => {
  const { data: subscriptionPlans } = useSubscriptionPlans();
  const { data: appleCatalogue } = useAppleCatalogue();
  const { data: mySubscription } = useMySubscription();

  const trialConsumed = useMemo(
    () =>
      !!buildPaywallOffers({
        plans: subscriptionPlans?.plans,
        appleCatalogue,
        trialEligible: subscriptionPlans?.trialEligible,
        trialConversionAmount: subscriptionPlans?.trialConversionAmount,
      }).trialConsumedNotice,
    [subscriptionPlans, appleCatalogue],
  );

  // A subscriber's trial is spent too, and they must never be told to activate a
  // plan they are already paying for.
  return trialConsumed && !isSubscriptionActive(mySubscription);
};
