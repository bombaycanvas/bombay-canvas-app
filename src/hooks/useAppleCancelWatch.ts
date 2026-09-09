import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 2000;
const POLL_WINDOW_MS = 30000;

/** What the card should be saying while we wait on the server. */
export type CancelWatchPhase = 'idle' | 'watching' | 'timedOut';

interface AppleCancelWatchOptions {
  /** True once the server has recorded the cancellation. Ends the watch. */
  settled: boolean;
  /** Re-reads the subscription. Called once per poll. */
  refetch: () => void;
}

/**
 * Bridges the gap between "the user switched renewal off in Apple's sheet" and
 * "our server knows about it".
 *
 * Apple's only report to the backend is the DID_CHANGE_RENEWAL_STATUS
 * notification, which arrives seconds to minutes after the sheet closes — so a
 * single refetch on dismissal is a race the app loses, reading the old row and
 * redrawing "Active" as if nothing happened.
 *
 * The watch therefore starts on `arm()`, which the caller fires the moment the
 * sheet resolves. It deliberately does NOT wait for the app to return to the
 * foreground: showManageSubscriptions presents INSIDE the app, so the
 * background -> active transition never happens and a foreground-gated watch
 * would never run at all.
 */
export const useAppleCancelWatch = ({
  settled,
  refetch,
}: AppleCancelWatchOptions) => {
  const [phase, setPhase] = useState<CancelWatchPhase>('idle');
  // What StoreKit itself said when the sheet closed. Drives copy only: it tells
  // the user whether Apple has already accepted the cancellation, which is a
  // different statement from "your account is updated".
  const [confirmedByStore, setConfirmedByStore] = useState(false);
  const [watchUntil, setWatchUntil] = useState<number | null>(null);

  // A ref so a fresh inline `refetch` on every render does not restart the
  // window that is already running.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  /**
   * Call when the App Store sheet has CLOSED.
   *
   * Polls regardless of `renewalTurnedOff`: the flag is StoreKit's read of local
   * renewal info and is only ever used for wording, so treating a `false` as
   * "nothing to wait for" would put the old silent-failure back if that read is
   * ever wrong.
   */
  const arm = useCallback((renewalTurnedOff: boolean) => {
    console.log('[iap] Cancel watch armed', { renewalTurnedOff });
    setConfirmedByStore(renewalTurnedOff);
    setPhase('watching');
    setWatchUntil(Date.now() + POLL_WINDOW_MS);
  }, []);

  // The notification landed. Stop early rather than run the window out.
  useEffect(() => {
    if (!settled) return;
    setPhase('idle');
    setWatchUntil(null);
  }, [settled]);

  useEffect(() => {
    if (watchUntil === null) return;

    refetchRef.current();

    const timer = setInterval(() => {
      if (Date.now() >= watchUntil) {
        // Apple can take longer than this. Giving up on the spinner is not
        // giving up on the answer: the next screen focus or foreground refetch
        // still picks it up, and the card is correct the moment it does. The
        // user is told that rather than left with a control that silently
        // stopped moving.
        console.log('[iap] Cancel watch timed out without a verdict');
        setPhase('timedOut');
        setWatchUntil(null);
        return;
      }
      refetchRef.current();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [watchUntil]);

  return { phase, confirmedByStore, arm };
};
