import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useDeleteUserAccount } from '../api/auth';
import { useMySubscription, useCancelSubscription } from '../api/subscription';
import { useFocusEffect } from '@react-navigation/native';

const SettingsScreen = () => {
  const [isDeleteAccountModal, setIsDeleteAccountModal] = useState(false);
  const [isCancelSubModal, setIsCancelSubModal] = useState(false);

  const { mutate: deleteAccount, isPending } = useDeleteUserAccount();
  const { data: subscription, refetch } = useMySubscription();
  const { mutate: cancelSub, isPending: isCancelPending } = useCancelSubscription();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
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

  const handleConfirmCancelSubscription = () => {
    if (!subscription?.id) return;
    cancelSub(subscription.id, {
      onSuccess: () => {
        setIsCancelSubModal(false);
      },
      onError: () => {
        setIsCancelSubModal(false);
      },
    });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isActive = subscription &&
    (subscription.status === 'ACTIVE' || subscription.status === 'PENDING') &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) > new Date();

  const isNearExpiry = useMemo(() => {
    if (!isActive || !subscription?.currentPeriodEnd) return false;
    const expiryDate = new Date(subscription.currentPeriodEnd);
    const currentDate = new Date();
    const diffTime = expiryDate.getTime() - currentDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 10;
  }, [isActive, subscription?.currentPeriodEnd]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.row}
          onPress={() =>
            handleOpenURL('https://www.bombaycanvas.com/privacy-policy')
          }
        >
          <Text style={styles.rowLabel}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.row}
          onPress={() =>
            handleOpenURL('https://www.bombaycanvas.com/terms-and-condition')
          }
        >
          <Text style={styles.rowLabel}>Terms of Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.row}
          onPress={handleOpenModal}
        >
          <Text style={styles.rowLabel}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {isActive && (
        <View style={styles.subscriptionCard}>
          <Text style={styles.cardTitle}>Subscription Details</Text>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Active Plan</Text>
            <Text style={styles.cardValue}>
              {subscription.planCode === 'ANNUAL' ? 'Annual Plan' : 'Monthly Plan'}
            </Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Duration</Text>
            <Text style={styles.cardValue}>
              {subscription.currentPeriodStart ? `${formatDate(subscription.currentPeriodStart)} - ` : ''}
              {formatDate(subscription.currentPeriodEnd)}
            </Text>
          </View>

          {isNearExpiry && (
            <View style={styles.cardWarningContainer}>
              <Text style={styles.cardWarningText}>
                Your plan expires on {formatDate(subscription.currentPeriodEnd)}
              </Text>
            </View>
          )}

          {!subscription.cancelAtPeriodEnd ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.cancelSubButton}
              onPress={() => setIsCancelSubModal(true)}
            >
              <Text style={styles.cancelSubButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Your subscription is cancelled</Text>
            </View>
          )}
        </View>
      )}

      <Modal
        transparent={true}
        visible={isCancelSubModal}
        animationType="fade"
        onRequestClose={() => setIsCancelSubModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Cancel Subscription</Text>
            <Text style={styles.modalText}>
              Are you sure you want to cancel your Premium subscription? You will continue to have access to all premium content until {formatDate(subscription?.currentPeriodEnd)}.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsCancelSubModal(false)}
              >
                <Text style={styles.cancelText}>Keep Subscription</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleConfirmCancelSubscription}
                disabled={isCancelPending}
              >
                {isCancelPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteText}>Cancel Plan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  sectionTitle: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 10,
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
  subscriptionCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff6a00',
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
  },
  cardTitle: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 18,
    color: '#fff',
    marginBottom: 15,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  cardLabel: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  cardValue: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 15,
    color: '#fff',
  },
  cardWarningContainer: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
    alignItems: 'center',
  },
  cardWarningText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 14,
    color: '#ff4444',
    textAlign: 'center',
  },
  cancelSubButton: {
    marginTop: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#ff6a00',
    alignItems: 'center',
  },
  cancelSubButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 14,
    color: '#fff',
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
