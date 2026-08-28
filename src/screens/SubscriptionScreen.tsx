import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (subscriptionPlans?.trialEligible) {
      setSelectedPlan('trial');
    }
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
        description: `${planCode === 'TRIAL'
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
        RazorpayCheckout.open(options)
          .then(resolve)
          .catch((err: any) => {
            console.error('Razorpay SDK error:', err);
            reject(err);
          });
      });

      console.log(
        'Razorpay checkout completed. Payload keys:',
        Object.keys(paymentData || {}),
      );

      // Card checkout finishes inside the Razorpay sheet and always hands back
      // the signed triple. A UPI-intent mandate (GPay/PhonePe) is authorised in
      // the external app and signed by Razorpay server-side, so the payload we
      // get back can be partial — commonly payment_id only, sometimes not even
      // that. Recover the subscription id from /create, which we already hold.
      const paymentId = paymentData?.razorpay_payment_id;
      const subscriptionId =
        paymentData?.razorpay_subscription_id || razorpaySubscriptionId;
      const signature = paymentData?.razorpay_signature;

      // /verify is UX confirmation ONLY — it validates the HMAC and echoes the
      // local status back. It grants nothing: activation is webhook-driven
      // (subscription.authenticated / activated / charged). So a payload we
      // cannot sign-check, or a verify call that fails, must NOT abort the
      // flow — the money has already moved. Let the GET /me poll below be the
      // sole judge of whether the plan came up.
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
      } else {
        console.warn(
          'Checkout returned a partial payload; skipping signature verify',
          { paymentId: !!paymentId, subscriptionId: !!subscriptionId, signature: !!signature },
        );
      }

      // Money changed hands. Fire immediately — do NOT wait for the /me poll
      // below, because the user can background the app at any point during it.
      if (planCode === 'TRIAL') {
        // No value. The trial charges ₹1 to authorise the mandate, and reporting
        // ₹1 would make Meta optimise for ₹1 conversions when the real plan is
        // ₹499 — off by about 500x. The real price goes in predicted_ltv, which
        // the backend sends.
        track('StartTrial', undefined, razorpaySubscriptionId);
      } else {
        // Dedup key must never be undefined — that would stop this event
        // merging with the backend's and double-count the conversion. UPI
        // intent can withhold the payment id, so fall back to the
        // subscription id, which we always have.
        track(
          'Subscribe',
          { value: planValue, currency: 'INR' },
          paymentId || razorpaySubscriptionId,
        );
      }

      console.log('Signature verified. Polling GET /me...');
      let isActivated = false;
      let attempts = 0;
      const maxAttempts = 12;
      const intervalMs = 2500;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(
          `Polling subscription status: attempt ${attempts}/${maxAttempts}`,
        );
        const subData = await getMySubscription();
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
          text2: `Welcome to Canvas Premium (${plan === 'trial'
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
