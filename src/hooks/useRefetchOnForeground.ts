import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

/**
 * Run `onForeground` each time the app comes back to the front.
 *
 * Screen focus cannot cover anything the user changes OUTSIDE the app. The App
 * Store subscription sheet leaves the screen mounted and focused, so React
 * Navigation never fires and the screen redraws whatever it already had. The
 * app becoming active again is the one event that does happen, so it is the
 * only reliable place to re-read state the store may have changed.
 */
export const useRefetchOnForeground = (onForeground: () => void) => {
  // Held in a ref so passing an inline arrow does not tear down and reinstall
  // the listener on every render.
  const callback = useRef(onForeground);
  callback.current = onForeground;

  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState;

    const subscription = AppState.addEventListener('change', next => {
      // Only the background/inactive -> active edge. iOS also emits `inactive`
      // on its way out and during a system sheet, and firing on those would
      // refetch while the user is still inside the App Store.
      const returned =
        (previous === 'background' || previous === 'inactive') &&
        next === 'active';
      previous = next;
      if (returned) callback.current();
    });

    return () => subscription.remove();
  }, []);
};
