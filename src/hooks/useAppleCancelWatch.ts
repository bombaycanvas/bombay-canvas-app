import { useCallback, useEffect, useRef, useState } from 'react';
import { useRefetchOnForeground } from './useRefetchOnForeground';

const POLL_INTERVAL_MS = 2000;
const POLL_WINDOW_MS = 30000;

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
 * Apple tells the app nothing about what happened inside that sheet. The only
 * signal is the DID_CHANGE_RENEWAL_STATUS notification Apple posts to the
 * backend, which arrives seconds to minutes later — so a single refetch when
 * the sheet closes is a race the app loses, reading the old row and redrawing
 * "Active" as if nothing happened.
 *
 * Polling starts when the app returns to the FRONT rather than when the sheet
 * opens: iOS suspends JS timers in the background, so a timer armed before the
 * sheet would not have been ticking anyway.
 */
export const useAppleCancelWatch = ({
  settled,
  refetch,
}: AppleCancelWatchOptions) => {
  const [isWatching, setIsWatching] = useState(false);

  // Refs, not state: neither value should re-render anything on its own, and
  // arming must not restart a window that is already running.
  const pending = useRef(false);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  /** Call once the App Store sheet has actually been opened. */
  const arm = useCallback(() => {
    pending.current = true;
  }, []);

  useRefetchOnForeground(
    useCallback(() => {
      if (!pending.current) return;
      // Consumed on the first return, so a user who never touched anything in
      // the sheet does not re-poll on every foreground for the rest of the
      // session.
      pending.current = false;
      setIsWatching(true);
    }, []),
  );

  // The notification landed. Stop early rather than run the window out.
  useEffect(() => {
    if (!settled) return;
    pending.current = false;
    setIsWatching(false);
  }, [settled]);

  useEffect(() => {
    if (!isWatching) return;

    const stopAt = Date.now() + POLL_WINDOW_MS;
    refetchRef.current();

    const timer = setInterval(() => {
      if (Date.now() >= stopAt) {
        // Apple can take longer than this. Giving up on the spinner is not
        // giving up on the answer: the next screen focus or foreground refetch
        // still picks it up, and the card is correct the moment it does.
        console.log('[iap] Cancel watch timed out without a verdict');
        setIsWatching(false);
        return;
      }
      refetchRef.current();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isWatching]);

  return { isWatching, arm };
};
