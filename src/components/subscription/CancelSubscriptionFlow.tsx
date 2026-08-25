import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import FastImage, { ImageStyle } from '@d11/react-native-fast-image';
import { Check, ChevronLeft, ShieldCheck, X } from 'lucide-react-native';
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
const SHEET_HEIGHT_RATIO = 0.92;
const DISMISS_DRAG_DISTANCE = 120;
const DISMISS_DRAG_VELOCITY = 1.1;

const PLAN_LABEL: Record<string, string> = {
  TRIAL: 'Trial',
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
};

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

// Progress arrives either as a 0-1 fraction or an already-scaled percentage.
const toPercent = (progress?: number): number | null => {
  if (typeof progress !== 'number' || Number.isNaN(progress)) return null;
  const percent = progress > 1 ? progress : progress * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
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

function StepHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.heading}>
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

interface ReasonStepProps {
  reasons: CancelReasonOption[];
  reason: CancelReasonCode | null;
  otherText: string;
  onSelectReason: (code: CancelReasonCode) => void;
  onChangeOtherText: (text: string) => void;
}

function ReasonStep({
  reasons,
  reason,
  otherText,
  onSelectReason,
  onChangeOtherText,
}: ReasonStepProps) {
  return (
    <View>
      <StepHeading
        eyebrow="Your feedback"
        title="Why are you leaving?"
        subtitle="Takes five seconds, and it genuinely decides what we build next."
      />

      <View style={styles.reasonList}>
        {reasons.map(option => {
          const selected = reason === option.code;
          return (
            <TouchableOpacity
              key={option.code}
              activeOpacity={0.85}
              style={[styles.reasonRow, selected && styles.reasonRowActive]}
              onPress={() => onSelectReason(option.code)}
            >
              <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
                {selected && <Check size={13} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={[styles.reasonLabel, selected && styles.reasonLabelActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {reason === 'OTHER' && (
        <View style={styles.otherBlock}>
          <TextInput
            style={styles.otherInput}
            value={otherText}
            onChangeText={onChangeOtherText}
            placeholder="Tell us what happened"
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
            maxLength={OTHER_TEXT_MAX}
            textAlignVertical="top"
          />
          <Text style={styles.otherCounter}>
            {otherText.length}/{OTHER_TEXT_MAX}
          </Text>
        </View>
      )}
    </View>
  );
}

interface SaveStepProps {
  chargeDate: string;
  topWatch: ContinueWatchingItem | null;
  recommended: Movie[];
}

function SaveStep({ chargeDate, topWatch, recommended }: SaveStepProps) {
  const posters = recommended.slice(0, MAX_RECOMMENDED_POSTERS);
  const progressPercent = toPercent(topWatch?.progress);

  return (
    <View>
      <StepHeading
        eyebrow="Before you go"
        title="Nothing changes today"
        subtitle="Here is exactly what happens with your membership."
      />

      <View style={styles.callout}>
        <View style={styles.calloutIcon}>
          <ShieldCheck size={18} color="#ff6a00" />
        </View>
        <Text style={styles.calloutText}>
          You will not be charged if you cancel any time before{' '}
          <Text style={styles.calloutDate}>{chargeDate}</Text>. Cancelling now doesn't get you a
          refund or extra time — you keep full access until then either way.
        </Text>
      </View>

      {topWatch ? (
        <View style={styles.card}>
          <View style={styles.watchRow}>
            <Poster path={topWatch.posterUrl} style={styles.watchPoster} />
            <View style={styles.watchCopy}>
              <Text style={styles.cardEyebrow}>Continue watching</Text>
              <Text style={styles.watchTitle} numberOfLines={3}>
                Ep {topWatch.episodeNo} of {topWatch.seriesTitle}
              </Text>
              <Text style={styles.watchSubtitle}>
                Your progress stays saved — until access ends on {chargeDate}.
              </Text>
              {progressPercent !== null && (
                <View style={styles.watchProgressTrack}>
                  <View style={[styles.watchProgressFill, { width: `${progressPercent}%` }]} />
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Unlocked right now</Text>
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
    </View>
  );
}

interface ConfirmStepProps {
  chargeDate: string;
  nextChargeAmount: number;
  planCode: string;
}

function ConfirmStep({ chargeDate, nextChargeAmount, planCode }: ConfirmStepProps) {
  return (
    <View>
      <StepHeading
        title="Cancel subscription?"
        subtitle="Access ends on your renewal date and paid content locks after that."
      />

      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Current plan</Text>
          <Text style={styles.summaryValue}>{PLAN_LABEL[planCode] ?? planCode}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Charge that stops</Text>
          <Text style={styles.summaryValue}>₹{nextChargeAmount}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Access until</Text>
          <Text style={[styles.summaryValue, styles.dateHighlight]}>{chargeDate}</Text>
        </View>
      </View>

      <Text style={styles.smallPrint}>
        Payments already made (including the ₹1 activation fee) are non-refundable.{' '}
        <Text style={styles.link} onPress={openRefundPolicy}>
          Refund Policy
        </Text>
      </Text>
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
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.round(windowHeight * SHEET_HEIGHT_RATIO);

  const [mounted, setMounted] = useState(visible);
  const [step, setStep] = useState<FlowStep>(1);
  const [reason, setReason] = useState<CancelReasonCode | null>(null);
  const [otherText, setOtherText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(CONFIRM_DELAY_SECONDS);
  const terminalFiredRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const translateY = useRef(new Animated.Value(windowHeight)).current;

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

  // Slide the sheet in on open and out on close — `mounted` keeps the Modal alive through the exit.
  // Only visibility flips animate, so a rotation (which changes sheetHeight) doesn't replay the entrance.
  useEffect(() => {
    if (visible === wasVisibleRef.current) return;
    wasVisibleRef.current = visible;

    if (visible) {
      setMounted(true);
      translateY.setValue(sheetHeight);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setMounted(false));
  }, [visible, sheetHeight, translateY]);

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

  const slideOut = useCallback(
    (done: () => void) => {
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => done());
    },
    [sheetHeight, translateY],
  );

  const fireSavedOrAbandoned = useCallback(() => {
    if (reason) {
      fireTerminalEvent('CancelFlow_Saved', { reason_code: reason, saved_at_step: step });
    } else {
      fireTerminalEvent('CancelFlow_Abandoned', { saved_at_step: step });
    }
  }, [fireTerminalEvent, reason, step]);

  const handleDismiss = useCallback(() => {
    fireTerminalEvent('CancelFlow_Abandoned', { saved_at_step: step });
    slideOut(onClose);
  }, [fireTerminalEvent, onClose, slideOut, step]);

  const handleSaved = useCallback(() => {
    fireSavedOrAbandoned();
    slideOut(onClose);
  }, [fireSavedOrAbandoned, onClose, slideOut]);

  const handleContinueFromReason = useCallback(() => {
    if (!canContinue || !reason) return;
    track('CancelFlow_ReasonSelected', {
      reason_code: reason,
      plan_code: subscription.planCode,
    });
    setStep(2);
  }, [canContinue, reason, subscription.planCode]);

  const handleKeepWatching = useCallback(() => {
    fireSavedOrAbandoned();
    slideOut(() => {
      onClose();
      if (!topWatch) return;
      navigation.navigate('Video', {
        id: topWatch.seriesId,
        episodeId: topWatch.episodeId,
        posterUrl: topWatch.posterUrl,
      });
    });
  }, [fireSavedOrAbandoned, navigation, onClose, slideOut, topWatch]);

  const handleContinueToCancel = useCallback(() => {
    track('CancelFlow_ReachedConfirm', { reason_code: reason ?? undefined });
    setStep(4);
  }, [reason]);

  // With nothing upcoming, step 3 would render an empty screen — go straight to confirmation.
  const handleContinueToComingSoon = useCallback(() => {
    if (displayUpcoming.length === 0) {
      handleContinueToCancel();
      return;
    }
    setStep(3);
  }, [displayUpcoming.length, handleContinueToCancel]);

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
    () =>
      setStep(current => {
        if (current === 4) return displayUpcoming.length === 0 ? 2 : 3;
        if (current === 3) return 2;
        return 1;
      }),
    [displayUpcoming.length],
  );

  // Drag-to-dismiss is bound to the grab handle only, so the scrollable body keeps its own gestures.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) translateY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > DISMISS_DRAG_DISTANCE || gesture.vy > DISMISS_DRAG_VELOCITY) {
            handleDismiss();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [handleDismiss, translateY],
  );

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, sheetHeight],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const confirmLocked = countdown > 0;

  const renderFooter = () => {
    if (step === 1) {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryButton, !canContinue && styles.buttonDisabled]}
          onPress={handleContinueFromReason}
          disabled={!canContinue}
        >
          <Text style={[styles.primaryButtonText, !canContinue && styles.buttonTextDisabled]}>
            Continue
          </Text>
        </TouchableOpacity>
      );
    }

    if (step === 2 || step === 3) {
      return (
        <>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryButton}
            onPress={handleKeepWatching}
          >
            <Text style={styles.primaryButtonText}>Keep watching</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.ghostButton}
            onPress={step === 2 ? handleContinueToComingSoon : handleContinueToCancel}
          >
            <Text style={styles.ghostButtonText}>
              {step === 2 ? 'Continue to cancel' : 'Cancel subscription'}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryButton}
          onPress={handleSaved}
          disabled={isPending}
        >
          <Text style={styles.primaryButtonText}>Keep my subscription</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.dangerButton, (confirmLocked || isPending) && styles.buttonDimmed]}
          onPress={handleConfirmCancel}
          disabled={confirmLocked || isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#ff6b6b" />
          ) : (
            <Text style={styles.dangerButtonText}>
              {confirmLocked ? `Yes, cancel (${countdown})` : 'Yes, cancel'}
            </Text>
          )}
        </TouchableOpacity>
      </>
    );
  };

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { height: sheetHeight, transform: [{ translateY }] }]}>
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            {step > 1 ? (
              <TouchableOpacity activeOpacity={0.8} style={styles.headerButton} onPress={handleBack}>
                <ChevronLeft size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerButton} />
            )}

            <TouchableOpacity
              activeOpacity={0.8}
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
            automaticallyAdjustKeyboardInsets
          >
            {step === 1 && (
              <ReasonStep
                reasons={reasons}
                reason={reason}
                otherText={otherText}
                onSelectReason={setReason}
                onChangeOtherText={setOtherText}
              />
            )}

            {step === 2 && (
              <SaveStep chargeDate={chargeDate} topWatch={topWatch} recommended={recommended} />
            )}

            {step === 3 && (
              <>
                <StepHeading
                  eyebrow="Still to come"
                  title="Coming soon on Canvas"
                  subtitle="A glimpse of what is next. Your membership keeps the whole library open."
                />
                <SubscriptionComingSoon displayUpcoming={displayUpcoming} variant="sheet" />
              </>
            )}

            {step === 4 && (
              <ConfirmStep
                chargeDate={chargeDate}
                nextChargeAmount={nextChargeAmount}
                planCode={subscription.planCode}
              />
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>{renderFooter()}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#0E0E10',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 26,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressSegmentActive: {
    backgroundColor: '#ff6a00',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heading: {
    marginBottom: 26,
  },
  eyebrow: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#ff6a00',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 26,
    lineHeight: 32,
    color: '#fff',
  },
  subtitle: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 21,
    marginTop: 10,
  },
  reasonList: {
    gap: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  reasonRowActive: {
    borderColor: '#ff6a00',
    backgroundColor: 'rgba(255,106,0,0.1)',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#ff6a00',
    backgroundColor: '#ff6a00',
  },
  reasonLabel: {
    flex: 1,
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 21,
  },
  reasonLabelActive: {
    color: '#fff',
  },
  otherBlock: {
    marginTop: 18,
  },
  otherInput: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 15,
    lineHeight: 21,
    color: '#fff',
  },
  otherCounter: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  callout: {
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.3)',
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  calloutIcon: {
    marginTop: 1,
  },
  calloutText: {
    flex: 1,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 21,
  },
  calloutDate: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#ffa05c',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 18,
  },
  cardEyebrow: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 8,
  },
  watchRow: {
    flexDirection: 'row',
    gap: 16,
  },
  watchPoster: {
    width: 86,
    height: 128,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
  },
  watchCopy: {
    flex: 1,
  },
  watchTitle: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    lineHeight: 22,
  },
  watchSubtitle: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 19,
  },
  watchProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 14,
    overflow: 'hidden',
  },
  watchProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ff6a00',
  },
  posterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rowPoster: {
    width: 86,
    height: 128,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  summaryLabel: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
  },
  summaryValue: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 15,
    color: '#fff',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dateHighlight: {
    color: '#ffa05c',
  },
  smallPrint: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 19,
    marginTop: 20,
  },
  link: {
    color: '#ffa05c',
    textDecorationLine: 'underline',
  },
  errorText: {
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontSize: 13,
    color: '#ff6b6b',
    lineHeight: 18,
    marginBottom: 4,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 18,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0E0E10',
  },
  primaryButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#ff6a00',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 15,
    color: '#fff',
  },
  ghostButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
  },
  dangerButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,72,72,0.45)',
    backgroundColor: 'rgba(229,72,72,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 15,
    color: '#ff6b6b',
  },
  buttonDimmed: {
    opacity: 0.55,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  buttonTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
});
