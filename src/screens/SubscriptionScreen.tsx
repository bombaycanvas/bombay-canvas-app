import React, { useState, useEffect } from 'react';
import { useVideoStore } from '../store/videoStore';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useUpcomingSeriesData } from '../api/video';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMySubscription,
  useSubscriptionPlans,
  isSubscriptionActive,
  isStaleSubscriptionStateError,
  invalidateEntitlementQueries,
  pickTrialPlan,
  type PlanCode,
} from '../api/subscription';
import { useSubscriptionCheckout } from '../hooks/useSubscriptionCheckout';

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

  const [selectedPlan, setSelectedPlan] = useState<
    'trial' | 'monthly' | 'annual'
  >('annual');
  const [loading, setLoading] = useState(false);

  const { data: subscriptionPlans } = useSubscriptionPlans();

  // Preselect the trial when one is actually on offer. Keyed on the plan being
  // present — the same signal SubscriptionPlans renders the card from — so the
  // preselected option can never be a card that isn't shown.
  useEffect(() => {
    if (pickTrialPlan(subscriptionPlans?.plans)) {
      setSelectedPlan('trial');
    }
  }, [subscriptionPlans]);
  const { data: mySubscription } = useMySubscription();
  const activePlan = isSubscriptionActive(mySubscription)
    ? mySubscription!.planCode
    : null;

  const { startCheckout } = useSubscriptionCheckout();

  const { data: upcomingData } = useUpcomingSeriesData();
  const displayUpcoming = upcomingData?.upcomingSeries || [];

  const fromGeneral = route.params?.fromGeneral ?? false;
  const series = fromGeneral ? null : route.params?.series || purchaseSeries;

  const close = () => {
    resetPurchaseState();
    navigation.goBack();
  };

  const handlePurchase = async (plan: 'trial' | 'monthly' | 'annual') => {
    // For the trial, buy the SAME code the card rendered. There are two trial
    // codes at two prices and the paywall shows whichever pickTrialPlan chose —
    // hardcoding 'TRIAL' here would quote ₹899 on screen and charge ₹499.
    const trialPlan = pickTrialPlan(subscriptionPlans?.plans);
    const planCode: PlanCode | undefined =
      plan === 'trial'
        ? trialPlan?.code
        : plan === 'annual'
          ? 'ANNUAL'
          : 'MONTHLY';

    // Nothing to buy if the plans call hasn't landed — better to no-op than to
    // guess a code and charge an amount the user was never shown.
    if (!planCode) {
      Toast.show({
        type: 'info',
        text1: 'Plans are still loading',
        text2: 'Give it a second and try again.',
      });
      return;
    }

    const planDetails = subscriptionPlans?.plans?.find(p => p.code === planCode);

    setLoading(true);
    try {
      // create → Razorpay → verify → report → poll, all in one place so this
      // screen and the cancel-flow downsell can never drift apart on it.
      const { activated: isActivated } = await startCheckout(
        planCode,
        planDetails,
      );

      setLoading(false);

      if (isActivated) {
        Toast.show({
          type: 'success',
          text1: 'Subscription Active!',
          text2: `Welcome to Canvas Premium (${planDetails?.name ?? 'Premium'} Plan).`,
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
