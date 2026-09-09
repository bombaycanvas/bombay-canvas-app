// Analytics entry point. Feature code imports from HERE and nowhere else.
//
//   import { track, capture } from '../utils/analytics';
//
// Two verbs, and the difference matters:
//
//   track()    Dual-provider. Goes to Meta AND PostHog. Reserve it for the
//              handful of events Meta actually optimises ad delivery on
//              (ViewContent, InitiateCheckout, StartTrial, Subscribe) — the
//              names come from Meta's fixed standard list, and `events.ts`
//              translates each one into product-shaped PostHog naming.
//
//   capture()  PostHog only. For everything Meta has no use for: playback,
//              paywall, search, and the rest of the product funnel. Sending
//              these to Meta would register them as CUSTOM events that no ad set
//              optimises for — pure noise in Events Manager, and it dilutes the
//              signal on the four names that do matter.
//
// Adding a THIRD provider later is a change to this file alone; that is the
// whole point of routing every call site through one seam.

import { track as trackMeta } from './meta';
import { capture as capturePostHog, screen as screenPostHog } from './posthog';
import { mapEvent, type TrackParams } from './events';

export { initMetaSdk } from './meta';
export { getAppDataHeader } from './appData';
export {
  posthog,
  identify as identifyUser,
  reset as resetAnalytics,
  type EventProperties,
  type PersonProperties,
} from './posthog';

/**
 * Record an event on BOTH providers.
 *
 * Meta receives `eventName` verbatim — its standard-event vocabulary is fixed
 * and renaming would break ad attribution. PostHog receives the translated name
 * from `events.ts`.
 *
 * Never throws: both providers are individually fail-soft, and a failure in one
 * cannot stop the other from reporting.
 *
 * @param eventName standard Meta event name, e.g. "InitiateCheckout"
 * @param params event parameters (value in RUPEES, currency "INR")
 * @param eventId dedup key shared with the server-side event
 */
export const track = (
  eventName: string,
  params?: TrackParams,
  eventId?: string,
): void => {
  trackMeta(eventName, params, eventId);

  const target = mapEvent(eventName, params, eventId);

  if (target.kind === 'screen') {
    screenPostHog(target.name, target.properties);
    return;
  }

  capturePostHog(target.name, target.properties);
};

/**
 * Record a product event on PostHog ONLY.
 *
 * Takes an already-final snake_case name — these events have no Meta
 * counterpart, so there is nothing to translate and no mapping table to keep in
 * sync. Names live in `productEvents.ts`.
 */
export { capture } from './posthog';
export * from './productEvents';
