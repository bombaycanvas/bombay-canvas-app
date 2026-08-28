import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLink } from 'react-native-fbsdk-next';
import {
  getActionFromState,
  type NavigationContainerRef,
} from '@react-navigation/native';
import { linking, pathFromDeepLink, getStateFromPath } from '../routes/linking';
import type { RootStackParamList } from '../routes/routes';
import { initMetaSdk } from './analytics';

// Meta hands the deferred link over exactly once, on the first launch after an
// ad-driven install. Anything after that is a normal deep link.
const CHECKED_KEY = '@meta/deferred_deep_link_checked';

const fetchDeferredLink = async (): Promise<string | null> => {
  const alreadyChecked = await AsyncStorage.getItem(CHECKED_KEY);
  if (alreadyChecked) {
    return null;
  }

  await initMetaSdk();
  const url = await AppLink.fetchDeferredAppLink();
  await AsyncStorage.setItem(CHECKED_KEY, '1');
  console.log('[deeplink] deferred link fetched', { url });
  return url ?? null;
};

export const routeDeferredDeepLink = async (
  navigationRef: NavigationContainerRef<RootStackParamList>,
): Promise<void> => {
  try {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      console.log('[deeplink] opened with a direct link, skipping deferred', {
        initialUrl,
      });
      return;
    }

    const url = await fetchDeferredLink();
    if (!url || !navigationRef.isReady()) {
      return;
    }

    const path = pathFromDeepLink(url);
    const state = path ? getStateFromPath(path, linking.config) : undefined;
    if (!state) {
      console.warn('[deeplink] deferred link has no matching route', { url });
      return;
    }

    const action = getActionFromState(state, linking.config);
    console.log('[deeplink] routing deferred link', { path });

    if (action) {
      navigationRef.dispatch(action);
    } else {
      navigationRef.resetRoot(state);
    }
  } catch (err) {
    console.warn('[deeplink] deferred link handling failed', err);
  }
};
