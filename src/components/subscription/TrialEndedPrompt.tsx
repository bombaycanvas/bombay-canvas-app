import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { ConfirmationModal } from '../ConfirmationModal';
import LockOutlined from '../../assets/LockOutlined';
import { useAuthStore } from '../../store/authStore';
import { useTrialConsumed } from '../../hooks/useTrialConsumed';
import { useTrialPromptStore } from '../../store/trialPromptStore';

/**
 * The "your free trial has ended" dialog, mounted app-wide beside LockedOverlay.
 *
 * It opens once per session for an account whose trial is spent, and on demand
 * whenever a locked episode is tapped (see VideoPlayer's openPaywallFor).
 * Confirming lands on the paywall, which is where the plans actually are;
 * dismissing leaves the user where they were, with the video paused behind it.
 *
 * This is also the app's single observer of the subscription queries behind
 * `useTrialConsumed` — see the note on trialPromptStore.trialConsumed.
 */
export function TrialEndedPrompt() {
  const navigation = useNavigation<NavigationProp<any>>();

  // The plans response is persisted across launches, so a `trialEligible:false`
  // answer belonging to the previous account can rehydrate before the queries
  // re-run. The token is what says whose answer it is: without one there is
  // nobody to have spent a trial, and the auth screens stay clear of dialogs.
  const token = useAuthStore(state => state.token);
  const trialConsumed = useTrialConsumed() && !!token;

  const {
    visible,
    promptedThisSession,
    setTrialConsumed,
    showTrialPrompt,
    hideTrialPrompt,
  } = useTrialPromptStore();

  useEffect(() => {
    setTrialConsumed(trialConsumed);
  }, [trialConsumed, setTrialConsumed]);

  useEffect(() => {
    if (trialConsumed && !promptedThisSession) {
      showTrialPrompt();
    }
  }, [trialConsumed, promptedThisSession, showTrialPrompt]);

  return (
    <ConfirmationModal
      visible={visible}
      onClose={hideTrialPrompt}
      onConfirm={() => navigation.navigate('SubscriptionScreen')}
      icon={<LockOutlined width={22} height={22} color="#ff6a00" />}
      title="Your free trial has ended"
      message="You've already used your free trial on this account. To keep watching, activate a plan — your access starts right away."
      cancelText="Not Now"
      confirmText="Activate Plan"
    />
  );
}
