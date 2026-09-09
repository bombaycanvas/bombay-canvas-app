// Analytics taxonomy — the single place a call-site event name becomes a
// PostHog event name.
//
// WHY THIS FILE EXISTS. Every pre-existing `track()` call in this app uses
// META's vocabulary ("InitiateCheckout", "StartTrial", "Subscribe"), because
// Meta only optimises ad delivery for names drawn from its own standard list.
// PostHog has the opposite convention — snake_case, past tense, product-shaped
// ("checkout_started"). Sending Meta's names straight through would leave the
// product analytics reading like an ad-tech console forever; renaming the call
// sites would break ad attribution. The two vocabularies are reconciled HERE,
// at the seam, rather than inside either provider.
//
// UNKNOWN NAMES ARE FORWARDED, NOT DROPPED. `EXPLICIT_NAMES` covers only the
// events whose PostHog name should differ from a mechanical transliteration;
// everything else falls through to `toSnakeCase`. This is deliberate: the cancel
// flow fires its terminal events through a DYNAMIC name
// (`CancelSubscriptionFlow.tsx` -> `fireTerminalEvent(name, ...)`), so a closed
// map would silently drop `CancelFlow_Saved` / `CancelFlow_Abandoned` and nobody
// would notice until a churn question needed them. An awkward auto-generated
// name is a far cheaper failure than a missing event.
//
// Pure module: no SDK import, no I/O, no side effects — trivially testable, and
// it can never be the reason analytics breaks a screen.

import type { EventProperties } from './posthog';

/** The parameter shape every existing `track()` call site already uses. */
export type TrackParams =
  | {
      value?: number;
      currency?: string;
      [key: string]: string | number | boolean | undefined;
    }
  | undefined;

/**
 * Where a translated event should land.
 *
 * `screen` maps to `posthog.screen()` rather than `capture()`: PostHog treats
 * screen views as a first-class event type that powers its path and funnel
 * tools, which a screen recorded as an ordinary custom event is invisible to.
 */
export type PostHogTarget =
  | { kind: 'screen'; name: string; properties: EventProperties }
  | { kind: 'capture'; name: string; properties: EventProperties };

/** The call-site name that means "a screen was shown". */
const PAGE_VIEW = 'PageView';

/** Screen name reported when a navigation event arrives without one. */
const UNKNOWN_SCREEN = 'Unknown';

/**
 * Names whose PostHog spelling is a genuine RENAME, not a transliteration.
 *
 * Keep this list short. An entry earns its place only when the mechanical
 * snake_case form would be actively misleading in a funnel — "Subscribe" reads
 * as an imperative (a button), "subscription_started" reads as the thing that
 * happened.
 */
const EXPLICIT_NAMES: Readonly<Record<string, string>> = {
  ViewContent: 'content_viewed',
  InitiateCheckout: 'checkout_started',
  StartTrial: 'trial_started',
  Subscribe: 'subscription_started',
};

/**
 * "CancelFlow_ReachedConfirm" -> "cancel_flow_reached_confirm".
 *
 * Splits camelCase boundaries first, then collapses every run of
 * non-alphanumeric characters into a single underscore, so both naming styles
 * already in use (PascalCase and Pascal_Snake) converge on one convention.
 */
export const toSnakeCase = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

/**
 * Drop `undefined` params and attach the dedup key.
 *
 * `eventId` is Meta's deduplication key — the natural id the BACKEND reports the
 * same conversion under (a Razorpay payment id, an Apple transaction id). It
 * means nothing to PostHog's counterpart, but it is the only column that lets a
 * PostHog funnel be joined back to a real payment row, so it rides along as an
 * ordinary property.
 */
const buildProperties = (
  params: TrackParams,
  eventId?: string,
): EventProperties => {
  const properties: EventProperties = {};

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) continue;
    properties[key] = value;
  }

  if (eventId) properties.dedup_key = eventId;

  return properties;
};

/**
 * Translate one call-site event into its PostHog form.
 *
 * Never throws, and always returns a target: an event with a surprising name is
 * recoverable, a swallowed event is not.
 */
export const mapEvent = (
  eventName: string,
  params?: TrackParams,
  eventId?: string,
): PostHogTarget => {
  const properties = buildProperties(params, eventId);

  if (eventName === PAGE_VIEW) {
    // The screen name is the event's IDENTITY in PostHog, not one of its
    // properties — carrying it in both places would double-count it in every
    // breakdown.
    const { screen, ...rest } = properties;
    return {
      kind: 'screen',
      name: typeof screen === 'string' && screen ? screen : UNKNOWN_SCREEN,
      properties: rest,
    };
  }

  return {
    kind: 'capture',
    name: EXPLICIT_NAMES[eventName] ?? toSnakeCase(eventName),
    properties,
  };
};
