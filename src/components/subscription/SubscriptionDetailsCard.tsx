import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { Subscription } from '../../api/subscription';
import { formatDate } from '../../utils/formatDate';

// Keyed by string rather than the planCode union so a plan the server adds
// before the app ships renders a sane label instead of `undefined`.
const PLAN_COPY: Record<string, string> = {
  TRIAL: 'Trial ₹1 then ₹499/yr',
  ANNUAL: 'Annual ₹499/yr',
  MONTHLY: 'Monthly ₹99/month',
};

// Days before currentPeriodEnd at which we start warning about expiry.
const NEAR_EXPIRY_DAYS = 10;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface SubscriptionDetailsCardProps {
  subscription: Subscription;
  onCancelPress: () => void;
  /**
   * The user has been through Apple's subscription sheet and the server has not
   * heard from Apple yet. Offering the cancel button again here would invite a
   * second trip for something that may already be done.
   */
  confirmingCancel?: boolean;
}

/** Plan, access window, expiry warning and the cancel action for one subscription. */
export default function SubscriptionDetailsCard({
  subscription,
  onCancelPress,
  confirmingCancel = false,
}: SubscriptionDetailsCardProps) {
  const { planCode, currentPeriodEnd, cancelAtPeriodEnd } = subscription;

  const isNearExpiry = useMemo(() => {
    if (!currentPeriodEnd) return false;
    const expiry = new Date(currentPeriodEnd);
    if (Number.isNaN(expiry.getTime())) return false;
    const daysLeft = (expiry.getTime() - Date.now()) / MS_PER_DAY;
    return daysLeft >= 0 && daysLeft <= NEAR_EXPIRY_DAYS;
  }, [currentPeriodEnd]);

  const accessUntil = formatDate(currentPeriodEnd);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Subscription Details</Text>

      <View style={styles.planCardItem}>
        <View style={styles.cardIconContainer}>
          <CreditCard size={18} color="#ff6a00" />
        </View>
        <View style={styles.planDetails}>
          <Text style={styles.planValue}>
            {PLAN_COPY[planCode] ?? 'Premium plan'}
          </Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Access Until</Text>
        <Text style={styles.cardValue}>{accessUntil || '—'}</Text>
      </View>

      {isNearExpiry && (
        <View style={styles.cardWarningContainer}>
          <Text style={styles.cardWarningText}>
            Your plan expires on {accessUntil}
          </Text>
        </View>
      )}

      {cancelAtPeriodEnd ? (
        <View style={styles.cardRow}>
          <Text style={styles.cancelledNotice}>
            Your subscription is cancelled. Access continues until {accessUntil}
            .
          </Text>
        </View>
      ) : confirmingCancel ? (
        <View style={styles.pendingContainer}>
          <ActivityIndicator size="small" color="#ff6a00" />
          <Text style={styles.pendingText}>
            Checking with the App Store…{'\n'}
            <Text style={styles.pendingSubText}>
              This can take a moment. Your access is unchanged either way.
            </Text>
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.cancelSubButton}
          onPress={onCancelPress}
        >
          <Text style={styles.cancelSubButtonText}>Cancel Subscription</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff6a00',
    backgroundColor: 'rgba(255, 106, 0, 0.08)',
  },
  cardTitle: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 18,
    color: '#fff',
    marginBottom: 15,
  },
  planCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planDetails: {
    flex: 1,
  },
  planValue: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 16,
    color: '#fff',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  cardLabel: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  cardValue: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 15,
    color: '#fff',
  },
  cancelledNotice: {
    flex: 1,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 14,
    color: '#ff7f24',
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
  pendingContainer: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.35)',
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
  },
  pendingText: {
    flex: 1,
    marginLeft: 10,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 14,
    color: '#ff7f24',
    lineHeight: 20,
  },
  pendingSubText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
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
});
