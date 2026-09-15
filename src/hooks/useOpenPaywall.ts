import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useVideoStore } from '../store/videoStore';
import { useTrialPromptStore } from '../store/trialPromptStore';
import { capture, ProductEvent } from '../utils/analytics';
import { getPaymentRail } from '../services/paymentRail';

/**
 * Open the paywall for a series — the one way locked content asks to be paid for.
 *
 * A returning user whose trial is spent is asked first: the dialog says why the
 * content is locked and leaves them where they are, rather than the app throwing
 * a paywall over the screen the moment they touch something premium. Everyone
 * else goes straight through, exactly as before.
 *
 * Every entry point routes through here — the player, the series screen and the
 * episode list — because three copies of this decision is three ways for the
 * same tap to be answered differently.
 *
 * `trialConsumed` is read from the store rather than from the subscription
 * queries: a feed mounts one VideoPlayer per episode, and each new observer of
 * `subscriptionPlans` would refetch it. TrialEndedPrompt keeps the flag current
 * for the whole app.
 */
export const useOpenPaywall = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const setPurchaseSeries = useVideoStore(state => state.setPurchaseSeries);
  const setPaused = useVideoStore(state => state.setPaused);
  const trialConsumed = useTrialPromptStore(state => state.trialConsumed);
  const showTrialPrompt = useTrialPromptStore(state => state.showTrialPrompt);

  return useCallback(
    (series: any) => {
      // Remembered either way, so the paywall opens on the title the user was
      // actually watching — the dialog navigates without route params.
      setPurchaseSeries(series);

      // Every paywall entry point routes through this hook, so one call here
      // covers the player, the series screen and the episode list. `outcome`
      // records WHICH paywall was shown: a spent trial gets a dialog, everyone
      // else gets the subscription screen, and the two convert very differently.
      capture(ProductEvent.PaywallOpened, {
        series_id: String(series?.id ?? ''),
        series_title: String(series?.title ?? ''),
        genre: String(series?.genres?.[0]?.name ?? 'unknown'),
        creator_id: String(series?.uploader?.id ?? ''),
        outcome: trialConsumed ? 'trial_prompt' : 'subscription_screen',
        trial_consumed: trialConsumed,
        // Which store the user would actually pay through. No plan yet — that
        // is chosen on the next screen and rides on the checkout events.
        rail: getPaymentRail().rail,
      });

      if (trialConsumed) {
        // Whatever is playing behind the dialog stops, so dismissing it leaves
        // the user on the locked content rather than mid-playback.
        setPaused(true);
        showTrialPrompt();
        return;
      }

      navigation.navigate('SubscriptionScreen', { series });
    },
    [navigation, setPaused, setPurchaseSeries, showTrialPrompt, trialConsumed],
  );
};
