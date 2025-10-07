import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useDeleteUserAccount } from '../api/auth';

const SettingsScreen = () => {
  const [isDeleteAccountModal, setIsDeleteAccountModal] = useState(false);
  const { mutate: deleteAccount, isPending } = useDeleteUserAccount();

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <TouchableOpacity style={styles.row}>
          <Text
            style={styles.rowLabel}
            onPress={() =>
              handleOpenURL(
                'https://bombay-canvas-fe.vercel.app/privacy-policy',
              )
            }
          >
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            handleOpenURL(
              'https://bombay-canvas-fe.vercel.app/terms-and-condition',
            )
          }
        >
          <Text style={styles.rowLabel}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleOpenModal}>
          <Text style={styles.rowLabel}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Use Account delete Modal */}
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
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
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
    fontSize: 18,
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
