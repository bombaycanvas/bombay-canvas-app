import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getMySubscription,
  invalidateEntitlementQueries,
  isTrialCode,
  type Plan,
  type PlanCode,
} from '../api/subscription';
import { getPaymentRail } from '../services/paymentRail';
import type { PurchaseOutcome } from '../services/paymentRail';
import type { PurchasePhase } from '../components/subscription/SubscriptionActivatingOverlay';
import { useAuthStore } from '../store/authStore';
import { track } from '../utils/analytics';

/**
 * "Buy a plan, then wait until it is really active."
 *
 * The purchase itself belongs to the rail adapter — this deliberately does NOT
 * open a checkout of its own. It used to call RazorpayCheckout.open directly,
 * which on iOS is an App Store guideline 3.1.1 rejection; routing through
 * getPaymentRail() means there is no reachable Razorpay call site on that
 * platform rather than merely a hidden button.
 *
 * What it adds on top of the adapter is the part every caller needs and none
 * should re-implement: report the conversion once, poll until the webhook has
 * actually granted entitlement, and invalidate the caches that depend on it.
 */

/** How long to wait for the webhook to land before giving up and telling the user. */
const POLL_MAX_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 2500;

export interface CheckoutResult {
  /** True once GET /me reports ACTIVE or TRIAL within the poll window. */
  activated: boolean;
  /**
   * How the store said the attempt ended. `cancelled` means the user backed out
   * and nothing was charged — callers must not report that as a purchase.
   */
  outcome: PurchaseOutcome;
}

export const useSubscriptionCheckout = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  /**
   * Runs the whole purchase. Throws only when the rail itself failed; a user
   * dismissing the sheet comes back as `outcome.status === 'cancelled'`.
   * Resolves with `activated: false` when the money moved but the webhook has
   * not landed yet — a pending state, not a failure.
   */
  const startCheckout = useCallback(
    async (
      planCode: PlanCode,
      plan?: Plan,
      // Lets a caller show the right copy for each half of the wait: the store
      // sheet is the user's to act on, the poll afterwards is not. Optional,
      // because a caller that renders no progress of its own needs neither.
      onPhase?: (phase: PurchasePhase) => void,
    ): Promise<CheckoutResult> => {
      // Meta wants the major currency unit. Read it from the plan the caller
      // rendered — never a hardcoded fallback, which is how a reported value
      // ends up disagreeing with what Razorpay actually charged. A trial reports
      // no value at all: the ₹1 mandate authorisation is not what it is worth,
      // and the real price rides along as predicted_ltv from the backend.
      const planValue = isTrialCode(planCode)
        ? undefined
        : plan
        ? plan.price / 100
        : undefined;

      track('InitiateCheckout', { value: planValue, currency: 'INR' });

      onPhase?.('checkout');
      const outcome = await getPaymentRail().startPurchase({
        planCode,
        profile: {
          name: user?.name,
          email: user?.email,
          mobile: user?.mobile || user?.phone || user?.contact,
        },
      });

      // Nothing was charged and nothing is coming: don't report a conversion and
      // don't spend 30 seconds polling for an entitlement that cannot arrive.
      if (outcome.status === 'cancelled') {
        onPhase?.('idle');
        return { activated: false, outcome };
      }

      // Money changed hands. Fire immediately — do NOT wait for the poll, the
      // user can background the app at any point during it. An `unresolved`
      // outcome reports nothing: the store never confirmed the sale, and a
      // conversion we cannot stand behind is worse than a missing one.
      if (outcome.status === 'paid') {
        if (isTrialCode(planCode)) {
          track('StartTrial', undefined, outcome.dedupKey);
        } else {
          // The dedup key must never be undefined or this double-counts against
          // the backend's own event; the rail picks the id the backend reports
          // the same conversion under.
          track(
            'Subscribe',
            { value: planValue, currency: 'INR' },
            outcome.dedupKey,
          );
        }
      }

      // The store is done with the user either way; everything past here is us
      // catching up with it.
      onPhase?.('activating');

      let activated = false;
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        const subData = await getMySubscription();
        if (subData?.status === 'ACTIVE' || subData?.status === 'TRIAL') {
          activated = true;
          break;
        }
        await new Promise<void>(resolve =>
          setTimeout(resolve, POLL_INTERVAL_MS),
        );
      }

      invalidateEntitlementQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['subscriptionHistory'] });

      return { activated, outcome };
    },
    [queryClient, user],
  );

  return { startCheckout };
};
