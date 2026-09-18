// Product event names and the pure logic behind them.
//
// PostHog-only. These have no Meta counterpart, so they are written in their
// final snake_case form and go out through `capture()`, not `track()`.
//
// WHY CONSTANTS AND NOT STRING LITERALS AT THE CALL SITE. A typo'd event name is
// not rejected by PostHog — it silently creates a NEW event that no insight,
// funnel or dashboard is watching, and the gap only surfaces weeks later when
// someone asks a question the data cannot answer. `metaEvents.service.ts` in the
// backend calls out the identical trap for Meta. One spelling, one place.
//
// Pure module: no SDK import, no I/O. The milestone logic below is the part most
// worth getting right, so it is kept independently testable.

export const ProductEvent = {
  /** A video element actually began playing (media loaded, not merely opened). */
  VideoPlaybackStarted: 'video_playback_started',
  /** A 25 / 50 / 75% milestone was crossed. See PROGRESS_MILESTONES. */
  VideoProgress: 'video_progress',
  /** Playback reached the end of the episode. */
  VideoCompleted: 'video_completed',
  /** The player surfaced an error to the user. */
  VideoPlaybackFailed: 'video_playback_failed',
  /** Locked content asked to be paid for. */
  PaywallOpened: 'paywall_opened',
  /** A debounced search settled and produced (or failed to produce) results. */
  SearchPerformed: 'search_performed',

  /** An OTP was successfully sent — the first half of the phone funnel. */
  OtpRequested: 'otp_requested',
  /** Credentials were accepted and a session began. Carries `method`. */
  SignedIn: 'signed_in',
  /** A NEW account was created. See AuthMethod for why this is email-only. */
  SignedUp: 'signed_up',
  /** An auth attempt was rejected. Carries `method` and `stage`. */
  AuthFailed: 'auth_failed',

  /** The user deleted their account. Fired BEFORE logout resets identity. */
  AccountDeleted: 'account_deleted',
  /** A subscription cancellation the SERVER confirmed. See PaymentRailName. */
  SubscriptionCancelled: 'subscription_cancelled',
} as const;

/**
 * Which billing rail a purchase or subscription belongs to.
 *
 * Worth carrying on every money event because the two behave nothing alike:
 * Razorpay cancels immediately and server-side, while Apple can only open the
 * system sheet and our server does not learn the outcome until Apple's
 * notification lands. Mixing them in one funnel without this property makes iOS
 * look like it silently loses cancellations.
 */
export type PaymentRailName = 'razorpay' | 'apple';

/**
 * How the user authenticated.
 *
 * WHY `signed_up` IS ONLY EVER REPORTED FOR 'email'. Google, Apple and phone all
 * create the account on first use, and their endpoints answer `{ token, user }`
 * with NO `isNewUser` flag — the backend documents this explicitly in
 * `auth.controller.ts` (`fireCompleteRegistration`) as the reason it fires
 * Meta's CompleteRegistration server-side instead. Guessing on the client would
 * count every returning Google login as a fresh registration and inflate signups
 * permanently. Only `/api/auth/signup` is unambiguous, so only it reports
 * `signed_up`; everything else reports `signed_in` and lets PostHog's own
 * first-seen date carry the "new person" question.
 */
export type AuthMethod = 'email' | 'google' | 'apple' | 'phone_otp';

/** Which step of an auth flow failed — the two phone steps fail very differently. */
export type AuthStage = 'otp_request' | 'otp_verify' | 'login' | 'signup';

/**
 * Reduce a thrown auth error to a short, safe reason string.
 *
 * Server messages here are operational ("Email already registered", "Invalid
 * credentials") and are the whole point of the event — they separate "our Google
 * integration is broken on this device" from "people are mistyping passwords".
 * Capped so a stack trace or an HTML error page cannot become an event property.
 */
export const authFailureReason = (error: unknown): string => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : '';

  return (message.trim() || 'unknown').slice(0, 100);
};

export type ProductEventName =
  (typeof ProductEvent)[keyof typeof ProductEvent];

/**
 * Percentages at which a `video_progress` event fires — at most once each, per
 * episode, per mount.
 *
 * DELIBERATELY NOT A HEARTBEAT. `VideoPlayer.reportProgress` already writes
 * progress to our own backend every 5–15 seconds, and mirroring that cadence
 * into PostHog would bill ~180 events for a single 30-minute episode. PostHog
 * prices per event, so on an OTT catalogue that is the difference between a
 * manageable bill and a five-figure one. Three milestones answer the same drop-off
 * question for ~2% of the volume.
 *
 * 100% is absent on purpose: completion is reported by `VideoCompleted` from the
 * player's `onEnd`, and having both would double-count every finished episode.
 */
export const PROGRESS_MILESTONES = [25, 50, 75] as const;

/**
 * Milestones newly crossed at `pct`, given those already reported.
 *
 * Returns every un-fired milestone at or below `pct`, not just the nearest one,
 * so a seek from 10% to 80% still reports 25 and 50 rather than silently losing
 * them. Callers add the result to `fired` — this function is pure and does not
 * track state itself.
 */
export const newMilestones = (
  pct: number,
  fired: ReadonlySet<number>,
): number[] => {
  if (!Number.isFinite(pct)) return [];
  return PROGRESS_MILESTONES.filter(
    milestone => pct >= milestone && !fired.has(milestone),
  );
};
