import React, { useState, useEffect, useRef } from 'react';
import { useVideoStore } from '../store/videoStore';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useUpcomingSeriesData } from '../api/video';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import RazorpayCheckout from 'react-native-razorpay';
import {
  useCreateSubscription,
  useVerifySubscription,
  getMySubscription,
  reconcileMySubscription,
  useMySubscription,
  useSubscriptionPlans,
  isSubscriptionActive,
  isStaleSubscriptionStateError,
  invalidateEntitlementQueries,
} from '../api/subscription';
import { track } from '../utils/analytics';

import SubscriptionHero from '../components/subscription/SubscriptionHero';
import SubscriptionPlans from '../components/subscription/SubscriptionPlans';
import SubscriptionComingSoon from '../components/subscription/SubscriptionComingSoon';
import SubscriptionTrustBadges from '../components/subscription/SubscriptionTrustBadges';
import SubscriptionPaymentFooter from '../components/subscription/SubscriptionPaymentFooter';

export default function SubscriptionScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { purchaseSeries, resetPurchaseState, setPaused } = useVideoStore();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  const [selectedPlan, setSelectedPlan] = useState<
    'trial' | 'monthly' | 'annual'
  >('annual');
  const [loading, setLoading] = useState(false);

  const { data: subscriptionPlans } = useSubscriptionPlans();

  // Whether the "default to the trial" preference has already been applied.
  // The plans query now refetches on mount and on app focus, so this effect runs
  // against a NEW object on every refresh — without this latch, a refocus would
  // silently drag the user's manual choice back to the trial.
  const appliedTrialDefault = useRef(false);

  // Keep the selection INSIDE the offered set, in both directions.
  //
  // Preferring the trial is a ONE-TIME default; correcting an impossible
  // selection is continuous. Only ever selecting 'trial' left the screen dead
  // once the trial was consumed mid-session: the trial card unmounts, but
  // selectedPlan stays 'trial', and every remaining CTA is disabled by its own
  // `selectedPlan !== <its plan>` guard — a paywall with no working button. The
  // fallback also stops a stale selection from posting planCode=TRIAL for a plan
  // the server no longer offers.
  useEffect(() => {
    if (!subscriptionPlans) return;

    if (subscriptionPlans.trialEligible) {
      if (!appliedTrialDefault.current) {
        appliedTrialDefault.current = true;
        setSelectedPlan('trial');
      }
      return;
    }

    // Trial no longer on offer — re-arm the default in case eligibility returns
    // (a different account signing in), and rescue an orphaned selection.
    appliedTrialDefault.current = false;
    setSelectedPlan(current => (current === 'trial' ? 'annual' : current));
  }, [subscriptionPlans]);
  const { data: mySubscription } = useMySubscription();
  const activePlan = isSubscriptionActive(mySubscription)
    ? mySubscription!.planCode
    : null;

  const createSubMutation = useCreateSubscription();
  const verifySubMutation = useVerifySubscription();

  const { data: upcomingData } = useUpcomingSeriesData();
  const displayUpcoming = upcomingData?.upcomingSeries || [];

  const fromGeneral = route.params?.fromGeneral ?? false;
  const series = fromGeneral ? null : route.params?.series || purchaseSeries;

  const close = () => {
    resetPurchaseState();
    navigation.goBack();
  };

  const formatIndianMobile = (mobile?: string) => {
    if (!mobile) return undefined;
    const digitsOnly = mobile.replace(/\D/g, '');
    return digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
  };

  const handlePurchase = async (plan: 'trial' | 'monthly' | 'annual') => {
    const planCode =
      plan === 'trial' ? 'TRIAL' : plan === 'annual' ? 'ANNUAL' : 'MONTHLY';

    // Plan.price is in paise; Meta expects the major currency unit. Same
    // fallbacks SubscriptionPlans.tsx uses when the plans call hasn't landed.
    const planDetails = subscriptionPlans?.plans?.find(
      p => p.code === planCode,
    );
    const planValue =
      planCode === 'TRIAL'
        ? undefined
        : planDetails
          ? planDetails.price / 100
          : planCode === 'ANNUAL'
            ? 499
            : 99;

    // They opened checkout. No dedup key — the backend never reports this one,
    // so there's nothing to merge with.
    track('InitiateCheckout', { value: planValue, currency: 'INR' });

    setLoading(true);
    try {
      const createRes = await createSubMutation.mutateAsync(planCode);
      if (!createRes || !createRes.razorpaySubscriptionId) {
        throw new Error('Failed to create subscription on server');
      }

      const { razorpaySubscriptionId, razorpayKeyId } = createRes;

      const mobile = formatIndianMobile(
        user?.mobile || user?.phone || user?.contact,
      );

      const options = {
        key: razorpayKeyId || 'rzp_test_123',
        subscription_id: razorpaySubscriptionId,
        name: 'Bombay Canvas',
        description: `${
          planCode === 'TRIAL'
            ? '3-Day Trial'
            : planCode === 'ANNUAL'
              ? 'Annual'
              : 'Monthly'
        } Premium Subscription`,
        prefill: {
          contact: mobile,
          email: user?.email,
          name: user?.name,
        },
        theme: { color: '#ff6600' },
      };

      const paymentData: any = await new Promise((resolve, reject) => {
        RazorpayCheckout.open(options as any)
          .then(resolve)
          .catch((err: any) => {
            console.error('Razorpay SDK error:', err);
            reject(err);
          });
      });

      console.log(
        'Razorpay checkout completed successfully, verifying signature...',
      );

      await verifySubMutation.mutateAsync({
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_subscription_id: paymentData.razorpay_subscription_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      // Money changed hands. Fire immediately — do NOT wait for the /me poll
      // below, because the user can background the app at any point during it.
      if (planCode === 'TRIAL') {
        // No value. The trial charges ₹1 to authorise the mandate, and reporting
        // ₹1 would make Meta optimise for ₹1 conversions when the real plan is
        // ₹499 — off by about 500x. The real price goes in predicted_ltv, which
        // the backend sends.
        track('StartTrial', undefined, razorpaySubscriptionId);
      } else {
        track(
          'Subscribe',
          { value: planValue, currency: 'INR' },
          paymentData.razorpay_payment_id,
        );
      }

      // Wait for activation. GET /me is a LOCAL read — it only changes when the
      // activation webhook lands, so polling it alone cannot make progress while
      // that webhook is late (routine for UPI AutoPay, whose mandate registers
      // asynchronously at NPCI). Every few ticks we therefore ask the server to
      // reconcile against Razorpay instead, which can resolve the wait itself.
      //
      // Reconcile is the SLOW arm on purpose: each call is one live Razorpay
      // fetch and the server rate-limits it (10 / 5 min / user). At every 3rd
      // tick this spends 4 of that budget and leaves headroom for a retry.
      console.log('Signature verified. Waiting for activation...');
      let isActivated = false;
      let attempts = 0;
      const maxAttempts = 12;
      const intervalMs = 2500;
      const reconcileEvery = 3;

      while (attempts < maxAttempts) {
        attempts++;
        const shouldReconcile = attempts % reconcileEvery === 0;
        console.log(
          `Activation check ${attempts}/${maxAttempts}${
            shouldReconcile ? ' (reconcile)' : ''
          }`,
        );

        // Both return the same subscription shape; reconcile just forces the
        // server to re-read Razorpay first, and falls back to null on failure.
        const subData = shouldReconcile
          ? ((await reconcileMySubscription()) ?? (await getMySubscription()))
          : await getMySubscription();

        if (
          subData &&
          (subData.status === 'ACTIVE' || subData.status === 'TRIAL')
        ) {
          isActivated = true;
          break;
        }
        await new Promise<void>(resolve => setTimeout(resolve, intervalMs));
      }

      setLoading(false);

      if (isActivated) {
        Toast.show({
          type: 'success',
          text1: 'Subscription Active!',
          text2: `Welcome to Canvas Premium (${
            plan === 'trial'
              ? '3-Day Trial'
              : plan === 'annual'
                ? 'Annual'
                : 'Monthly'
          } Plan).`,
        });

        if (series) {
          series.userPurchased = true;
        }
        if (purchaseSeries) {
          purchaseSeries.userPurchased = true;
        }
        invalidateEntitlementQueries(queryClient);
        queryClient.invalidateQueries({ queryKey: ['subscriptionHistory'] });

        setTimeout(() => {
          resetPurchaseState();
          setPaused(false);
          close();
        }, 1500);
      } else {
        Toast.show({
          type: 'info',
          text1: 'Activation Pending',
          text2:
            'Your payment was successful. We are activating your subscription. Please refresh shortly.',
          visibilityTime: 6000,
        });

        invalidateEntitlementQueries(queryClient);
        queryClient.invalidateQueries({ queryKey: ['subscriptionHistory'] });

        setTimeout(() => {
          resetPurchaseState();
          setPaused(false);
          close();
        }, 3000);
      }
    } catch (error: any) {
      console.error('Subscription purchase flow error:', error);
      setLoading(false);

      const msg = error?.message || 'Please try again.';
      const text2 =
        typeof msg === 'object' ? msg.message || JSON.stringify(msg) : msg;

      // The server refused because our view of the account is stale — the
      // subscription already exists, or the trial was already activated by a
      // checkout whose webhook never landed. Retrying can only fail the same
      // way, so pull the real state and let the screen re-render rather than
      // leaving the paywall selling a plan the user already owns.
      if (isStaleSubscriptionStateError(error)) {
        invalidateEntitlementQueries(queryClient);
        Toast.show({
          type: 'info',
          text1: 'Check Your Subscription',
          text2,
          visibilityTime: 6000,
        });
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Subscription Failed',
        text2,
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <SubscriptionHero
          series={series}
          onClose={close}
          paddingTop={insets.top}
        />

        <SubscriptionPlans
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          handlePurchase={handlePurchase}
          loading={loading}
          activePlan={activePlan}
          plans={subscriptionPlans?.plans}
          trialEligible={subscriptionPlans?.trialEligible}
        />

        <SubscriptionComingSoon displayUpcoming={displayUpcoming} />

        <SubscriptionTrustBadges />

        <SubscriptionPaymentFooter />
      </ScrollView>

      <Toast topOffset={insets.top + 10} position="top" />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff6600" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
