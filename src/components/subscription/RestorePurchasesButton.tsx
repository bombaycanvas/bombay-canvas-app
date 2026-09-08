import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { invalidateEntitlementQueries } from '../../api/subscription';
import { getPaymentRail } from '../../services/paymentRail';
import { IS_APPLE_RAIL } from '../../utils/paymentRail';
import {
  readAppleOwnershipConflict,
  setAppleOwnershipConflict,
} from './appleOwnershipConflict';

// The App Store requires a visible restore control on any paywall, and it is
// also the user-facing half of the silent claim that runs at launch: a
// subscription bought from the App Store product page carries no
// appAccountToken, so replaying the store's own receipts is the only way it can
// ever reach this account.
//
// It goes through the SAME rail adapter the launch sync uses. Calling the store
// and the link endpoint directly from here worked, but it skipped the ownership
// verdict entirely — so the notice this button sits under could never be
// cleared by pressing it, and a refused restore reported itself as "nothing
// found".
/** The App-Store-mandated restore control. Renders nothing off the Apple rail. */
export default function RestorePurchasesButton() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!IS_APPLE_RAIL) return null;

  const restore = async () => {
    setBusy(true);
    try {
      const restored = await getPaymentRail().restore();
      const conflict = readAppleOwnershipConflict(restored);
      const granted = restored.some(transaction => transaction.linked);

      setAppleOwnershipConflict(queryClient, conflict);
      invalidateEntitlementQueries(queryClient);

      console.log('[iap] Restore purchases completed', {
        submitted: restored.length,
        granted,
        conflict: conflict?.transactionId ?? null,
      });

      if (granted) {
        Toast.show({
          type: 'success',
          text1: 'Purchases Restored',
          text2: 'Your Canvas Premium subscription is active on this account.',
          visibilityTime: 6000,
        });
        return;
      }

      // The distinction this branch exists for. "Nothing to restore" and "we
      // found it and are not allowed to give it to you" look identical in a
      // count of what was granted, and telling someone we found nothing when
      // their Apple ID is visibly paying is the one message that guarantees a
      // support ticket.
      if (conflict) {
        Toast.show({
          type: 'info',
          text1: 'Already Linked Elsewhere',
          text2:
            "This Apple ID's subscription belongs to a different Canvas account. Sign in with that account to use it.",
          visibilityTime: 8000,
        });
        return;
      }

      Toast.show({
        type: 'info',
        text1: 'Nothing to Restore',
        text2: 'We found no App Store subscription for this Apple ID.',
      });
    } catch (error) {
      console.warn('[iap] Restore purchases failed', error);
      Toast.show({
        type: 'error',
        text1: 'Restore Failed',
        text2: 'We could not reach the App Store. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.button}
      onPress={restore}
      disabled={busy}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#aaa" />
      ) : (
        <Text style={styles.label}>Restore Purchases</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    textDecorationLine: 'underline',
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
});
