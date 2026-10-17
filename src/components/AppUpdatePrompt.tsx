import React from 'react';
import { Linking } from 'react-native';
import { ConfirmationModal } from './ConfirmationModal';
import { useUpdatePromptStore } from '../store/updatePromptStore';
import { appStoreLinks } from '../config/appStore';
import { log } from '../utils/analytics/log';

const openStore = async () => {
  const { native, web } = appStoreLinks();
  try {
    await Linking.openURL(native);
  } catch {
    // No store app to handle the native link (an emulator, a sideloaded build).
    await Linking.openURL(web).catch(() => {});
  }
};

/**
 * Shown whenever the backend answers APP_UPDATE_REQUIRED. Dismissible: only the
 * request that got the answer failed, and the rest of the app keeps working.
 * Mounted once, at the app root.
 */
export default function AppUpdatePrompt() {
  const visible = useUpdatePromptStore(state => state.visible);
  const hide = useUpdatePromptStore(state => state.hide);

  return (
    <ConfirmationModal
      visible={visible}
      onClose={hide}
      onConfirm={() => {
        log.info('Update prompt accepted');
        hide();
        openStore();
      }}
      title="Update Canvas"
      message="This needs the latest version of Canvas. Update from the store to continue."
      confirmText="Update"
      cancelText="Not now"
    />
  );
}
