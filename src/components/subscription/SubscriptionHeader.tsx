import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

interface SubscriptionHeaderProps {
  onClose: () => void;
}

export default function SubscriptionHeader({ onClose }: SubscriptionHeaderProps) {
  return (
    <View style={styles.header}>
      <Image
        source={require('../../images/MainLogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.closeBtn}
        onPress={onClose}
      >
        <X color="#fff" size={20} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  logo: {
    width: 100,
    height: 28,
  },
  closeBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
