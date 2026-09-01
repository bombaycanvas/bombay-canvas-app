import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import LockOutlined from '../../assets/LockOutlined';
import { Plan, PlanCode, isTrialCode, pickTrialPlan } from '../../api/subscription';

interface SubscriptionPlansProps {
  selectedPlan: 'trial' | 'monthly' | 'annual';
  setSelectedPlan: (plan: 'trial' | 'monthly' | 'annual') => void;
  handlePurchase: (plan: 'trial' | 'monthly' | 'annual') => void;
  loading: boolean;
  activePlan?: PlanCode | null;
  plans?: Plan[];
}

/** Whole rupees from a paise amount — every price on this screen goes through here. */
const rupees = (paise?: number | null) => Math.round((paise || 0) / 100);

export default function SubscriptionPlans({
  selectedPlan,
  setSelectedPlan,
  handlePurchase,
  loading,
  activePlan,
  plans,
}: SubscriptionPlansProps) {
  // Either trial code counts as "the trial is active" — a TRIAL_NEW subscriber
  // is not a paid annual subscriber.
  const isTrialActive = isTrialCode(activePlan);
  const isMonthlyActive = activePlan === 'MONTHLY';
  const isAnnualActive = activePlan === 'ANNUAL';
  const hasAnyActive = isTrialActive || isMonthlyActive || isAnnualActive;

  // The API offers this client both trial codes; take the newest one it knows
  // about so exactly ONE trial card renders. See pickTrialPlan.
  const trialPlan = pickTrialPlan(plans);
  const monthlyPlan = plans?.find(p => p.code === 'MONTHLY');
  const annualPlan = plans?.find(p => p.code === 'ANNUAL');

  // Every amount below comes from the API. No hardcoded rupee fallbacks: a
  // fallback that disagrees with the server quotes one price and charges
  // another, which is exactly the bug that forced two trial codes to exist. A
  // card whose plan is missing simply does not render.
  const monthlyPrice = monthlyPlan ? rupees(monthlyPlan.price) : null;
  const annualPrice = annualPlan ? rupees(annualPlan.price) : null;
  const annualPricePerMonth =
    annualPrice != null ? Math.round(annualPrice / 12) : null;

  const savingsPercent =
    monthlyPrice != null && annualPrice != null && monthlyPrice > 0
      ? Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100)
      : null;

  // The post-trial price is the TRIAL plan's OWN price, never the ANNUAL card's
  // — they are different numbers (₹899 vs ₹499) and reading the wrong one
  // understates the charge by ₹400.
  const trialUpfront = rupees(trialPlan?.trial?.upfrontAmount);
  const trialPostPrice = trialPlan ? rupees(trialPlan.price) : null;
  const trialDays = trialPlan?.trial?.days;

  // The server already applied eligibility when it built the offered set — an
  // ineligible user gets no trial plan back at all, from either plan source. So
  // the plan's presence IS the answer, and gating on it alone means the two
  // signals can never contradict: `trialEligible` parses to `false` on a
  // malformed response, which would otherwise hide a trial the server did offer.
  const showTrial = !!trialPlan;

  return (
    <View style={styles.plansWrapper}>
      {showTrial && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.trialCard,
            selectedPlan === 'trial' && styles.planCardActive,
          ]}
          onPress={() => setSelectedPlan('trial')}
        >
          <View style={styles.recommendedBadge}>
            <View style={styles.recommendedBadgeTextContainer}>
              <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
            </View>
          </View>

          <View style={styles.trialMainContent}>
            <View style={styles.trialLeftInfo}>
              <View style={styles.trialRadioRow}>
                <View style={[styles.radioOuter, selectedPlan === 'trial' && styles.radioOuterActive, { marginRight: 10 }]}>
                  {selectedPlan === 'trial' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.trialTitleText}>{trialPlan?.name}</Text>
              </View>

              <View style={styles.trialPriceContainer}>
                <Text style={styles.trialPriceCurrency}>₹</Text>
                <Text style={styles.trialPriceText}>{trialUpfront}</Text>
                <Text style={styles.trialPricePeriod}> today</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.trialButton,
                selectedPlan === 'trial' ? styles.trialButtonActive : styles.trialButtonInactive,
                hasAnyActive && styles.trialButtonDisabled,
              ]}
              onPress={() => handlePurchase('trial')}
              disabled={loading || hasAnyActive || selectedPlan !== 'trial'}
            >
              {loading && selectedPlan === 'trial' ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text
                  style={[
                    styles.trialButtonText,
                    selectedPlan === 'trial' ? styles.trialButtonTextActive : styles.trialButtonTextInactive,
                    hasAnyActive && styles.planButtonTextDisabled,
                  ]}
                >
                  {isTrialActive ? 'Active' : `Start for ₹${trialUpfront} →`}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.trialBottomText}>
            {trialDays} days full access, then ₹{trialPostPrice}/year. Cancel
            anytime. The ₹{trialUpfront} activation fee is non-refundable.
          </Text>
        </TouchableOpacity>
      )}

      {showTrial && (
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR PICK A PLAN</Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      <View style={styles.plansRow}>
        {!!monthlyPlan && (
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
                isMonthlyActive && styles.planButtonDisabled,
              ]}
              onPress={() => handlePurchase('monthly')}
              disabled={loading || isMonthlyActive || selectedPlan !== 'monthly'}
            >
              {loading && selectedPlan === 'monthly' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.planButtonText,
                    selectedPlan === 'monthly' ? styles.planButtonTextActive : styles.planButtonTextInactive,
                    isMonthlyActive && styles.planButtonTextDisabled,
                  ]}
                >
                  {isMonthlyActive ? 'Active' : 'Continue Monthly'}
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {!!annualPlan && (
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
              {savingsPercent != null && savingsPercent > 0 && (
                <View style={styles.planSavingsBadge}>
                  <Text style={styles.planSavingsBadgeText}>Save {savingsPercent}%</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.planButton,
                selectedPlan === 'annual' ? styles.planButtonActive : styles.planButtonInactive,
                isAnnualActive && styles.planButtonDisabled,
              ]}
              onPress={() => handlePurchase('annual')}
              disabled={loading || isAnnualActive || selectedPlan !== 'annual'}
            >
              {loading && selectedPlan === 'annual' ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text
                  style={[
                    styles.planButtonText,
                    selectedPlan === 'annual' ? styles.planButtonTextActive : styles.planButtonTextInactive,
                    isAnnualActive && styles.planButtonTextDisabled,
                  ]}
                >
                  {isAnnualActive ? 'Active' : 'Join Canvas'}
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        )}
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
    fontSize: 13,
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
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  planSubtext: {
    color: '#888',
    fontSize: 13,
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
  trialCard: {
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#222',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  recommendedBadgeTextContainer: {
    backgroundColor: '#ff4d00',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomRightRadius: 8,
  },
  recommendedBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  trialMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  trialLeftInfo: {
    flex: 1,
    marginRight: 10,
  },
  trialRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trialTitleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  trialPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 30,
  },
  trialPriceCurrency: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  trialPriceText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Black',
  },
  trialPricePeriod: {
    color: '#aaa',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  trialButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  trialButtonActive: {
    backgroundColor: '#ff6a00',
    borderColor: '#ff6a00',
  },
  trialButtonInactive: {
    backgroundColor: 'transparent',
    borderColor: '#ff6a00',
  },
  trialButtonDisabled: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  trialButtonText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  trialButtonTextActive: {
    color: '#000',
  },
  trialButtonTextInactive: {
    color: '#ff6a00',
  },
  trialBottomText: {
    color: '#888',
    fontSize: 14,
    marginTop: 10,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#555',
  },
  dividerText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginHorizontal: 12,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
});
