import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useDeleteUserAccount } from '../api/auth';
import {
  useMySubscription,
  useSubscriptionHistory,
  isSubscriptionActive,
} from '../api/subscription';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import CancelSubscriptionFlow from '../components/subscription/CancelSubscriptionFlow';
import SubscriptionDetailsCard from '../components/subscription/SubscriptionDetailsCard';
import BillingHistoryList from '../components/subscription/BillingHistoryList';
import { useAppleCancelWatch } from '../hooks/useAppleCancelWatch';
import { useRefetchOnForeground } from '../hooks/useRefetchOnForeground';

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const [isDeleteAccountModal, setIsDeleteAccountModal] = useState(false);
  const [isCancelSubModal, setIsCancelSubModal] = useState(false);
  const [isBillingExpanded, setIsBillingExpanded] = useState(false);

  const { mutate: deleteAccount, isPending } = useDeleteUserAccount();
  const { data: subscription, refetch } = useMySubscription();
  const {
    data: charges,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useSubscriptionHistory();

  const refetchBilling = useCallback(() => {
    refetch();
    refetchHistory();
  }, [refetch, refetchHistory]);

  useFocusEffect(refetchBilling);

  // Screen focus never fires for the App Store subscription sheet — it leaves
  // this screen mounted and focused — so the same read is repeated on the one
  // event that does happen when the user comes back.
  useRefetchOnForeground(refetchBilling);

  const { isWatching: isConfirmingCancel, arm: armCancelWatch } =
    useAppleCancelWatch({
      settled: !!subscription?.cancelAtPeriodEnd,
      refetch,
    });
  const handleOpenURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
      Alert.alert('Error', 'Something went wrong while opening the link');
    }
  };

  const handleOpenModal = () => {
    setIsDeleteAccountModal(true);
  };

  const handleCloseModal = () => {
    setIsDeleteAccountModal(false);
  };

  const handleConfirmDeleteAccount = () => {
    deleteAccount(undefined, {
      onSuccess: () => {
        setIsDeleteAccountModal(false);
        Alert.alert(
          'Account Deleted',
          'Your account has been deleted successfully.',
        );
      },
      onError: () => {
        setIsDeleteAccountModal(false);
        Alert.alert(
          'Error',
          'Something went wrong while deleting your account.',
        );
      },
    });
  };

  // Single definition of "entitled right now" — shared with the paywall so the
  // two surfaces can never disagree about whether this user is subscribed.
  const isActive = isSubscriptionActive(subscription);

  // A subscribed user expands the panel in place; everyone else still goes to
  // the paywall, which is the only action available to them.
  const handleBillingPress = () => {
    if (!isActive) {
      navigation.navigate('SubscriptionScreen', { fromGeneral: true });
      return;
    }
    setIsBillingExpanded(open => !open);
  };

  // Chevron rotation only. LayoutAnimation is deliberately not used: this app
  // runs the New Architecture (newArchEnabled=true), where it is unsupported and
  // would silently no-op on Android, and reanimated is not a direct dependency.
  const chevronSpin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(chevronSpin, {
      toValue: isBillingExpanded ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [chevronSpin, isBillingExpanded]);
  const chevronRotation = chevronSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.row}
          onPress={() => handleOpenURL('https://canvasott.com/privacy-policy')}
        >
          <Text style={styles.rowLabel}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.row}
          onPress={() =>
            handleOpenURL('https://canvasott.com/terms-and-condition')
          }
        >
          <Text style={styles.rowLabel}>Terms of Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.row}
          onPress={handleBillingPress}
          accessibilityRole="button"
          accessibilityState={isActive ? { expanded: isBillingExpanded } : {}}
        >
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Subscription & Billing</Text>
            <View style={styles.infoRowRight}>
              <Text style={[styles.infoValue, isActive && styles.activeValue]}>
                {isActive ? 'Active' : 'Subscribe'}
              </Text>
              {isActive && (
                <Animated.View
                  style={{ transform: [{ rotate: chevronRotation }] }}
                >
                  <ChevronRight size={18} color="#888" />
                </Animated.View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {isActive && isBillingExpanded && subscription && (
          <View style={styles.billingPanel}>
            <SubscriptionDetailsCard
              subscription={subscription}
              onCancelPress={() => setIsCancelSubModal(true)}
              confirmingCancel={isConfirmingCancel}
            />
            <BillingHistoryList charges={charges} loading={isHistoryLoading} />
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.row}
          onPress={handleOpenModal}
        >
          <Text style={styles.rowLabel}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {subscription && (
        <CancelSubscriptionFlow
          visible={isCancelSubModal}
          onClose={() => setIsCancelSubModal(false)}
          subscription={subscription}
          onDeferredToStore={armCancelWatch}
        />
      )}

      <Modal
        transparent={true}
        visible={isDeleteAccountModal}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Are you sure?</Text>
            <Text style={styles.modalText}>
              Do you really want to delete your account?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleConfirmDeleteAccount}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 10,
  },
  section: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  rowLabel: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 16,
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoValue: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 14,
    color: '#ff6a00',
  },
  activeValue: {
    color: '#4cd964',
  },
  infoRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Indented with a left accent rail so the panel reads as belonging to the
  // Subscription & Billing row above it rather than as another settings entry.
  billingPanel: {
    marginLeft: 20,
    paddingLeft: 16,
    paddingRight: 20,
    paddingVertical: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255, 106, 0, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 20,
    color: '#fff',
    marginBottom: 10,
  },
  modalText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  cancelText: {
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  deleteText: {
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
});

export default SettingsScreen;
