import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { APPLE_APP_STORE_ID } from '@env';

/** Where to send the user to update this app: the native store link first, then the web page. */
export const appStoreLinks = (): { native: string; web: string } => {
  if (Platform.OS === 'android') {
    const packageName = DeviceInfo.getBundleId();
    return {
      native: `market://details?id=${packageName}`,
      web: `https://play.google.com/store/apps/details?id=${packageName}`,
    };
  }
  // The App Store addresses apps by their numeric id, which only App Store
  // Connect knows; without it, the web search still finds the app.
  return APPLE_APP_STORE_ID
    ? {
        native: `itms-apps://apps.apple.com/app/id${APPLE_APP_STORE_ID}`,
        web: `https://apps.apple.com/app/id${APPLE_APP_STORE_ID}`,
      }
    : {
        native: 'https://apps.apple.com/search?term=Bombay%20Canvas',
        web: 'https://apps.apple.com/search?term=Bombay%20Canvas',
      };
};
