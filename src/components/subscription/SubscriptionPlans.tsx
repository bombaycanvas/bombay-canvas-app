import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import LockOutlined from '../../assets/LockOutlined';
import type { PaywallOffers, PriceDisplay } from './paywallOffers';

interface SubscriptionPlansProps {
  selectedPlan: 'trial' | 'monthly' | 'annual';
  setSelectedPlan: (plan: 'trial' | 'monthly' | 'annual') => void;
  handlePurchase: (plan: 'trial' | 'monthly' | 'annual') => void;
  loading: boolean;
  activePlan?: 'TRIAL' | 'MONTHLY' | 'ANNUAL' | null;
  offers: PaywallOffers;
  // Set when the rail cannot sell to this account at all — today, an Apple ID
  // whose subscription is bound to a different Canvas account. The cards keep
  // their prices so the paywall still explains what Premium is; only the actions
  // become inert, because the App Store would take the money and the server
  // would then refuse to grant it.
  purchaseBlockedLabel?: string | null;
}

// The two pill shapes the paywall draws a purchase action in. Only the styling
// differs, so the behaviour below is written once.
interface ActionTheme {
  button: StyleProp<ViewStyle>;
  buttonSelected: StyleProp<ViewStyle>;
  buttonUnselected: StyleProp<ViewStyle>;
  buttonDisabled: StyleProp<ViewStyle>;
  text: StyleProp<TextStyle>;
  textSelected: StyleProp<TextStyle>;
  textUnselected: StyleProp<TextStyle>;
  textDisabled: StyleProp<TextStyle>;
}

interface PurchaseActionProps {
  theme: ActionTheme;
  label: string;
  selected: boolean;
  loading: boolean;
  spinnerColor: string;
  isActivePlan: boolean;
  hasActiveSubscription: boolean;
  blockedLabel?: string | null;
  onPress: () => void;
}

// A subscribed user must not be able to start a second purchase: both rails
// would take the money, and on Apple that is a charge no in-app flow can
// reverse. So the action is removed rather than merely disabled, leaving an
// inert status pill on the plan they already hold and nothing at all on the
// others.
function PurchaseAction({
  theme,
  label,
  selected,
  loading,
  spinnerColor,
  isActivePlan,
  hasActiveSubscription,
  blockedLabel,
  onPress,
}: PurchaseActionProps) {
  // Unlike the subscribed case this shows on EVERY card: no plan is buyable, so
  // leaving some cards actionless and others not would read as a broken button
  // rather than as a deliberate block.
  if (blockedLabel) {
    return (
      <View
        style={[theme.button, theme.buttonUnselected, theme.buttonDisabled]}
      >
        <Text style={[theme.text, theme.textDisabled]}>{blockedLabel}</Text>
      </View>
    );
  }

  if (hasActiveSubscription) {
    if (!isActivePlan) return null;
    return (
      <View
        style={[theme.button, theme.buttonUnselected, theme.buttonDisabled]}
      >
        <Text style={[theme.text, theme.textDisabled]}>Active</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        theme.button,
        selected ? theme.buttonSelected : theme.buttonUnselected,
      ]}
      onPress={onPress}
      disabled={loading || !selected}
    >
      {loading && selected ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text
          style={[
            theme.text,
            selected ? theme.textSelected : theme.textUnselected,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// The card renders the symbol in its own smaller style, but Apple hands back a
// single localised string ("₹499.00", "$5.99") that must not be taken apart.
function Price({
  price,
  amountStyle,
  periodStyle,
}: {
  price: PriceDisplay;
  amountStyle: StyleProp<TextStyle>;
  periodStyle: StyleProp<TextStyle>;
}) {
  return (
    <>
      {price.currency ? (
        <Text style={styles.priceCurrency}>{price.currency}</Text>
      ) : null}
      <Text style={amountStyle}>{price.amount}</Text>
      <Text style={periodStyle}>{price.period}</Text>
    </>
  );
}

export default function SubscriptionPlans({
  selectedPlan,
  setSelectedPlan,
  handlePurchase,
  loading,
  activePlan,
  offers,
  purchaseBlockedLabel,
}: SubscriptionPlansProps) {
  const isTrialActive = activePlan === 'TRIAL';
  const isMonthlyActive = activePlan === 'MONTHLY';
  const isAnnualActive = activePlan === 'ANNUAL';
  // activePlan is only ever set for a subscription isSubscriptionActive() has
  // already approved, so this is that same entitlement answer.
  const hasActiveSubscription =
    isTrialActive || isMonthlyActive || isAnnualActive;

  const trial = offers.trial;
  return (
    <View style={styles.plansWrapper}>
      {trial && (
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
                <View
                  style={[
                    styles.radioOuter,
                    selectedPlan === 'trial' && styles.radioOuterActive,
                    { marginRight: 10 },
                  ]}
                >
                  {selectedPlan === 'trial' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.trialTitleText}>{trial.title}</Text>
              </View>

              <View style={styles.trialPriceContainer}>
                {trial.price.currency ? (
                  <Text style={styles.trialPriceCurrency}>
                    {trial.price.currency}
                  </Text>
                ) : null}
                <Text style={styles.trialPriceText}>{trial.price.amount}</Text>
                <Text style={styles.trialPricePeriod}>
                  {trial.price.period}
                </Text>
              </View>
            </View>

            <PurchaseAction
              theme={TRIAL_ACTION_THEME}
              label={trial.buttonLabel}
              selected={selectedPlan === 'trial'}
              loading={loading}
              blockedLabel={purchaseBlockedLabel}
              spinnerColor="#000"
              isActivePlan={isTrialActive}
              hasActiveSubscription={hasActiveSubscription}
              onPress={() => handlePurchase('trial')}
            />
          </View>

          <Text style={styles.trialBottomText}>{trial.footnote}</Text>
        </TouchableOpacity>
      )}

      {trial && (
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR PICK A PLAN</Text>
          <View style={styles.dividerLine} />
        </View>
      )}

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
            <View
              style={[
                styles.radioOuter,
                selectedPlan === 'monthly' && styles.radioOuterActive,
              ]}
            >
              {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
            </View>
          </View>

          <Text style={styles.planTitleText}>MONTHLY</Text>

          <View style={styles.planPriceContainer}>
            <View style={styles.priceMainRow}>
              <Price
                price={offers.monthly}
                amountStyle={styles.priceText}
                periodStyle={styles.pricePeriod}
              />
            </View>
            <Text style={styles.planSubtext}>
              Billed monthly{'\n'}Cancel anytime
            </Text>
          </View>

          <PurchaseAction
            theme={PLAN_ACTION_THEME}
            label="Continue Monthly"
            selected={selectedPlan === 'monthly'}
            loading={loading}
            blockedLabel={purchaseBlockedLabel}
            spinnerColor="#fff"
            isActivePlan={isMonthlyActive}
            hasActiveSubscription={hasActiveSubscription}
            onPress={() => handlePurchase('monthly')}
          />
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
            <View
              style={[
                styles.radioOuter,
                selectedPlan === 'annual' && styles.radioOuterActive,
              ]}
            >
              {selectedPlan === 'annual' ? (
                <View style={styles.radioInner} />
              ) : null}
            </View>
          </View>

          <Text style={styles.planTitleText}>ANNUAL</Text>

          <View style={styles.planPriceContainer}>
            <View style={styles.priceMainRow}>
              <Price
                price={offers.annual}
                amountStyle={styles.priceText}
                periodStyle={styles.pricePeriod}
              />
            </View>
            {offers.annualPerMonthLabel ? (
              <Text style={styles.planSavingsText}>
                {offers.annualPerMonthLabel}
              </Text>
            ) : null}
            {offers.savingsPercent !== null ? (
              <View style={styles.planSavingsBadge}>
                <Text style={styles.planSavingsBadgeText}>
                  Save {offers.savingsPercent}%
                </Text>
              </View>
            ) : null}
          </View>

          <PurchaseAction
            theme={PLAN_ACTION_THEME}
            label="Join Canvas"
            selected={selectedPlan === 'annual'}
            loading={loading}
            blockedLabel={purchaseBlockedLabel}
            spinnerColor="#000"
            isActivePlan={isAnnualActive}
            hasActiveSubscription={hasActiveSubscription}
            onPress={() => handlePurchase('annual')}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.secureTextRow}>
        <LockOutlined width={11} height={11} color="#777" />
        <Text style={styles.secureText}>
          Secure payments. Cancel anytime from settings.
        </Text>
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

const PLAN_ACTION_THEME: ActionTheme = {
  button: styles.planButton,
  buttonSelected: styles.planButtonActive,
  buttonUnselected: styles.planButtonInactive,
  buttonDisabled: styles.planButtonDisabled,
  text: styles.planButtonText,
  textSelected: styles.planButtonTextActive,
  textUnselected: styles.planButtonTextInactive,
  textDisabled: styles.planButtonTextDisabled,
};

const TRIAL_ACTION_THEME: ActionTheme = {
  button: styles.trialButton,
  buttonSelected: styles.trialButtonActive,
  buttonUnselected: styles.trialButtonInactive,
  buttonDisabled: styles.trialButtonDisabled,
  text: styles.trialButtonText,
  textSelected: styles.trialButtonTextActive,
  textUnselected: styles.trialButtonTextInactive,
  textDisabled: styles.planButtonTextDisabled,
};
