import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen = () => {
  const { logout } = useAuth();
  const navigation = useNavigation();

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Login' as never);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowLabel}>Change Password</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowLabel}>Privacy Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowLabel}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowLabel}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  logoutButton: {
    backgroundColor: '#ef8a4c',
    borderRadius: 10,
    padding: 14,
    margin: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 16,
  },
});

export default SettingsScreen;
