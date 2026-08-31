import React, { useState, useEffect, useMemo } from 'react';
import { useVideoStore } from '../store/videoStore';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useUpcomingSeriesData } from '../api/video';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  getMySubscription,
  useMySubscription,
  useSubscriptionPlans,
  isSubscriptionActive,
  isStaleSubscriptionStateError,
  invalidateEntitlementQueries,
} from '../api/subscription';
import { getPaymentRail } from '../services/paymentRail';
import { classifyVerifyFailure } from '../services/iap/verifyFailure';
import { useAppleCatalogue } from '../hooks/useAppleCatalogue';
import { useAppleOwnershipConflict } from '../hooks/useAppleIapSync';
import { IS_RAZORPAY_RAIL } from '../utils/paymentRail';
import { track } from '../utils/analytics';

import SubscriptionHero from '../components/subscription/SubscriptionHero';
import SubscriptionPlans from '../components/subscription/SubscriptionPlans';
import RestorePurchasesButton from '../components/subscription/RestorePurchasesButton';
import AppleOwnershipConflictNotice from '../components/subscription/AppleOwnershipConflictNotice';
import { buildPaywallOffers } from '../components/subscription/paywallOffers';
import SubscriptionComingSoon from '../components/subscription/SubscriptionComingSoon';
import SubscriptionTrustBadges from '../components/subscription/SubscriptionTrustBadges';
import SubscriptionPaymentFooter from '../components/subscription/SubscriptionPaymentFooter';

// The window between the store taking the money and the server granting the
// entitlement is the one moment the user has paid and has nothing to show for
// it, so it gets its own state and its own copy rather than an anonymous
// spinner. `checkout` covers the payment sheet; `activating` covers the server
// verify and the entitlement poll behind it.
type PurchasePhase = 'idle' | 'checkout' | 'activating';

const ACTIVATING_MESSAGE =
  'Payment received. Activating your subscription — please keep the app open.';

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
  const [phase, setPhase] = useState<PurchasePhase>('idle');
  const loading = phase !== 'idle';

  const { data: subscriptionPlans } = useSubscriptionPlans();
  const { data: appleCatalogue } = useAppleCatalogue();

  // Written by the silent restore on launch and on every login, so the paywall
  // knows before the user taps anything that the App Store would charge for a
  // subscription this account cannot be granted. Always null off the Apple rail.
  const ownershipConflict = useAppleOwnershipConflict();

  // What the active rail can actually honour. On Apple that means the App
  // Store's own prices and its own answer on trial eligibility — the backend's
  // trialEligible flag cannot see an Apple ID's offer history, so it is only
  // ever the Razorpay input here.
  const offers = useMemo(
    () =>
      buildPaywallOffers({
        plans: subscriptionPlans?.plans,
        trialEligible: subscriptionPlans?.trialEligible,
        appleCatalogue,
      }),
    [subscriptionPlans, appleCatalogue],
  );

  // Preselect the trial only when there is a trial card to select; on Apple that
  // arrives with the store catalogue, not with the plans call.
  useEffect(() => {
    if (offers.trial) {
      setSelectedPlan('trial');
    }
  }, [offers.trial]);
  const { data: mySubscription } = useMySubscription();
  const activePlan = isSubscriptionActive(mySubscription)
    ? mySubscription!.planCode
    : null;

  const { data: upcomingData } = useUpcomingSeriesData();
  const displayUpcoming = upcomingData?.upcomingSeries || [];

  const fromGeneral = route.params?.fromGeneral ?? false;
  const series = fromGeneral ? null : route.params?.series || purchaseSeries;

  const close = () => {
    resetPurchaseState();
    navigation.goBack();
  };

  const handlePurchase = async (plan: 'trial' | 'monthly' | 'annual') => {
    // The buy actions are already inert while a conflict stands, so reaching
    // here means the verdict landed between render and tap. Refusing costs a
    // user nothing; letting it through costs them the price of a subscription
    // the server will decline to grant.
    if (ownershipConflict) {
      Toast.show({
        type: 'info',
        text1: 'Already Linked Elsewhere',
        text2:
          "This Apple ID's subscription belongs to another Canvas account.",
        visibilityTime: 6000,
      });
      return;
    }

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

    // The trial card is the trial on both rails now: Razorpay sells it as the ₹1
    // TRIAL plan, and on Apple it is the annual product wearing its free-days
    // offer, which appleRail maps back to ANNUAL. Either way nothing is charged,
    // so the conversion carries no value.
    const isTrialStart = plan === 'trial';
    const conversionValue = isTrialStart ? undefined : planValue;

    // They opened checkout. No dedup key — the backend never reports this one,
    // so there's nothing to merge with.
    track('InitiateCheckout', { value: conversionValue, currency: 'INR' });

    setPhase('checkout');
    try {
      // One call, whichever rail this build sells through. On iOS that is the
      // App Store: there is no branch below this line that can reach Razorpay.
      const outcome = await getPaymentRail().startPurchase({
        planCode,
        profile: {
          name: user?.name,
          email: user?.email,
          mobile: user?.mobile || user?.phone || user?.contact,
        },
        appleAppAccountToken: subscriptionPlans?.appleAppAccountToken,
      });

      // Backing out of the App Store sheet is a normal outcome, not a failure —
      // say nothing and leave the paywall exactly as it was.
      if (outcome.status === 'cancelled') {
        setPhase('idle');
        return;
      }

      // Money changed hands. Fire immediately — do NOT wait for the /me poll
      // below, because the user can background the app at any point during it.
      // An `unresolved` outcome deliberately reports nothing: the store never
      // confirmed the sale, and a conversion we cannot stand behind is worse
      // than a missing one. The poll below still runs, because the charge may
      // have gone through regardless.
      if (outcome.status === 'paid') {
        if (isTrialStart) {
          // No value. The Razorpay trial charges ₹1 to authorise the mandate and
          // Apple's charges nothing at all; reporting either would make Meta
          // optimise for a conversion worth about 500x less than the plan. The
          // real price goes in predicted_ltv, which the backend sends.
          track('StartTrial', undefined, outcome.dedupKey);
        } else {
          // Dedup key must never be undefined — that would stop this event
          // merging with the backend's and double-count the conversion. The rail
          // picks the id the backend will report the same conversion under.
          track(
            'Subscribe',
            { value: conversionValue, currency: 'INR' },
            outcome.dedupKey,
          );
        }
      }

      // The store is done with the user either way; everything past this point
      // is us catching up with it.
      setPhase('activating');

      console.log('Purchase settled. Polling GET /me...');
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

      setPhase('idle');

      if (isActivated) {
        // The trial's name comes from the rail that sold it: Apple's free days
        // are not the Razorpay "3-Day Trial" and must not be announced as it.
        const planLabel =
          plan === 'trial'
            ? offers.trial?.title || '3-Day Trial'
            : plan === 'annual'
            ? 'Annual'
            : 'Monthly';

        Toast.show({
          type: 'success',
          text1: 'Subscription Active!',
          text2: `Welcome to Canvas Premium (${planLabel} Plan).`,
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
      setPhase('idle');

      const msg = error?.message || 'Please try again.';
      const text2 =
        typeof msg === 'object' ? msg.message || JSON.stringify(msg) : msg;

      // The server refused because our view of the account is stale — the
      // subscription already exists, or the trial was already activated by a
      // checkout whose webhook never landed. Retrying can only fail the same
      // way, so pull the real state and let the screen re-render rather than
      // leaving the paywall selling a plan the user already owns.
      // The Apple rail already told the user why, and showed copy that names
      // what to do about it. A second, vaguer "Subscription Failed" on top of
      // it would only bury the actionable one.
      if (classifyVerifyFailure(error).kind === 'terminal') {
        invalidateEntitlementQueries(queryClient);
        return;
      }

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
          offers={offers}
          purchaseBlockedLabel={ownershipConflict ? 'Unavailable' : null}
        />

        {/* Above the restore button, because restoring is one of the two ways
            out the notice names and the user should not have to hunt for it. */}
        {ownershipConflict && <AppleOwnershipConflictNotice />}

        <RestorePurchasesButton />

        <SubscriptionComingSoon displayUpcoming={displayUpcoming} />

        <SubscriptionTrustBadges />

        {/* Card and UPI marks. They describe the Razorpay checkout and nothing
            about an App Store purchase, so they must not appear on iOS. */}
        {IS_RAZORPAY_RAIL && <SubscriptionPaymentFooter />}
      </ScrollView>

      <Toast topOffset={insets.top + 10} position="top" />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff6600" />
          {phase === 'activating' && (
            <Text style={styles.loadingText}>{ACTIVATING_MESSAGE}</Text>
          )}
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
  loadingText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 40,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
});
