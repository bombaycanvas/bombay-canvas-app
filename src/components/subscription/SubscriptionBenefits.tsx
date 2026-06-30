import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clapperboard, Star, Ticket, Mail, Users } from 'lucide-react-native';

export default function SubscriptionBenefits() {
  return (
    <View style={styles.benefitsContainer}>
      <Text style={styles.benefitsSectionTitle}>WITH CANVAS MEMBERSHIP, YOU GET</Text>

      <View style={styles.benefitsRow}>
        <View style={styles.benefitColumn}>
          <Clapperboard color="#ff6a00" size={22} style={styles.benefitIcon} />
          <Text style={styles.benefitText}>Finish every{'\n'}Canvas series</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.benefitColumn}>
          <Star color="#ff6a00" size={22} style={styles.benefitIcon} />
          <Text style={styles.benefitText}>New creator{'\n'}premieres{'\n'}every week</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.benefitColumn}>
          <Ticket color="#ff6a00" size={22} style={styles.benefitIcon} />
          <Text style={styles.benefitText}>Early access to{'\n'}upcoming{'\n'}releases</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.benefitColumn}>
          <View style={styles.mailIconContainer}>
            <Mail color="#ff6a00" size={22} style={styles.benefitIcon} />
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </View>
          <Text style={styles.benefitText}>The Canvas Edit{'\n'}weekly newsletter</Text>
          <Text style={styles.benefitSubtext}>
            Curated recommendations{'\n'}across shows, creators{'\n'}& platforms
          </Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.benefitColumn}>
          <Users color="#ff6a00" size={22} style={styles.benefitIcon} />
          <Text style={styles.benefitText}>Be part of a{'\n'}community that{'\n'}loves great{'\n'}stories</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  benefitsContainer: {
    backgroundColor: '#0c0c0c',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    marginHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 20,
    marginBottom: 20,
  },
  benefitsSectionTitle: {
    color: '#ff6a00',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  benefitColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
  },
  separator: {
    width: 1,
    height: 70,
    backgroundColor: '#222',
    alignSelf: 'center',
  },
  benefitIcon: {
    marginBottom: 10,
  },
  mailIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: -5,
    right: -14,
    backgroundColor: '#7000ff',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 6.5,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  benefitText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 12.5,
    textAlign: 'center',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  benefitSubtext: {
    color: '#777',
    fontSize: 7.5,
    lineHeight: 9.5,
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
});
