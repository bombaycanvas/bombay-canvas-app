import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Receipt } from 'lucide-react-native';
import { SubscriptionCharge } from '../../api/subscription';
import { formatDate } from '../../utils/formatDate';

// Razorpay payment states that mean the money actually settled; anything else
// (failed, refunded, an unrecognised state) reads as pending rather than paid.
const SETTLED_STATUSES = ['captured', 'paid'];

const toTitleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

interface BillingHistoryListProps {
  charges?: SubscriptionCharge[];
  loading?: boolean;
}

/** Past subscription charges, with explicit loading and empty states. */
export default function BillingHistoryList({
  charges,
  loading = false,
}: BillingHistoryListProps) {
  const items = charges ?? [];
  const hasCharges = items.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Receipt size={16} color="#ff6a00" style={styles.headerIcon} />
        <Text style={styles.title}>Billing History</Text>
      </View>

      {loading && !hasCharges ? (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color="#ff6a00" />
        </View>
      ) : !hasCharges ? (
        <View style={styles.placeholder}>
          <Text style={styles.emptyText}>
            No payments yet. Charges will appear here after your first billing.
          </Text>
        </View>
      ) : (
        items.map(charge => {
          const settled = SETTLED_STATUSES.includes(
            charge.status.toLowerCase(),
          );
          return (
            <View key={charge.id} style={styles.row}>
              <Text style={styles.date}>
                {formatDate(charge.chargedAt || charge.periodStart) || '—'}
              </Text>
              <View style={styles.rowRight}>
                <Text style={styles.amount}>₹{Math.round(charge.amount / 100)}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    settled ? styles.statusSuccess : styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {toTitleCase(charge.status)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    marginRight: 6,
  },
  title: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.5,
  },
  placeholder: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  date: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amount: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 15,
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSuccess: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
  },
  statusText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
