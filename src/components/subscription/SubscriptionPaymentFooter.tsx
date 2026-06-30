import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function SubscriptionPaymentFooter() {
  return (
    <View style={styles.paymentsFooter}>
      <Image
        source={require('../../assets/payment_icon.webp')}
        style={styles.paymentIcon}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  paymentsFooter: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  paymentIcon: {
    width: '100%',
    height: 35,
  },
});
