import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FastImage, { ImageStyle } from '@d11/react-native-fast-image';
import { Check, ChevronLeft, X } from 'lucide-react-native';
import {
  CancelReasonCode,
  Subscription,
  useCancelSubscription,
  useSubscriptionPlans,
} from '../../api/subscription';
import {
  imgUrl,
  useContinueWatching,
  useRecommendedSeriesData,
  useUpcomingSeriesData,
} from '../../api/video';
import { Movie } from '../../types/movie';
import { track } from '../../utils/analytics';
import {
  CancelReasonOption,
  getCancelReasons,
  OTHER_TEXT_MAX,
  OTHER_TEXT_MIN,
} from './cancelFlowConfig';
import SubscriptionComingSoon from './SubscriptionComingSoon';

const REFUND_POLICY_URL = 'https://canvasott.com/refund-policy';
const CONFIRM_DELAY_SECONDS = 2;
const MAX_RECOMMENDED_POSTERS = 3;
const FALLBACK_PRICE_BY_PLAN = { MONTHLY: 99, ANNUAL: 499 } as const;
const TOTAL_STEPS = 4;

type FlowStep = 1 | 2 | 3 | 4;

interface ContinueWatchingItem {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeNo: number;
  progress?: number;
  posterUrl?: string;
}

interface CancelSubscriptionFlowProps {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
}

const formatChargeDate = (dateString?: string | null): string => {
  if (!dateString) return 'your renewal date';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'your renewal date';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const resolveErrorMessage = (error: unknown): string => {
  const message = (error as { message?: unknown })?.message;
  if (typeof message === 'string' && message.length > 0) return message;
  if (message && typeof message === 'object') {
    const nested = (message as { message?: unknown }).message;
    if (typeof nested === 'string' && nested.length > 0) return nested;
  }
  return 'Failed to cancel subscription. Please try again.';
};

const openRefundPolicy = async (): Promise<void> => {
  try {
    await Linking.openURL(REFUND_POLICY_URL);
  } catch (error) {
    console.error('Failed to open refund policy:', error);
  }
};

function ProgressBar({ step }: { step: FlowStep }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, index) => (
        <View
          key={index}
          style={[styles.progressSegment, index < step && styles.progressSegmentActive]}
        />
      ))}
    </View>
  );
}

function Poster({ path, style }: { path?: string; style: StyleProp<ImageStyle> }) {
  return (
    <FastImage
      source={
        path
          ? {
              uri: imgUrl(path, 320),
              priority: FastImage.priority.normal,
              cache: FastImage.cacheControl.immutable,
            }
          : { uri: '' }
      }
      style={style}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
}

interface ReasonStepProps {
  reasons: CancelReasonOption[];
  reason: CancelReasonCode | null;
  otherText: string;
  canContinue: boolean;
  onSelectReason: (code: CancelReasonCode) => void;
  onChangeOtherText: (text: string) => void;
  onContinue: () => void;
}

function ReasonStep({
  reasons,
  reason,
  otherText,
  canContinue,
  onSelectReason,
  onChangeOtherText,
  onContinue,
}: ReasonStepProps) {
  return (
    <View>
      <Text style={styles.title}>Why are you leaving?</Text>
      <Text style={styles.subtitle}>
        Takes five seconds, and it genuinely decides what we build next.
      </Text>

      {reasons.map(option => {
        const selected = reason === option.code;
        return (
          <TouchableOpacity
            key={option.code}
            activeOpacity={0.9}
            style={[styles.reasonRow, selected && styles.reasonRowActive]}
            onPress={() => onSelectReason(option.code)}
          >
            <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
              {selected && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.reasonLabel}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}

      {reason === 'OTHER' && (
        <View style={styles.otherBlock}>
          <TextInput
            style={styles.otherInput}
            value={otherText}
            onChangeText={onChangeOtherText}
            placeholder="Tell us what happened"
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
            maxLength={OTHER_TEXT_MAX}
            textAlignVertical="top"
          />
          <Text style={styles.otherCounter}>
            {otherText.length}/{OTHER_TEXT_MAX}
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.primaryButton, !canContinue && styles.buttonDisabled]}
        onPress={onContinue}
        disabled={!canContinue}
      >
        <Text style={[styles.primaryButtonText, !canContinue && styles.buttonTextDisabled]}>
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface SaveStepProps {
  chargeDate: string;
  topWatch: ContinueWatchingItem | null;
  recommended: Movie[];
  onKeepWatching: () => void;
  onContinueToCancel: () => void;
}

function SaveStep({
  chargeDate,
  topWatch,
  recommended,
  onKeepWatching,
  onContinueToCancel,
}: SaveStepProps) {
  const posters = recommended.slice(0, MAX_RECOMMENDED_POSTERS);

  return (
    <View>
      <Text style={styles.title}>Before you go</Text>

      <View style={styles.callout}>
        <View style={styles.calloutIcon}>
          <Check size={16} color="#ff6a00" />
        </View>
        <Text style={styles.calloutText}>
          You will not be charged if you cancel any time before{' '}
          <Text style={styles.calloutDate}>{chargeDate}</Text>. Cancelling now doesn't get you a
          refund or extra time — you keep full access until then either way.
        </Text>
      </View>

      {topWatch ? (
        <View style={styles.watchRow}>
          <Poster path={topWatch.posterUrl} style={styles.watchPoster} />
          <View style={styles.watchCopy}>
            <Text style={styles.watchTitle}>
              You're on Ep {topWatch.episodeNo} of {topWatch.seriesTitle}
            </Text>
            <Text style={styles.watchSubtitle}>
              Your progress stays saved — until access ends on {chargeDate}.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.libraryBlock}>
          {posters.length > 0 && (
            <View style={styles.posterRow}>
              {posters.map(series => (
                <Poster key={series.id} path={series.posterUrl} style={styles.rowPoster} />
              ))}
            </View>
          )}
          <Text style={styles.watchSubtitle}>
            {recommended.length > 0
              ? `${recommended.length} series are unlocked right now. You've watched none of them yet.`
              : 'Your full library is unlocked right now.'}
          </Text>
        </View>
      )}

      <TouchableOpacity activeOpacity={0.9} style={styles.primaryButton} onPress={onKeepWatching}>
        <Text style={styles.primaryButtonText}>Keep watching</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.secondaryButton}
        onPress={onContinueToCancel}
      >
        <Text style={styles.secondaryButtonText}>Continue to cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

interface ConfirmStepProps {
  chargeDate: string;
  nextChargeAmount: number;
  countdown: number;
  isPending: boolean;
  errorMessage: string | null;
  onKeepSubscription: () => void;
  onConfirmCancel: () => void;
}

function ConfirmStep({
  chargeDate,
  nextChargeAmount,
  countdown,
  isPending,
  errorMessage,
  onKeepSubscription,
  onConfirmCancel,
}: ConfirmStepProps) {
  const locked = countdown > 0;

  return (
    <View>
      <Text style={styles.title}>Cancel subscription?</Text>

      <Text style={styles.bodyText}>
        Your ₹{nextChargeAmount} charge on <Text style={styles.dateHighlight}>{chargeDate}</Text>{' '}
        will not go through. Access ends that day and paid content locks.
      </Text>

      <Text style={styles.smallPrint}>
        Payments already made (including the ₹1 activation fee) are non-refundable.{' '}
        <Text style={styles.link} onPress={openRefundPolicy}>
          Refund Policy
        </Text>
      </Text>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <View style={styles.confirmButtonRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.rowButton, styles.keepButton]}
          onPress={onKeepSubscription}
          disabled={isPending}
        >
          <Text style={styles.primaryButtonText}>Keep subscription</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.rowButton, styles.destructiveButton, locked && styles.buttonDimmed]}
          onPress={onConfirmCancel}
          disabled={locked || isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.destructiveButtonText}>
              {locked ? `Yes, cancel (${countdown})` : 'Yes, cancel'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Owns the four-step cancel flow — reason capture, save, upcoming content, confirmation, and cancellation.
export default function CancelSubscriptionFlow({
  visible,
  onClose,
  subscription,
}: CancelSubscriptionFlowProps) {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<FlowStep>(1);
  const [reason, setReason] = useState<CancelReasonCode | null>(null);
  const [otherText, setOtherText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(CONFIRM_DELAY_SECONDS);
  const terminalFiredRef = useRef(false);

  const { data: continueWatchingData } = useContinueWatching();
  const { data: recommendedData } = useRecommendedSeriesData();
  const { data: upcomingData } = useUpcomingSeriesData();
  const { data: plansData } = useSubscriptionPlans();
  const { mutate: cancelSubscription, isPending } = useCancelSubscription();

  const topWatch: ContinueWatchingItem | null =
    ((continueWatchingData?.items ?? []) as ContinueWatchingItem[])[0] ?? null;
  const recommended: Movie[] = recommendedData?.series ?? [];
  const displayUpcoming = upcomingData?.upcomingSeries ?? [];
  const reasons = useMemo(() => getCancelReasons(subscription.planCode), [subscription.planCode]);
  const chargeDate = formatChargeDate(subscription.currentPeriodEnd);

  const nextChargeAmount = useMemo(() => {
    const targetCode = subscription.planCode === 'TRIAL' ? 'ANNUAL' : subscription.planCode;
    const plan = plansData?.plans?.find(p => p.code === targetCode);
    return plan ? plan.price / 100 : FALLBACK_PRICE_BY_PLAN[targetCode];
  }, [plansData, subscription.planCode]);

  const canContinue =
    reason !== null && (reason !== 'OTHER' || otherText.trim().length >= OTHER_TEXT_MIN);

  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setReason(null);
    setOtherText('');
    setErrorMessage(null);
    setCountdown(CONFIRM_DELAY_SECONDS);
    terminalFiredRef.current = false;
    track('CancelFlow_Opened', { plan_code: subscription.planCode });
  }, [visible, subscription.planCode]);

  useEffect(() => {
    if (step !== 4) return;
    setCountdown(CONFIRM_DELAY_SECONDS);
    const timer = setInterval(() => {
      setCountdown(current => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Exactly one of Completed / Saved / Abandoned may fire per flow, so re-renders and double-taps can't double-count.
  const fireTerminalEvent = useCallback(
    (name: string, params: Record<string, string | number | undefined>, eventId?: string) => {
      if (terminalFiredRef.current) return;
      terminalFiredRef.current = true;
      track(name, params, eventId);
    },
    [],
  );

  const handleDismiss = useCallback(() => {
    fireTerminalEvent('CancelFlow_Abandoned', { saved_at_step: step });
    onClose();
  }, [fireTerminalEvent, onClose, step]);

  const handleSaved = useCallback(() => {
    if (reason) {
      fireTerminalEvent('CancelFlow_Saved', { reason_code: reason, saved_at_step: step });
    } else {
      fireTerminalEvent('CancelFlow_Abandoned', { saved_at_step: step });
    }
    onClose();
  }, [fireTerminalEvent, onClose, reason, step]);

  const handleContinueFromReason = useCallback(() => {
    if (!canContinue || !reason) return;
    track('CancelFlow_ReasonSelected', {
      reason_code: reason,
      plan_code: subscription.planCode,
    });
    setStep(2);
  }, [canContinue, reason, subscription.planCode]);

  const handleKeepWatching = useCallback(() => {
    handleSaved();
    if (!topWatch) return;
    navigation.navigate('Video', {
      id: topWatch.seriesId,
      episodeId: topWatch.episodeId,
      posterUrl: topWatch.posterUrl,
    });
  }, [handleSaved, navigation, topWatch]);

  const handleContinueToComingSoon = useCallback(() => {
    setStep(3);
  }, []);

  const handleContinueToCancel = useCallback(() => {
    track('CancelFlow_ReachedConfirm', { reason_code: reason ?? undefined });
    setStep(4);
  }, [reason]);

  const handleConfirmCancel = useCallback(() => {
    setErrorMessage(null);
    cancelSubscription(
      {
        subscriptionId: subscription.id,
        reason: reason ?? undefined,
        reasonText: reason === 'OTHER' ? otherText.trim() : undefined,
      },
      {
        onSuccess: () => {
          fireTerminalEvent(
            'CancelFlow_Completed',
            { reason_code: reason ?? undefined, plan_code: subscription.planCode },
            subscription.id,
          );
          onClose();
        },
        onError: (error: unknown) => setErrorMessage(resolveErrorMessage(error)),
      },
    );
  }, [
    cancelSubscription,
    fireTerminalEvent,
    onClose,
    otherText,
    reason,
    subscription.id,
    subscription.planCode,
  ]);

  const handleBack = useCallback(
    () => setStep(current => (current === 4 ? 3 : current === 3 ? 2 : 1)),
    [],
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            {step > 1 ? (
              <TouchableOpacity activeOpacity={0.9} style={styles.headerButton} onPress={handleBack}>
                <ChevronLeft size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerButton} />
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.headerButton}
              onPress={handleDismiss}
            >
              <X size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <ProgressBar step={step} />

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 && (
              <ReasonStep
                reasons={reasons}
                reason={reason}
                otherText={otherText}
                canContinue={canContinue}
                onSelectReason={setReason}
                onChangeOtherText={setOtherText}
                onContinue={handleContinueFromReason}
              />
            )}

            {step === 2 && (
              <SaveStep
                chargeDate={chargeDate}
                topWatch={topWatch}
                recommended={recommended}
                onKeepWatching={handleKeepWatching}
                onContinueToCancel={handleContinueToComingSoon}
              />
            )}

            {step === 3 && (
              <SubscriptionComingSoon
                displayUpcoming={displayUpcoming}
                onKeepWatching={handleKeepWatching}
                onCancelSubscription={handleContinueToCancel}
              />
            )}

            {step === 4 && (
              <ConfirmStep
                chargeDate={chargeDate}
                nextChargeAmount={nextChargeAmount}
                countdown={countdown}
                isPending={isPending}
                errorMessage={errorMessage}
                onKeepSubscription={handleSaved}
                onConfirmCancel={handleConfirmCancel}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '88%',
    maxHeight: '85%',
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    marginBottom: 20,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressSegmentActive: {
    backgroundColor: '#ff6a00',
  },
  body: {
    width: '100%',
  },
  bodyContent: {
    paddingBottom: 4,
  },
  title: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 20,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
    marginBottom: 18,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  reasonRowActive: {
    borderColor: '#ff6a00',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioOuterActive: {
    borderColor: '#ff6a00',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff6a00',
  },
  reasonLabel: {
    flex: 1,
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 19,
  },
  otherBlock: {
    marginTop: 4,
    marginBottom: 4,
  },
  otherInput: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 14,
    color: '#fff',
  },
  otherCounter: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  callout: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.35)',
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  calloutIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  calloutText: {
    flex: 1,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  calloutDate: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#ffa05c',
  },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  watchPoster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  watchCopy: {
    flex: 1,
    marginLeft: 14,
  },
  watchTitle: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 15,
    color: '#fff',
    marginBottom: 6,
    lineHeight: 20,
  },
  watchSubtitle: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  libraryBlock: {
    marginBottom: 20,
  },
  posterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  rowPoster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  bodyText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: 16,
  },
  dateHighlight: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#ffa05c',
  },
  smallPrint: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
    marginBottom: 20,
  },
  link: {
    color: '#ffa05c',
    textDecorationLine: 'underline',
  },
  errorText: {
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontSize: 13,
    color: '#e54848',
    lineHeight: 18,
    marginBottom: 12,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#ff6a00',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 14,
    color: '#fff',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  confirmButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rowButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButton: {
    backgroundColor: '#ff6a00',
  },
  destructiveButton: {
    backgroundColor: '#e54848',
  },
  destructiveButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 14,
    color: '#fff',
  },
  buttonDimmed: {
    opacity: 0.6,
  },
  buttonDisabled: {
    backgroundColor: '#262629',
  },
  buttonTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
});
