import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, Award, Headphones } from 'lucide-react-native';

export default function SubscriptionTrustBadges() {
  return (
    <View style={styles.trustBadgesContainer}>
      <View style={styles.trustBadgeItem}>
        <ShieldCheck color="#fff" size={20} style={styles.badgeIcon} />
        <View style={styles.textContainer}>
          <Text style={styles.badgeTitle}>100% secure</Text>
          <Text style={styles.badgeSubtitle}>payments</Text>
        </View>
      </View>

      <View style={styles.separator} />
      <View style={styles.trustBadgeItem}>
        <Award color="#fff" size={20} style={styles.badgeIcon} />
        <View style={styles.textContainer}>
          <Text style={styles.badgeTitle}>Shows by</Text>
          <Text style={styles.badgeSubtitle}>amazing creators</Text>
        </View>
      </View>

      <View style={styles.separator} />
      <View style={styles.trustBadgeItem}>
        <Headphones color="#fff" size={20} style={styles.badgeIcon} />
        <View style={styles.textContainer}>
          <Text style={styles.badgeTitle}>Need help?</Text>
          <Text style={styles.badgeSubtitle}>We're here for you</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trustBadgesContainer: {
    backgroundColor: '#0c0c0c',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    marginHorizontal: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trustBadgeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeIcon: {
    marginRight: 8,
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  badgeTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  badgeSubtitle: {
    color: '#888',
    fontSize: 10,
    lineHeight: 11,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#222',
  },
});
