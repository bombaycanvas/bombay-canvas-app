import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import RazorpayCheckout from 'react-native-razorpay';
import {
  getMySubscription,
  invalidateEntitlementQueries,
  isTrialCode,
  useCreateSubscription,
  useVerifySubscription,
  type Plan,
  type PlanCode,
} from '../api/subscription';
import { useAuthStore } from '../store/authStore';
import { track } from '../utils/analytics';

/**
 * The ONE implementation of "buy a plan": create the subscription server-side,
 * open Razorpay, confirm the signature, report the conversion, then poll until
 * the webhook has actually activated it.
 *
 * Shared because there are two entry points into it — the paywall and the
 * cancel-flow downsell — and every duplicated copy of a payment flow eventually
 * drifts on the details that matter (which plan code is sent, what value is
 * reported to Meta, whether the sheet's copy matches the mandate). Surfaces
 * differ only in what they render around it, which is what the callbacks are for.
 */

/** How long to wait for the webhook to land before giving up and telling the user. */
const POLL_MAX_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 2500;

export interface CheckoutResult {
  /** True once GET /me reports ACTIVE or TRIAL within the poll window. */
  activated: boolean;
  /** The Razorpay subscription the mandate was authorised against. */
  razorpaySubscriptionId: string;
}

const formatIndianMobile = (mobile?: string): string | undefined => {
  if (!mobile) return undefined;
  const digitsOnly = mobile.replace(/\D/g, '');
  return digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
};

export const useSubscriptionCheckout = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const createSubMutation = useCreateSubscription();
  const verifySubMutation = useVerifySubscription();

  /**
   * Runs the whole purchase. Throws if the subscription cannot be created or the
   * user dismisses the Razorpay sheet — callers surface that as they see fit.
   * Resolves with `activated: false` when the money moved but the webhook has
   * not landed yet; that is a pending state, not a failure.
   */
  const startCheckout = useCallback(
    async (planCode: PlanCode, plan?: Plan): Promise<CheckoutResult> => {
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

      const createRes = await createSubMutation.mutateAsync(planCode);
      if (!createRes || !createRes.razorpaySubscriptionId) {
        throw new Error('Failed to create subscription on server');
      }

      const { razorpaySubscriptionId, razorpayKeyId, checkoutDescription } =
        createRes;

      const paymentData: any = await RazorpayCheckout.open({
        key: razorpayKeyId || 'rzp_test_123',
        subscription_id: razorpaySubscriptionId,
        name: 'Bombay Canvas',
        // Built server-side from the same plan config it bills against, so the
        // sheet can never quote a price the mandate does not match.
        description: checkoutDescription || `${plan?.name ?? 'Premium'} Subscription`,
        prefill: {
          contact: formatIndianMobile(
            user?.mobile || user?.phone || user?.contact,
          ),
          email: user?.email,
          name: user?.name,
        },
        theme: { color: '#ff6600' },
      });

      // Card checkout always hands back the signed triple. A UPI-intent mandate
      // (GPay/PhonePe) is authorised in the external app and signed by Razorpay
      // server-side, so this payload can be partial — commonly payment_id only,
      // sometimes not even that. Recover the subscription id from /create.
      const paymentId = paymentData?.razorpay_payment_id;
      const subscriptionId =
        paymentData?.razorpay_subscription_id || razorpaySubscriptionId;
      const signature = paymentData?.razorpay_signature;

      // /verify is UX confirmation ONLY — it checks the HMAC and echoes local
      // status. It grants nothing; activation is webhook-driven. So a payload we
      // cannot sign-check, or a verify that fails, must NOT abort the flow — the
      // money has already moved. The poll below is the sole judge.
      if (paymentId && subscriptionId && signature) {
        try {
          await verifySubMutation.mutateAsync({
            razorpay_payment_id: paymentId,
            razorpay_subscription_id: subscriptionId,
            razorpay_signature: signature,
          });
        } catch (verifyError) {
          console.warn(
            'Signature verify failed; falling back to GET /me polling',
            verifyError,
          );
        }
      }

      // Money changed hands. Fire immediately — do NOT wait for the poll, the
      // user can background the app at any point during it.
      if (isTrialCode(planCode)) {
        track('StartTrial', undefined, razorpaySubscriptionId);
      } else {
        // The dedup key must never be undefined or this double-counts against
        // the backend's own event. UPI intent can withhold the payment id, so
        // fall back to the subscription id, which we always have.
        track(
          'Subscribe',
          { value: planValue, currency: 'INR' },
          paymentId || razorpaySubscriptionId,
        );
      }

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

      return { activated, razorpaySubscriptionId };
    },
    [createSubMutation, queryClient, user, verifySubMutation],
  );

  return { startCheckout };
};
