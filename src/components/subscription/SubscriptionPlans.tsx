import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import LockOutlined from '../../assets/LockOutlined';
import { Plan } from '../../api/subscription';

interface SubscriptionPlansProps {
  selectedPlan: 'monthly' | 'annual';
  setSelectedPlan: (plan: 'monthly' | 'annual') => void;
  handlePurchase: (plan: 'monthly' | 'annual') => void;
  loading: boolean;
  activePlan?: 'MONTHLY' | 'ANNUAL' | null;
  plans?: Plan[];
}

export default function SubscriptionPlans({
  selectedPlan,
  setSelectedPlan,
  handlePurchase,
  loading,
  activePlan,
  plans,
}: SubscriptionPlansProps) {
  const isMonthlyActive = activePlan === 'MONTHLY';
  const isAnnualActive = activePlan === 'ANNUAL';
  const hasAnyActive = isMonthlyActive || isAnnualActive;

  const monthlyPlan = plans?.find(p => p.code === 'MONTHLY');
  const annualPlan = plans?.find(p => p.code === 'ANNUAL');


  const monthlyPrice = monthlyPlan ? monthlyPlan.price / 100 : 99;
  const annualPrice = annualPlan ? annualPlan.price / 100 : 499;


  const annualPricePerMonth = Math.round(annualPrice / 12);

  const savingsPercent = monthlyPrice > 0
    ? Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100)
    : 58;
  return (
    <View style={styles.plansWrapper}>
      <View style={styles.plansRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.planCard,
            selectedPlan === 'monthly' && styles.planCardActive,
          ]}
          onPress={() => setSelectedPlan('monthly')}
        >
          <View style={styles.radioAbsoluteLeft}>
            <View style={[styles.radioOuter, selectedPlan === 'monthly' && styles.radioOuterActive]}>
              {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
            </View>
          </View>

          <Text style={styles.planTitleText}>MONTHLY</Text>

          <View style={styles.planPriceContainer}>
            <View style={styles.priceMainRow}>
              <Text style={styles.priceCurrency}>₹</Text>
              <Text style={styles.priceText}>{monthlyPrice}</Text>
              <Text style={styles.pricePeriod}>/month</Text>
            </View>
            <Text style={styles.planSubtext}>Billed monthly{'\n'}Cancel anytime</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.planButton,
              selectedPlan === 'monthly' ? styles.planButtonActive : styles.planButtonInactive,
              hasAnyActive && styles.planButtonDisabled,
            ]}
            onPress={() => handlePurchase('monthly')}
            disabled={loading || hasAnyActive || selectedPlan !== 'monthly'}
          >
            {loading && selectedPlan === 'monthly' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.planButtonText,
                  selectedPlan === 'monthly' ? styles.planButtonTextActive : styles.planButtonTextInactive,
                  hasAnyActive && styles.planButtonTextDisabled,
                ]}
              >
                {isMonthlyActive ? 'Active' : 'Continue Monthly'}
              </Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.planCard,
            selectedPlan === 'annual' && styles.planCardActive,
          ]}
          onPress={() => setSelectedPlan('annual')}
        >
          <View style={styles.popularBadge}>
            <View style={styles.popularBadgeTextContainer}>
              <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
            </View>
          </View>

          <View style={styles.radioAbsoluteLeft}>
            <View style={[styles.radioOuter, selectedPlan === 'annual' && styles.radioOuterActive]}>
              {selectedPlan === 'annual' ? (
                <View style={styles.radioInner} />
              ) : null}
            </View>
          </View>

          <Text style={styles.planTitleText}>ANNUAL</Text>

          <View style={styles.planPriceContainer}>
            <View style={styles.priceMainRow}>
              <Text style={styles.priceCurrency}>₹</Text>
              <Text style={styles.priceText}>{annualPrice}</Text>
              <Text style={styles.pricePeriod}>/year</Text>
            </View>
            <Text style={styles.planSavingsText}>Only ₹{annualPricePerMonth}/month</Text>
            <View style={styles.planSavingsBadge}>
              <Text style={styles.planSavingsBadgeText}>Save {savingsPercent}%</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.planButton,
              selectedPlan === 'annual' ? styles.planButtonActive : styles.planButtonInactive,
              hasAnyActive && styles.planButtonDisabled,
            ]}
            onPress={() => handlePurchase('annual')}
            disabled={loading || hasAnyActive || selectedPlan !== 'annual'}
          >
            {loading && selectedPlan === 'annual' ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text
                style={[
                  styles.planButtonText,
                  selectedPlan === 'annual' ? styles.planButtonTextActive : styles.planButtonTextInactive,
                  hasAnyActive && styles.planButtonTextDisabled,
                ]}
              >
                {isAnnualActive ? 'Active' : 'Join Canvas'}
              </Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      <View style={styles.secureTextRow}>
        <LockOutlined width={11} height={11} color="#777" />
        <Text style={styles.secureText}>Secure payments. Cancel anytime from settings.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plansWrapper: {
    marginHorizontal: 12,
    marginBottom: 18,
  },
  plansRow: {
    flexDirection: 'row',
    gap: 10,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#222',
    paddingVertical: 18,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  planCardActive: {
    borderColor: '#ff6a00',
  },
  radioAbsoluteLeft: {
    position: 'absolute',
    top: 20,
    left: 12,
    zIndex: 10,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  popularBadgeTextContainer: {
    backgroundColor: '#ff6a00',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  popularBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  planTitleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    fontFamily: 'HelveticaNowDisplay-Black',
    marginTop: 4,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#ff6a00',
  },
  radioOuterActiveSelected: {
    borderColor: '#ff6a00',
    backgroundColor: '#ff6a00',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff6a00',
  },
  radioInnerCheckContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  planPriceContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  priceMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  priceCurrency: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  priceText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Black',
  },
  pricePeriod: {
    color: '#aaa',
    fontSize: 13,
    marginLeft: 2,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  planSavingsText: {
    color: '#ff6a00',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    fontFamily: 'HelveticaNowDisplay-Bold',
    textAlign: 'center',
  },
  planSavingsBadge: {
    backgroundColor: '#ff6a00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 6,
  },
  planSavingsBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  planSubtext: {
    color: '#888',
    fontSize: 11,
    lineHeight: 13,
    marginTop: 4,
    fontFamily: 'HelveticaNowDisplay-Regular',
    textAlign: 'center',
  },
  planButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  planButtonActive: {
    backgroundColor: '#ff6a00',
    borderWidth: 1.5,
  },
  planButtonInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#ff6a00',
  },
  planButtonText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  planButtonTextActive: {
    color: '#000',
  },
  planButtonTextInactive: {
    color: '#ff6a00',
  },
  secureTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  secureText: {
    color: '#777',
    fontSize: 12,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  planButtonDisabled: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  planButtonTextDisabled: {
    color: '#666',
  },
});
