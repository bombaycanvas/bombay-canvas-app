import React, { useState } from 'react';
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
} from '../api/subscription';

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

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);

  const { data: subscriptionPlans } = useSubscriptionPlans();
  const { data: mySubscription } = useMySubscription();
  const activePlan =
    mySubscription && mySubscription.status === 'ACTIVE'
      ? mySubscription.planCode
      : null;

  const createSubMutation = useCreateSubscription();
  const verifySubMutation = useVerifySubscription();

  const { data: upcomingData } = useUpcomingSeriesData();
  const displayUpcoming = upcomingData?.upcomingSeries || [];

  const series = route.params?.series || purchaseSeries;

  const close = () => {
    resetPurchaseState();
    navigation.goBack();
  };

  const formatIndianMobile = (mobile?: string) => {
    if (!mobile) return undefined;
    const digitsOnly = mobile.replace(/\D/g, '');
    return digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
  };

  const handlePurchase = async (plan: 'monthly' | 'annual') => {
    const planCode = plan === 'annual' ? 'ANNUAL' : 'MONTHLY';
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
        description: `${planCode === 'ANNUAL' ? 'Annual' : 'Monthly'} Premium Subscription`,
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

      console.log('Razorpay checkout completed successfully, verifying signature...');

      await verifySubMutation.mutateAsync({
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_subscription_id: paymentData.razorpay_subscription_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      console.log('Signature verified. Polling GET /me...');
      let isActivated = false;
      let attempts = 0;
      const maxAttempts = 12;
      const intervalMs = 2500;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`Polling subscription status: attempt ${attempts}/${maxAttempts}`);
        const subData = await getMySubscription();
        if (subData && subData.status === 'ACTIVE') {
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
          text2: `Welcome to Canvas Premium (${plan === 'annual' ? 'Annual' : 'Monthly'} Plan).`,
        });

        if (series) {
          series.userPurchased = true;
        }
        if (purchaseSeries) {
          purchaseSeries.userPurchased = true;
        }
        queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
        queryClient.invalidateQueries({ queryKey: ['userData'] });
        queryClient.invalidateQueries({ queryKey: ['moviesData'] });
        queryClient.invalidateQueries({ queryKey: ['listRecommendedSeries'] });
        queryClient.invalidateQueries({ queryKey: ['moviesDataById'] });
        queryClient.invalidateQueries({ queryKey: ['playEpisode'] });

        setTimeout(() => {
          resetPurchaseState();
          setPaused(false);
          close();
        }, 1500);
      } else {
        Toast.show({
          type: 'info',
          text1: 'Activation Pending',
          text2: 'Your payment was successful. We are activating your subscription. Please refresh shortly.',
          visibilityTime: 6000,
        });

        queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
        queryClient.invalidateQueries({ queryKey: ['userData'] });
        queryClient.invalidateQueries({ queryKey: ['moviesData'] });
        queryClient.invalidateQueries({ queryKey: ['listRecommendedSeries'] });
        queryClient.invalidateQueries({ queryKey: ['moviesDataById'] });
        queryClient.invalidateQueries({ queryKey: ['playEpisode'] });

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
      Toast.show({
        type: 'error',
        text1: 'Subscription Failed',
        text2: typeof msg === 'object' ? msg.message || JSON.stringify(msg) : msg,
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
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
          plans={subscriptionPlans}
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
