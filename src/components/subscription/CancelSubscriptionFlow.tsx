import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import Toast from 'react-native-toast-message';
import {
  CancelReasonCode,
  isAppleManagedCancelError,
  isTrialCode,
  Subscription,
  useCancelSubscription,
  useSubscriptionPlans,
  type Plan,
  type PlanCode,
} from '../../api/subscription';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import {
  imgUrl,
  useContinueWatching,
  useRecommendedSeriesData,
  useUpcomingSeriesData,
} from '../../api/video';
import { Movie } from '../../types/movie';
import { getRailForSubscription } from '../../services/paymentRail';
import SubscriptionActivatingOverlay from './SubscriptionActivatingOverlay';
import type { PurchasePhase } from './SubscriptionActivatingOverlay';
import { track } from '../../utils/analytics';
import { IS_APPLE_RAIL, IS_RAZORPAY_RAIL } from '../../utils/paymentRail';
import {
  CancelReasonOption,
  getCancelReasons,
  OTHER_TEXT_MAX,
  OTHER_TEXT_MIN,
} from './cancelFlowConfig';
import SubscriptionComingSoon from './SubscriptionComingSoon';

const REFUND_POLICY_URL = 'https://canvasott.com/refund-policy';
// The App Store adapter, addressed by name rather than looked up from the row's
// provider, because the fallback below runs precisely when that field is wrong.
const APPLE_MANAGED_RAIL = getRailForSubscription('APPLE');
const APPLE_SETTINGS_UNAVAILABLE =
  'We could not open your App Store settings. Cancel from Settings › your name › Subscriptions.';
const CONFIRM_DELAY_SECONDS = 2;
const MAX_RECOMMENDED_POSTERS = 3;
const SHEET_HEIGHT_RATIO = 0.92;
const DISMISS_DRAG_DISTANCE = 120;
const DISMISS_DRAG_VELOCITY = 1.1;

const PLAN_LABEL: Record<string, string> = {
  TRIAL: 'Trial',
  TRIAL_NEW: 'Trial',
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
};

/** The cheaper plans offered instead of losing the user outright, in display order. */
const DOWNSELL_CODES: PlanCode[] = ['MONTHLY', 'ANNUAL'];

/**
 * The steps this flow can show, in fixed order. Which of them actually appear is
 * decided per-run (see `steps` below) — "coming soon" is skipped with nothing to
 * show, and the downsell only exists for a trial that has somewhere cheaper to
 * go. Addressing steps by NAME rather than by number is what keeps that
 * conditional: the previous hardcoded 1-4 meant every skip had to be re-derived
 * by hand in both the forward and back handlers, and adding a step renumbered
 * the others.
 */
type StepName =
  | 'reason'
  | 'save'
  | 'upcoming'
  | 'downsell'
  | 'downsellConfirm'
  | 'confirm';

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
  /**
   * Fired only when the App Store subscription sheet was actually opened. Apple
   * never reports back what the user did in there, so this is the caller's cue
   * to start watching for the notification that eventually tells the server.
   */
  onDeferredToStore?: () => void;
  /**
   * Fired once a downsell has been paid for. The subscription the caller handed
   * us no longer exists in the form it was rendered from — it was cancelled and
   * replaced — so the caller is expected to leave this screen rather than sit on
   * a view of the old plan waiting for the webhook to catch up.
   */
  onSwitchedPlan?: () => void;
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

function ProgressBar({ index, total }: { index: number; total: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            i <= index && styles.progressSegmentActive,
          ]}
        />
      ))}
    </View>
  );
}

function Poster({
  path,
  style,
}: {
  path?: string;
  style: StyleProp<ImageStyle>;
}) {
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
              <View
                style={[styles.radioOuter, selected && styles.radioOuterActive]}
              >
                {selected && <Check size={13} color="#fff" strokeWidth={3} />}
              </View>
              <Text
                style={[
                  styles.reasonLabel,
                  selected && styles.reasonLabelActive,
                ]}
              >
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

interface DownsellStepProps {
  plans: Plan[];
  currentAmount: number;
  selected: PlanCode | null;
  onSelect: (code: PlanCode) => void;
  /** Tapping the CTA on the already-selected card moves to the confirm step. */
  onProceed: () => void;
}

/**
 * Offered to a trial user on the way out, before the confirm screen: the same
 * catalogue at a price they have not already rejected.
 *
 * Only reached when there is genuinely something cheaper to move to — see
 * `downsellPlans`. Every amount is rendered from the plan the API returned, so
 * the saving quoted here is arithmetic on real prices rather than copy that goes
 * stale the next time a plan is re-priced.
 */
function DownsellStep({
  plans,
  currentAmount,
  selected,
  onSelect,
  onProceed,
}: DownsellStepProps) {
  return (
    <View>
      <StepHeading
        eyebrow="Before you go"
        title="Keep Canvas for less"
        subtitle="You picked the trial because the catalogue looked worth it. It still is — just at a price that suits you better."
      />

      <View style={styles.downsellList}>
        {plans.map(plan => {
          const price = Math.round(plan.price / 100);
          const perMonth =
            plan.period === 'yearly' ? Math.round(price / 12) : price;
          // Compare like with like: `currentAmount` is a YEARLY price (both trial
          // codes bill annually), so a monthly plan has to be annualised before
          // it can be measured against it. Comparing the raw ₹99 to ₹899 read as
          // "Save 89%" when twelve of those months actually cost ₹1,188 — ₹289
          // MORE than the trial it was pitched as a saving on.
          //
          // Monthly therefore shows no badge here, which is correct: it is a
          // downsell on COMMITMENT (₹99 now instead of ₹899), not on annual cost.
          const annualisedPrice =
            plan.period === 'yearly' ? plan.price : plan.price * 12;
          const saving = Math.max(
            0,
            Math.round(
              ((currentAmount - annualisedPrice) / currentAmount) * 100,
            ),
          );
          // Emphasis follows SELECTION, not the plan itself. Annual arrives
          // pre-selected (see `defaultDownsellCode`) so it is primary on entry,
          // but picking monthly has to move the highlight with it — a card whose
          // button reads "Confirm Plan" while a different card is the lit one
          // would leave the user unsure what they are about to be charged for.
          const isSelected = selected === plan.code;

          return (
            <TouchableOpacity
              key={plan.code}
              activeOpacity={0.85}
              style={[
                styles.downsellCard,
                isSelected && styles.downsellCardPrimary,
              ]}
              onPress={() => onSelect(plan.code)}
            >
              <View style={styles.downsellCardTop}>
                <Text style={styles.downsellPlanName}>{plan.name}</Text>
                {saving > 0 && (
                  <View style={styles.downsellSaveBadge}>
                    <Text style={styles.downsellSaveBadgeText}>
                      Save {saving}%
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.downsellPriceRow}>
                <Text style={styles.downsellPrice}>₹{price}</Text>
                <Text style={styles.downsellPeriod}>
                  /{plan.period === 'yearly' ? 'year' : 'month'}
                </Text>
              </View>

              {plan.period === 'yearly' && (
                <Text style={styles.downsellPerMonth}>
                  Works out to ₹{perMonth}/month
                </Text>
              )}

              {/*
                The first tap only selects; a press on the already-selected
                card's button moves to the confirmation step. Nothing is
                cancelled or charged from here — a mis-tap on the wrong card
                costs the user a step, never money.
              */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.downsellCta,
                  !isSelected && styles.downsellCtaSecondary,
                ]}
                onPress={() => (isSelected ? onProceed() : onSelect(plan.code))}
              >
                <Text
                  style={[
                    styles.downsellCtaText,
                    !isSelected && styles.downsellCtaTextSecondary,
                  ]}
                >
                  {isSelected ? 'Confirm Plan' : 'Switch to this plan'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.smallPrint}>
        Switching cancels your trial and starts the plan you pick straight away.
        The ₹1 activation fee is not refunded.
      </Text>
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
          <Text style={styles.calloutDate}>{chargeDate}</Text>. Cancelling now
          doesn't get you a refund or extra time — you keep full access until
          then either way.
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
                  <View
                    style={[
                      styles.watchProgressFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
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
                <Poster
                  key={series.id}
                  path={series.posterUrl}
                  style={styles.rowPoster}
                />
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

interface DownsellConfirmStepProps {
  plan: Plan;
  chargeDate: string;
  currentAmount: number;
}

/**
 * Confirmation for taking the downsell — the counterpart of ConfirmStep, and
 * required for the same reason.
 *
 * Switching is not a pure upgrade: the trial is cancelled FIRST, because the
 * backend refuses a second subscription while one is live, and that cancel is
 * not undone if the payment is then abandoned. So the step has to state plainly
 * what is about to happen and in what order, and the user has to agree to it
 * before anything irreversible runs. Selecting a card no longer commits.
 *
 * No countdown here, unlike ConfirmStep. That delay exists to slow down an
 * irreversible cancellation; this action keeps the user subscribed, and putting
 * friction in front of it would only push them toward leaving.
 */
function DownsellConfirmStep({
  plan,
  chargeDate,
  currentAmount,
}: DownsellConfirmStepProps) {
  const price = Math.round(plan.price / 100);
  const period = plan.period === 'yearly' ? 'year' : 'month';

  return (
    <View>
      <StepHeading
        eyebrow="Almost done"
        title={`Switch to ${plan.name}?`}
        subtitle="Confirm and we'll take you to payment. Nothing changes until you do."
      />

      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>New plan</Text>
          <Text style={styles.summaryValue}>{plan.name}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>You pay</Text>
          <Text style={[styles.summaryValue, styles.dateHighlight]}>
            ₹{price}/{period}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Instead of</Text>
          <Text style={styles.summaryValue}>
            ₹{Math.round(currentAmount / 100)}/year
          </Text>
        </View>
      </View>

      {/*
        The order is not an implementation detail the user can be spared: they
        will see their trial end before the payment sheet opens, and if they
        close that sheet the trial stays cancelled. Saying so here is what makes
        that outcome unsurprising rather than a support ticket.
      */}
      <Text style={styles.smallPrint}>
        Your ₹1 trial is cancelled first, then payment opens. If you don't
        complete the payment your trial stays cancelled, and you keep access
        until {chargeDate}. The ₹1 activation fee is non-refundable.{' '}
        <Text style={styles.link} onPress={openRefundPolicy}>
          Refund Policy
        </Text>
      </Text>
    </View>
  );
}

interface ConfirmStepProps {
  chargeDate: string;
  nextChargeAmount: number;
  planCode: string;
}

function ConfirmStep({
  chargeDate,
  nextChargeAmount,
  planCode,
}: ConfirmStepProps) {
  return (
    <View>
      <StepHeading
        title="Cancel subscription?"
        subtitle="Access ends on your renewal date and paid content locks after that."
      />

      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Current plan</Text>
          <Text style={styles.summaryValue}>
            {PLAN_LABEL[planCode] ?? planCode}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Charge that stops</Text>
          <Text style={styles.summaryValue}>₹{nextChargeAmount}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Access until</Text>
          <Text style={[styles.summaryValue, styles.dateHighlight]}>
            {chargeDate}
          </Text>
        </View>
      </View>

      <Text style={styles.smallPrint}>
        Payments already made (including the ₹1 activation fee) are
        non-refundable.{' '}
        <Text style={styles.link} onPress={openRefundPolicy}>
          Refund Policy
        </Text>
      </Text>
    </View>
  );
}

// Apple owns billing for an App Store subscription: an app may open the system
// sheet and nothing more. So this step replaces the confirmation step rather
// than dressing it up — none of its copy may suggest that tapping through here
// cancelled anything, because only the user, inside Apple's own settings, can.
// The charge amount is dropped with it: that figure is the DB accounting record,
// and Apple bills each storefront in its own currency.
function AppleManageStep({
  chargeDate,
  planCode,
}: {
  chargeDate: string;
  planCode: string;
}) {
  return (
    <View>
      <StepHeading
        title="Cancel with Apple"
        subtitle="You bought this through the App Store, so Apple manages the billing."
      />

      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Current plan</Text>
          <Text style={styles.summaryValue}>
            {PLAN_LABEL[planCode] ?? planCode}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Access until</Text>
          <Text style={[styles.summaryValue, styles.dateHighlight]}>
            {chargeDate}
          </Text>
        </View>
      </View>

      <View style={styles.callout}>
        <View style={styles.calloutIcon}>
          <ShieldCheck size={18} color="#ff6a00" />
        </View>
        <Text style={styles.calloutText}>
          {IS_APPLE_RAIL
            ? 'We will open your App Store subscription settings. Turning off renewal there is what cancels the plan — nothing changes until you do.'
            : 'This plan can only be cancelled on an iPhone or iPad signed in to the same Apple ID, under Settings › your name › Subscriptions.'}
        </Text>
      </View>

      <Text style={styles.smallPrint}>
        Apple handles billing and refunds for App Store purchases.{' '}
        <Text style={styles.link} onPress={openRefundPolicy}>
          Refund Policy
        </Text>
      </Text>
    </View>
  );
}

// Owns the cancel flow — reason capture, save, upcoming content, an optional
// downsell for trial users, confirmation, and cancellation.
export default function CancelSubscriptionFlow({
  visible,
  onClose,
  subscription,
  onDeferredToStore,
  onSwitchedPlan,
}: CancelSubscriptionFlowProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.round(windowHeight * SHEET_HEIGHT_RATIO);

  const [mounted, setMounted] = useState(visible);
  const [stepIndex, setStepIndex] = useState(0);
  const [reason, setReason] = useState<CancelReasonCode | null>(null);
  const [otherText, setOtherText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(CONFIRM_DELAY_SECONDS);
  const [switchingTo, setSwitchingTo] = useState<PlanCode | null>(null);
  const [pickedDownsell, setPickedDownsell] = useState<PlanCode | null>(null);
  // Drives the post-cancel purchase overlay, which outlives the sheet itself.
  const [purchasePhase, setPurchasePhase] = useState<PurchasePhase>('idle');
  const [openingStoreSettings, setOpeningStoreSettings] = useState(false);
  const [refusedAsAppleManaged, setRefusedAsAppleManaged] = useState(false);
  const terminalFiredRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const translateY = useRef(new Animated.Value(windowHeight)).current;

  const { data: continueWatchingData } = useContinueWatching();
  const { data: recommendedData } = useRecommendedSeriesData();
  const { data: upcomingData } = useUpcomingSeriesData();
  const { data: plansData } = useSubscriptionPlans();
  const { mutate: cancelSubscription, isPending } = useCancelSubscription();
  const { mutateAsync: cancelSubscriptionAsync } = useCancelSubscription();
  const { startCheckout } = useSubscriptionCheckout();

  // Which rail SOLD this subscription — not necessarily the rail this build
  // sells through: a grandfathered iOS user still holds a Razorpay mandate and
  // cancels it here exactly as before, and an Apple subscription is visible from
  // the Android app on the same account.
  //
  // `provider` is absent on a response from a server that predates the field, so
  // a refusal from POST /cancel outranks it: the server has then told us in the
  // clearest possible terms that Apple owns this subscription, and the flow must
  // stop offering a cancellation it cannot perform.
  const isAppleManaged =
    refusedAsAppleManaged ||
    getRailForSubscription(subscription.provider).rail === 'apple';

  const topWatch: ContinueWatchingItem | null =
    ((continueWatchingData?.items ?? []) as ContinueWatchingItem[])[0] ?? null;
  const recommended: Movie[] = recommendedData?.series ?? [];
  const displayUpcoming = upcomingData?.upcomingSeries ?? [];
  const reasons = useMemo(
    () => getCancelReasons(subscription.planCode),
    [subscription.planCode],
  );
  const chargeDate = formatChargeDate(subscription.currentPeriodEnd);

  // Cheaper plans this subscriber could move to instead of leaving.
  //
  // Offered ONLY while the ₹1 trial is still running — status TRIAL, not merely
  // a trial plan CODE. planCode stays TRIAL/TRIAL_NEW for the life of the
  // subscription (the one-trial-per-user guard writes it once), so a code check
  // alone keeps offering the downsell after the trial has converted. By then the
  // subscriber has paid ₹899 for a year, and "switching" would cancel a year
  // they already own to sell them a cheaper one — a downgrade that costs them
  // money and us revenue. Nothing to offer a paid subscriber: they are already
  // on one of these plans, or on a better one.
  //
  // Filtered on price so this can never "downsell" somebody onto something
  // dearer — which is what would happen if the ₹499 TRIAL reached here and were
  // shown the ₹499 annual plan as a saving.
  //
  // Razorpay rail ONLY. Accepting a downsell opens a checkout, and on iOS this
  // build may not open Razorpay's — guideline 3.1.1. A grandfathered iOS user
  // still holding a Razorpay mandate can reach this flow, so the platform, not
  // just the subscription's provider, has to gate the offer. They keep the plain
  // cancel; they are simply not sold to from inside the app. An Apple-managed
  // row is excluded for the same reason from the other direction: it is visible
  // from the Android app, where IS_RAZORPAY_RAIL is true, and we can neither
  // cancel it nor replace it through Razorpay.
  const downsellPlans = useMemo<Plan[]>(() => {
    if (!IS_RAZORPAY_RAIL || isAppleManaged) return [];
    if (subscription.status !== 'TRIAL') return [];
    if (!isTrialCode(subscription.planCode)) return [];
    const offered = plansData?.plans ?? [];
    return DOWNSELL_CODES.map(code =>
      offered.find(p => p.code === code),
    ).filter((p): p is Plan => !!p && p.price < subscription.amountSnapshot);
  }, [
    plansData,
    isAppleManaged,
    subscription.status,
    subscription.planCode,
    subscription.amountSnapshot,
  ]);

  // Annual is the default pick: the higher-value save, and the only option that
  // holds the subscriber for a full year.
  //
  // DERIVED rather than seeded into state by an effect. `downsellPlans` is empty
  // until GET /plans resolves, so an effect would have to re-run on arrival and
  // would clobber a choice the user had already made in between. Falling back
  // through `pickedDownsell ?? default` means the default simply applies until
  // they pick, and their pick wins from then on.
  const defaultDownsellCode =
    downsellPlans.find(p => p.period === 'yearly')?.code ??
    downsellPlans[0]?.code ??
    null;
  const selectedDownsell = pickedDownsell ?? defaultDownsellCode;

  // The one plan both the confirmation copy and the switch itself read, so the
  // screen can never describe one plan while buying another.
  const selectedDownsellPlan =
    downsellPlans.find(p => p.code === selectedDownsell) ?? null;

  // The steps this run will actually show. "upcoming" needs something to show;
  // "downsell" needs somewhere cheaper to go.
  const steps = useMemo<StepName[]>(
    () => [
      'reason',
      'save',
      ...(displayUpcoming.length > 0 ? (['upcoming'] as StepName[]) : []),
      ...(downsellPlans.length > 0
        ? (['downsell', 'downsellConfirm'] as StepName[])
        : []),
      'confirm',
    ],
    [displayUpcoming.length, downsellPlans.length],
  );

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const goToStep = useCallback(
    (name: StepName) => {
      const next = steps.indexOf(name);
      if (next >= 0) setStepIndex(next);
    },
    [steps],
  );

  // The charge that stops is the price frozen on THIS subscription, full stop.
  //
  // This used to map TRIAL → ANNUAL and look the price up in the offered plans.
  // That breaks twice over now: a trial converts at its own price (₹899 for
  // TRIAL_NEW, not ANNUAL's ₹499), and a user reaching this screen has already
  // consumed their trial — so the trial is hidden from `plansData` entirely, the
  // lookup misses, and the fallback map has no entry for a trial code. The
  // result was a literal "₹undefined" on the confirm step.
  //
  // amountSnapshot has none of those failure modes: it is always present, it is
  // what the mandate actually charges, and it stays right for a subscriber on a
  // price that is no longer offered.
  const nextChargeAmount = useMemo(
    () => Math.round(subscription.amountSnapshot / 100),
    [subscription.amountSnapshot],
  );

  const canContinue =
    reason !== null &&
    (reason !== 'OTHER' || otherText.trim().length >= OTHER_TEXT_MIN);

  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);
    setReason(null);
    setSwitchingTo(null);
    setPickedDownsell(null);
    setPurchasePhase('idle');
    setOtherText('');
    setErrorMessage(null);
    setCountdown(CONFIRM_DELAY_SECONDS);
    setOpeningStoreSettings(false);
    setRefusedAsAppleManaged(false);
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
    if (currentStep !== 'confirm') return;
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
  }, [currentStep]);

  // Exactly one of Completed / Saved / Abandoned may fire per flow, so re-renders and double-taps can't double-count.
  const fireTerminalEvent = useCallback(
    (
      name: string,
      params: Record<string, string | number | undefined>,
      eventId?: string,
    ) => {
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
      fireTerminalEvent('CancelFlow_Saved', {
        reason_code: reason,
        saved_at_step: currentStep,
      });
    } else {
      fireTerminalEvent('CancelFlow_Abandoned', { saved_at_step: currentStep });
    }
  }, [currentStep, fireTerminalEvent, reason]);

  const handleDismiss = useCallback(() => {
    fireTerminalEvent('CancelFlow_Abandoned', { saved_at_step: currentStep });
    slideOut(onClose);
  }, [currentStep, fireTerminalEvent, onClose, slideOut]);

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
    goToStep('save');
  }, [canContinue, goToStep, reason, subscription.planCode]);

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

  // Advance one step. Which step that IS depends on `steps`, which already
  // omits the ones this run has no content for — so nothing here re-derives a
  // skip, and adding a step never touches this function.
  const handleAdvance = useCallback(() => {
    const next = Math.min(stepIndex + 1, steps.length - 1);
    if (steps[next] === 'confirm') {
      track('CancelFlow_ReachedConfirm', { reason_code: reason ?? undefined });
    }
    setStepIndex(next);
  }, [reason, stepIndex, steps]);

  /**
   * Take the downsell: cancel the trial, then buy the cheaper plan.
   *
   * The order is forced by the backend's single-active guard — a user may not
   * open a second subscription while one is live (LIVE_STATUSES). Cancelling
   * first drops the trial to CANCELLED, which is not "live", so the create is
   * then accepted.
   *
   * That order also decides the failure mode, and it is the safe one: a trial
   * cancel is immediate but CANCELLED still grants access through its window, so
   * a user who abandons the Razorpay sheet keeps the catalogue until their trial
   * would have ended anyway. They lose the trial, not their access.
   */
  const handleChooseDownsell = useCallback(
    async (plan: Plan) => {
      if (switchingTo) return;
      setErrorMessage(null);
      setSwitchingTo(plan.code);

      try {
        await cancelSubscriptionAsync({
          subscriptionId: subscription.id,
          reason: reason ?? undefined,
          reasonText: reason === 'OTHER' ? otherText.trim() : undefined,
        });

        track('CancelFlow_DownsellAccepted', {
          from_plan: subscription.planCode,
          to_plan: plan.code,
        });

        // The cancel is done and the sheet has nothing left to say: everything
        // after this belongs to the purchase, which gets the same full-screen
        // treatment as a purchase started from the paywall. Leaving the sheet up
        // would park the user on a cancellation flow while their payment sheet
        // opens over it, and drop them back onto it afterwards.
        //
        // Closing here rather than at the end also means the buttons below
        // cannot be pressed again mid-purchase.
        slideOut(onClose);

        const { activated, outcome } = await startCheckout(
          plan.code,
          plan,
          setPurchasePhase,
        );

        // They cancelled the trial, then backed out of the payment sheet.
        //
        // Nothing failed here: the cancellation they came for succeeded, and
        // declining to buy a replacement is a choice, not an error. Treating it
        // as one told the user "couldn't cancel your subscription" about a
        // cancellation that had already gone through — the exact opposite of
        // what happened. Close the sheet on the outcome that actually occurred,
        // and report it as a completed cancellation rather than a save, because
        // no downsell was taken.
        if (outcome.status === 'cancelled') {
          fireTerminalEvent(
            'CancelFlow_Completed',
            {
              reason_code: reason ?? undefined,
              plan_code: subscription.planCode,
              downsell_abandoned: 'true',
            },
            subscription.id,
          );

          Toast.show({
            type: 'info',
            text1: 'Subscription cancelled',
            text2: `You keep access until ${chargeDate}. You can pick a plan any time from Settings.`,
            visibilityTime: 5000,
          });
          return;
        }

        fireTerminalEvent(
          'CancelFlow_Saved',
          {
            reason_code: reason ?? undefined,
            saved_at_step: 'downsell',
            to_plan: plan.code,
          },
          subscription.id,
        );

        Toast.show({
          type: activated ? 'success' : 'info',
          text1: activated ? `Switched to ${plan.name}` : 'Activation pending',
          text2: activated
            ? 'Your new plan is active. Enjoy Canvas.'
            : 'Payment received. We are activating your new plan — please refresh shortly.',
          visibilityTime: activated ? 4000 : 6000,
        });

        // Money moved, whether or not the webhook has landed yet. Either way the
        // plan this screen was rendered from is gone, so hand control back to
        // the caller instead of leaving the user looking at the old one.
        onSwitchedPlan?.();
      } catch (error: unknown) {
        // The trial is already cancelled by the time anything here can fail, and
        // the sheet may already be gone — so this has to be a toast, not inline
        // copy on a step nobody is looking at. Say what actually happened rather
        // than implying nothing did.
        Toast.show({
          type: 'error',
          text1: 'Could not start the new plan',
          text2: `${resolveErrorMessage(
            error,
          )} Your trial is cancelled and you keep access until ${chargeDate}. You can pick a plan any time from Settings.`,
          visibilityTime: 7000,
        });
      } finally {
        setSwitchingTo(null);
        setPurchasePhase('idle');
      }
    },
    [
      cancelSubscriptionAsync,
      chargeDate,
      fireTerminalEvent,
      onClose,
      otherText,
      reason,
      onSwitchedPlan,
      slideOut,
      startCheckout,
      subscription.id,
      subscription.planCode,
      switchingTo,
    ],
  );

  // Deliberately not CancelFlow_Completed: the survey was answered but no
  // subscription was cancelled, and only Apple's notification can tell us if one
  // ever is. Counting it as a completion would overstate churn on iOS.
  const fireDeferredToStore = useCallback(() => {
    fireTerminalEvent(
      'CancelFlow_DeferredToStore',
      { reason_code: reason ?? undefined, plan_code: subscription.planCode },
      subscription.id,
    );
  }, [fireTerminalEvent, reason, subscription.id, subscription.planCode]);

  const handleManageWithApple = useCallback(async () => {
    setErrorMessage(null);
    setOpeningStoreSettings(true);
    try {
      await APPLE_MANAGED_RAIL.cancel({
        subscriptionId: subscription.id,
        reason: reason ?? undefined,
        reasonText: reason === 'OTHER' ? otherText.trim() : undefined,
      });
      fireDeferredToStore();
      // Only on the branch where the sheet actually opened. The caller uses this
      // to start watching for Apple's notification, and arming it anywhere else
      // would leave the screen waiting on a verdict that is never coming.
      onDeferredToStore?.();
      onClose();
    } catch (error) {
      console.warn(
        '[iap] Could not open App Store subscription settings',
        error,
      );
      setErrorMessage(APPLE_SETTINGS_UNAVAILABLE);
    } finally {
      setOpeningStoreSettings(false);
    }
  }, [
    fireDeferredToStore,
    onClose,
    onDeferredToStore,
    otherText,
    reason,
    subscription.id,
  ]);

  const handleAcknowledgeApple = useCallback(() => {
    fireDeferredToStore();
    slideOut(onClose);
  }, [fireDeferredToStore, onClose, slideOut]);

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
            {
              reason_code: reason ?? undefined,
              plan_code: subscription.planCode,
            },
            subscription.id,
          );
          onClose();
        },
        onError: (error: unknown) => {
          // The server refuses an App Store subscription outright, which is the
          // only signal we get when `provider` was missing from GET /me. Swap the
          // step to the Apple copy before anything else, so the sheet can never
          // sit on a confirm screen for a cancellation that will not happen, then
          // send an iOS user on to the only place it can happen. Elsewhere the
          // swapped step already says to do it from an Apple device, so there is
          // nothing left to show as an error.
          if (isAppleManagedCancelError(error)) {
            setRefusedAsAppleManaged(true);
            if (IS_APPLE_RAIL) handleManageWithApple();
            return;
          }
          setErrorMessage(resolveErrorMessage(error));
        },
      },
    );
  }, [
    cancelSubscription,
    fireTerminalEvent,
    handleManageWithApple,
    onClose,
    otherText,
    reason,
    subscription.id,
    subscription.planCode,
  ]);

  const handleBack = useCallback(
    () =>
      setStepIndex(current => {
        const next = Math.max(0, current - 1);
        // 'downsellConfirm' is not a stop on the way out — it is reachable ONLY
        // by choosing a plan on the downsell step. Declining the offer jumps
        // straight to 'confirm', so a plain index-1 back would walk the user
        // into a confirmation for a switch they just turned down.
        if (steps[next] === 'downsellConfirm') return Math.max(0, next - 1);
        return next;
      }),
    [steps],
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
          if (
            gesture.dy > DISMISS_DRAG_DISTANCE ||
            gesture.vy > DISMISS_DRAG_VELOCITY
          ) {
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
    if (currentStep === 'reason') {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryButton, !canContinue && styles.buttonDisabled]}
          onPress={handleContinueFromReason}
          disabled={!canContinue}
        >
          <Text
            style={[
              styles.primaryButtonText,
              !canContinue && styles.buttonTextDisabled,
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>
      );
    }

    if (currentStep === 'save' || currentStep === 'upcoming') {
      // Whether the next screen is the downsell or the confirmation depends on
      // this run's step list, so the label has to follow it — promising "Cancel
      // subscription" and then showing a plan picker would read as a bait.
      const nextIsConfirm = steps[stepIndex + 1] === 'confirm';
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
            onPress={handleAdvance}
          >
            <Text style={styles.ghostButtonText}>
              {nextIsConfirm ? 'Cancel subscription' : 'Continue to cancel'}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    if (isAppleManaged) {
      return (
        <>
          {!!errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryButton}
            onPress={handleSaved}
            disabled={openingStoreSettings}
          >
            <Text style={styles.primaryButtonText}>Keep my subscription</Text>
          </TouchableOpacity>
          {IS_APPLE_RAIL ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.dangerButton,
                openingStoreSettings && styles.buttonDimmed,
              ]}
              onPress={handleManageWithApple}
              disabled={openingStoreSettings}
            >
              {openingStoreSettings ? (
                <ActivityIndicator size="small" color="#ff6b6b" />
              ) : (
                <Text style={styles.dangerButtonText}>Manage in Settings</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.ghostButton}
              onPress={handleAcknowledgeApple}
            >
              <Text style={styles.ghostButtonText}>Got it</Text>
            </TouchableOpacity>
          )}
        </>
      );
    }

    if (currentStep === 'downsell') {
      return (
        <>
          {!!errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
          {/*
            Skips the downsell CONFIRMATION too, not just the offer — this is a
            decision to leave, and handleAdvance would land them on the confirm
            screen for a switch they just declined.
          */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.ghostButton}
            onPress={() => goToStep('confirm')}
          >
            <Text style={styles.ghostButtonText}>No thanks, cancel anyway</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (currentStep === 'downsellConfirm') {
      const busy = !!switchingTo;
      return (
        <>
          {!!errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryButton, busy && styles.buttonDimmed]}
            onPress={() =>
              selectedDownsellPlan && handleChooseDownsell(selectedDownsellPlan)
            }
            disabled={busy || !selectedDownsellPlan}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>Confirm &amp; pay</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.ghostButton, busy && styles.buttonDimmed]}
            onPress={() => goToStep('downsell')}
            disabled={busy}
          >
            <Text style={styles.ghostButtonText}>Choose a different plan</Text>
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
          style={[
            styles.dangerButton,
            (confirmLocked || isPending) && styles.buttonDimmed,
          ]}
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
    <>
      <Modal
        transparent
        visible={mounted}
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleDismiss}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleDismiss}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              { height: sheetHeight, transform: [{ translateY }] },
            ]}
          >
            <View style={styles.handleArea} {...panResponder.panHandlers}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              {stepIndex > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.headerButton}
                  onPress={handleBack}
                >
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

            <ProgressBar index={stepIndex} total={steps.length} />

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              {currentStep === 'reason' && (
                <ReasonStep
                  reasons={reasons}
                  reason={reason}
                  otherText={otherText}
                  onSelectReason={setReason}
                  onChangeOtherText={setOtherText}
                />
              )}

              {currentStep === 'save' && (
                <SaveStep
                  chargeDate={chargeDate}
                  topWatch={topWatch}
                  recommended={recommended}
                />
              )}

              {currentStep === 'upcoming' && (
                <>
                  <StepHeading
                    eyebrow="Still to come"
                    title="Coming soon on Canvas"
                    subtitle="A glimpse of what is next. Your membership keeps the whole library open."
                  />
                  <SubscriptionComingSoon
                    displayUpcoming={displayUpcoming}
                    variant="sheet"
                  />
                </>
              )}

              {currentStep === 'downsell' && (
                <DownsellStep
                  plans={downsellPlans}
                  currentAmount={subscription.amountSnapshot}
                  selected={selectedDownsell}
                  onSelect={setPickedDownsell}
                  onProceed={() => goToStep('downsellConfirm')}
                />
              )}

              {currentStep === 'downsellConfirm' && selectedDownsellPlan && (
                <DownsellConfirmStep
                  plan={selectedDownsellPlan}
                  chargeDate={chargeDate}
                  currentAmount={subscription.amountSnapshot}
                />
              )}

              {currentStep === 'confirm' &&
                (isAppleManaged ? (
                  <AppleManageStep
                    chargeDate={chargeDate}
                    planCode={subscription.planCode}
                  />
                ) : (
                  <ConfirmStep
                    chargeDate={chargeDate}
                    nextChargeAmount={nextChargeAmount}
                    planCode={subscription.planCode}
                  />
                ))}
            </ScrollView>

            <View
              style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}
            >
              {renderFooter()}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/*
        A SEPARATE modal, because it has to outlive the sheet. The purchase runs
        after the cancel sheet has slid away, so an overlay rendered inside that
        modal would vanish exactly when the user needs it — mid-payment, with
        money already committed and nothing on screen to say so.
        Idle renders nothing, so this costs nothing on the Apple path or on a
        plain cancellation.
      */}
      <Modal
        transparent
        visible={purchasePhase !== 'idle'}
        animationType="fade"
        statusBarTranslucent
      >
        <SubscriptionActivatingOverlay phase={purchasePhase} />
      </Modal>
    </>
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
  downsellList: {
    gap: 12,
    marginTop: 4,
  },
  downsellCard: {
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#222',
    padding: 16,
  },
  // The annual card carries the emphasis: a lit border against the monthly
  // card's flat one, so the hierarchy reads even before the buttons are compared.
  downsellCardPrimary: {
    borderColor: '#ff6a00',
    backgroundColor: 'rgba(255, 106, 0, 0.08)',
  },
  downsellCardBusy: {
    borderColor: '#ff6a00',
    opacity: 0.75,
  },
  downsellCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  downsellPlanName: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 16,
    color: '#fff',
  },
  downsellSaveBadge: {
    backgroundColor: '#ff6a00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  downsellSaveBadgeText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 11,
    color: '#000',
  },
  downsellPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  downsellPrice: {
    fontFamily: 'HelveticaNowDisplay-Black',
    fontSize: 28,
    color: '#fff',
  },
  downsellPeriod: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 14,
    color: '#aaa',
    marginLeft: 2,
  },
  downsellPerMonth: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 13,
    color: '#ff6a00',
    marginTop: 2,
  },
  downsellCta: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ff6a00',
    // Border declared on BOTH variants — the secondary only swaps the fill for
    // transparent. Adding the border on the outlined one alone would make it
    // 3px taller than the filled one and the two cards would stop lining up.
    borderWidth: 1.5,
    borderColor: '#ff6a00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Secondary = outlined. Same size and position as the primary so monthly is
  // plainly still available, just not the option being pushed.
  downsellCtaSecondary: {
    backgroundColor: 'transparent',
  },
  downsellCtaText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 14,
    color: '#000',
  },
  downsellCtaTextSecondary: {
    color: '#ff6a00',
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
