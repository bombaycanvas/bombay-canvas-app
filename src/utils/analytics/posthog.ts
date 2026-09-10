import PostHog from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_API_HOST } from '@env';

// PostHog (product analytics) provider.
//
// Sits alongside `meta.ts` and answers a DIFFERENT question. Meta's Conversions
// API exists to feed ad-set optimisation; PostHog exists to answer "where do
// people drop out of onboarding" and "do trial users come back on day 7".
// Neither replaces the other. Feature code talks to neither directly — it
// imports `track()` from `./index`, which fans out to both.
//
// WHY A STANDALONE CLIENT AND NOT `usePostHog()`. Most tracking in this app is
// fired from plain modules, not components: the navigation container in
// `routes.tsx`, the checkout hook, the auth store. A context hook is unreachable
// from all of them. So the client is constructed HERE, at module scope, and
// handed to <PostHogProvider client={...}> in App.tsx — the provider then serves
// this same instance to `usePostHog()`. Letting the provider build its own from
// an `apiKey` prop instead would create a SECOND client with its own session and
// its own distinct_id, and the two would disagree about who the user is.
//
// Resilience contract, identical to `meta.ts`: EVERY export here is fail-soft
// and NEVER throws. Analytics is not allowed to break playback, checkout or
// login. A missing API key is a supported state, not an error — the client is
// constructed `disabled`, so a dev box with no PostHog credentials behaves
// exactly like production minus the reporting.
//
// Never put raw PII in EVENT properties. `identify` takes an email because a
// PostHog person profile is the one place it is legitimately useful (and can be
// deleted on request); events are not that place.

// `react-native-dotenv` runs with `allowUndefined: true`, so an absent var
// arrives as `undefined` rather than failing the bundle. Trimmed because a
// trailing space or newline in `.env` is truthy enough to pass a bare check and
// then 401 on every request.
const apiKey = (POSTHOG_API_KEY || '').trim();

// Region-correct fallback: this project is on PostHog's US cloud. The EU cloud
// is a different ingestion host that accepts nothing for a US project key, so
// getting this wrong fails silently rather than loudly.
const host = (POSTHOG_API_HOST || '').trim() || 'https://us.i.posthog.com';

/**
 * The one PostHog client for the whole app.
 *
 * Always a real instance — never null — so `App.tsx` can hand it to the provider
 * unconditionally. With no API key it is constructed `disabled`, which makes
 * every call below a no-op inside the SDK.
 */
export const posthog = new PostHog(apiKey, {
  host,
  disabled: !apiKey,

  // Free, high-signal, and impossible to reconstruct later: install, update,
  // open and background. Retention and "did the update actually ship" both
  // depend on these, and they cost a handful of events per session.
  captureAppLifecycleEvents: true,

  // Session replay. Note this flag alone is NOT enough: the SDK reads
  // `recordingActive` from PostHog's REMOTE CONFIG, so replay also has to be
  // switched on in the project's own Session Replay settings. If it is off
  // there, this stays dormant and silent.
  //
  // It needs the `posthog-react-native-session-replay` native module, so a JS
  // reload will not turn it on — the app has to be rebuilt (and `pod install`
  // run for iOS).
  //
  // COST: replay is billed separately from events and is by far the most
  // expensive thing here. A full-bleed video player changes every frame, which
  // is the worst case for a screenshot-based recorder. Control this with
  // SAMPLING in the PostHog project settings (record 10-20% of sessions, not
  // 100%) rather than by lowering the throttle below.
  enableSessionReplay: true,
  sessionReplayConfig: {
    // All three default to true. They are restated explicitly because they are
    // the privacy contract, and a future edit that flips one should have to do
    // it deliberately rather than by deleting a line.
    maskAllTextInputs: false, // email, password, OTP, card fields
    maskAllImages: false, // includes user avatars, not just catalogue art
    maskAllSandboxedViews: false, // iOS photo/contact pickers

    // OFF, unlike the default. Replay would otherwise ship every console line
    // to PostHog, and this app logs raw error payloads — `VideoPlayer`'s
    // `console.log('Video Error:', e)` can carry a SIGNED playback URL. Piping
    // those into a third party is a content-leak, not just noise. Turn this on
    // only after auditing what the app logs.
    captureLog: false,

    // 2x the 1000ms default. A playing video changes continuously, so the
    // recorder would otherwise take a screenshot every second for the whole
    // watch session — ~1800 for a 30-minute episode. Halving that costs
    // nothing for understanding navigation and interaction.
    throttleDelayMs: 2000,
  },

  // A session that survives the app being backgrounded is the same viewing
  // session to a human, so it should be one session in the funnel too.
  enablePersistSessionIdAcrossRestart: true,
});

/** Event properties. Closed on purpose — no nested objects, so a whole API
 *  response cannot be spilled into an event by accident. */
export type EventProperties = Record<string, string | number | boolean>;

/** Person properties. Wider than event properties: booleans and explicit nulls
 *  are meaningful on a profile ("phone: null") where on an event they are noise. */
export type PersonProperties = Record<string, string | number | boolean | null>;

/** Record a product event. */
export const capture = (
  eventName: string,
  properties?: EventProperties,
): void => {
  try {
    posthog.capture(eventName, properties);
  } catch (err) {
    console.warn('[analytics] PostHog capture failed', eventName, err);
  }
};

/** Record a screen view ($screen) — PostHog's first-class screen event, which
 *  its path and funnel tools read and which a plain custom event is invisible to. */
export const screen = (
  screenName: string,
  properties?: EventProperties,
): void => {
  try {
    posthog.screen(screenName, properties);
  } catch (err) {
    console.warn('[analytics] PostHog screen failed', screenName, err);
  }
};

/**
 * Bind this device to a known user.
 *
 * `distinctId` MUST be the backend `User.id` on every platform. It is the only
 * value the app, the web client and the server all agree on; anything else (an
 * email, a device id, a Razorpay customer id) splits one human into several
 * PostHog persons and quietly invalidates every funnel and retention number.
 *
 * Re-identifying with the id PostHog already holds is skipped. The auth store
 * rehydrates `user` from AsyncStorage on every cold start, and PostHog persists
 * `distinct_id` across restarts itself — without this guard every launch would
 * bill for an $identify that changes nothing.
 */
export const identify = (
  distinctId: string,
  properties?: PersonProperties,
): void => {
  try {
    if (!distinctId) return;
    if (posthog.getDistinctId() === distinctId) return;

    posthog.identify(distinctId, properties);
  } catch (err) {
    console.warn('[analytics] PostHog identify failed', err);
  }
};

/**
 * Unbind the current user. MUST be called on logout.
 *
 * Without it the next person to sign in on this device inherits the previous
 * user's `distinct_id` and their events are attributed to someone else — a
 * correctness bug and a privacy one, which is why this is not optional.
 */
export const reset = (): void => {
  try {
    posthog.reset();
  } catch (err) {
    console.warn('[analytics] PostHog reset failed', err);
  }
};
