import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LockOutlined from '../../assets/LockOutlined';
import { isTrialCode } from '../../api/planCodes';
import type { PlanCode } from '../../api/planCodes';
import type {
  PaywallHeroCopy,
  PaywallOffers,
  PaywallPlanKey,
} from './paywallOffers';
import { Price, PurchaseAction, PRICE_PLACEHOLDER } from './planPurchaseAction';
import type { ActionTheme } from './planPurchaseAction';

interface ApplePaywallPlansProps {
  selectedPlan: PaywallPlanKey;
  setSelectedPlan: (plan: PaywallPlanKey) => void;
  handlePurchase: (plan: PaywallPlanKey) => void;
  loading: boolean;
  activePlan?: PlanCode | null;
  offers: PaywallOffers;
  /** Non-null is what puts this layout on screen at all. See PaywallHeroCopy. */
  heroCopy: PaywallHeroCopy;
  /** See SubscriptionPlans: the rail cannot sell to this account at all. */
  purchaseBlockedLabel?: string | null;
}

/**
 * The paywall that leads with the annual plan.
 *
 * The trial is not the hook here — it is the more expensive first year, and the
 * hero's job is to say so with two prices the user can see at once. So annual
 * takes the whole top of the sheet with the gap printed beside it, and the trial
 * drops to a secondary card next to monthly, still one tap away and still owning
 * up to what it costs.
 */
export default function ApplePaywallPlans({
  selectedPlan,
  setSelectedPlan,
  handlePurchase,
  loading,
  activePlan,
  offers,
  heroCopy,
  purchaseBlockedLabel,
}: ApplePaywallPlansProps) {
  const isTrialActive = isTrialCode(activePlan);
  const isMonthlyActive = activePlan === 'MONTHLY';
  const isAnnualActive = activePlan === 'ANNUAL';
  const hasActiveSubscription =
    isTrialActive || isMonthlyActive || isAnnualActive;

  const { trial, offered } = offers;

  // The fine print belongs to the card the user is actually about to buy. The
  // trial's own footnote already names both of its prices, so it stands as
  // written rather than being rebuilt from the renewal line.
  const finePrint =
    selectedPlan === 'trial'
      ? trial?.footnote ?? null
      : selectedPlan === 'monthly'
      ? heroCopy.renewalNote.monthly
      : heroCopy.renewalNote.annual;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.heroCard}
        onPress={() => setSelectedPlan('annual')}
      >
        <View style={styles.bestValueBadge}>
          <Text style={styles.bestValueText}>BEST VALUE</Text>
        </View>

        <View
          style={[
            styles.heroCheck,
            selectedPlan === 'annual' && styles.heroCheckSelected,
          ]}
        >
          {selectedPlan === 'annual' && (
            <Text style={styles.heroCheckMark}>✓</Text>
          )}
        </View>

        <View style={styles.heroTopRow}>
          <View style={styles.heroPriceColumn}>
            <Text style={styles.heroLabel}>ANNUAL</Text>
            {/* One Text rather than a row of them: a storefront that prices in
                thousands ("₹1,299.00") overran the column and pushed "/year"
                across the divider. Nested Text keeps the three sizes and lets
                iOS shrink the whole line to whatever room the column has. */}
            <Text
              style={styles.heroPriceLine}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              <Price
                price={offers.annual}
                currencyStyle={styles.heroPriceCurrency}
                amountStyle={styles.heroPriceAmount}
                periodStyle={styles.heroPricePeriod}
              />
            </Text>
            {offers.annualPerMonthLabel ? (
              <Text style={styles.heroPerMonth}>
                {offers.annualPerMonthLabel}
              </Text>
            ) : null}
          </View>

          {heroCopy.savings ? (
            <View style={styles.savingsBox}>
              <Text style={styles.savingsHeadline}>
                {heroCopy.savings.headline}
              </Text>
              <Text style={styles.savingsBody}>{heroCopy.savings.body}</Text>
            </View>
          ) : null}
        </View>

        <PurchaseAction
          theme={HERO_ACTION_THEME}
          label={heroCopy.ctaLabel}
          selected={selectedPlan === 'annual'}
          loading={loading}
          blockedLabel={purchaseBlockedLabel}
          spinnerColor="#000"
          isActivePlan={isAnnualActive}
          hasActiveSubscription={hasActiveSubscription}
          priceUnknown={offers.annual.amount === null}
          onPress={() => handlePurchase('annual')}
        />

        <Text style={styles.heroFootnote}>{heroCopy.footnote}</Text>
      </TouchableOpacity>

      {(offered.monthly || trial) && (
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR PICK ANOTHER PLAN</Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      <View style={styles.secondaryRow}>
        {offered.monthly && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.secondaryCard,
              selectedPlan === 'monthly' && styles.secondaryCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.secondaryHeader}>
              <Text style={styles.secondaryLabel}>MONTHLY</Text>
              <Radio selected={selectedPlan === 'monthly'} />
            </View>

            <Text
              style={styles.secondaryPriceLine}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              <Price
                price={offers.monthly}
                currencyStyle={styles.secondaryPriceCurrency}
                amountStyle={styles.secondaryPriceAmount}
                periodStyle={styles.secondaryPricePeriod}
              />
            </Text>
            <Text style={styles.secondarySubline}>Billed monthly</Text>

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{heroCopy.monthlyNote}</Text>
            </View>

            <PurchaseAction
              theme={SECONDARY_ACTION_THEME}
              label="Continue Monthly"
              selected={selectedPlan === 'monthly'}
              loading={loading}
              blockedLabel={purchaseBlockedLabel}
              spinnerColor="#fff"
              isActivePlan={isMonthlyActive}
              hasActiveSubscription={hasActiveSubscription}
              priceUnknown={offers.monthly.amount === null}
              onPress={() => handlePurchase('monthly')}
            />
          </TouchableOpacity>
        )}

        {trial && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.secondaryCard,
              selectedPlan === 'trial' && styles.secondaryCardSelected,
            ]}
            onPress={() => setSelectedPlan('trial')}
          >
            <View style={styles.secondaryHeader}>
              <Text style={styles.secondaryLabel}>{trial.title}</Text>
              <Radio selected={selectedPlan === 'trial'} />
            </View>

            <Text
              style={styles.secondaryPriceLine}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {trial.price.currency && trial.price.amount !== null ? (
                <Text style={styles.secondaryPriceCurrency}>
                  {trial.price.currency}
                </Text>
              ) : null}
              <Text style={styles.secondaryPriceAmount}>
                {trial.price.amount ?? PRICE_PLACEHOLDER}
              </Text>
              <Text style={styles.secondaryPricePeriod}>
                {trial.price.period}
              </Text>
            </Text>
            {heroCopy.trialConversionLabel ? (
              <Text style={styles.secondarySubline}>
                {heroCopy.trialConversionLabel}
              </Text>
            ) : null}

            {heroCopy.trialNote ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>{heroCopy.trialNote}</Text>
              </View>
            ) : null}

            <PurchaseAction
              theme={SECONDARY_ACTION_THEME}
              label={trial.buttonLabel}
              selected={selectedPlan === 'trial'}
              loading={loading}
              blockedLabel={purchaseBlockedLabel}
              spinnerColor="#fff"
              isActivePlan={isTrialActive}
              hasActiveSubscription={hasActiveSubscription}
              priceUnknown={trial.price.amount === null}
              onPress={() => handlePurchase('trial')}
            />
          </TouchableOpacity>
        )}
      </View>

      {finePrint ? <Text style={styles.finePrint}>{finePrint}</Text> : null}

      <View style={styles.secureTextRow}>
        <LockOutlined width={11} height={11} color="#777" />
        <Text style={styles.secureText}>
          Secure payments. Cancel anytime from settings.
        </Text>
      </View>
    </View>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  );
}

const ORANGE = '#ff6a00';

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginBottom: 18,
  },
  heroCard: {
    backgroundColor: '#151110',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: ORANGE,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 16,
    marginTop: 10,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    left: 16,
    backgroundColor: ORANGE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    zIndex: 10,
  },
  bestValueText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  heroCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#4a3a30',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroCheckSelected: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  heroCheckMark: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroPriceColumn: {
    // Wider than the savings box beside it: this side carries the headline
    // price, and the box only has to hold two short lines of prose.
    flex: 1.25,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#2e2521',
  },
  heroLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
    fontFamily: 'HelveticaNowDisplay-Black',
  },
  heroPriceLine: {
    marginTop: 2,
  },
  heroPriceCurrency: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  heroPriceAmount: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Black',
  },
  heroPricePeriod: {
    color: '#cfcfcf',
    fontSize: 15,
    marginLeft: 3,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  heroPerMonth: {
    color: '#9a9a9a',
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  savingsBox: {
    flex: 1,
    backgroundColor: '#231812',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginLeft: 12,
    justifyContent: 'center',
  },
  savingsHeadline: {
    color: ORANGE,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  savingsBody: {
    color: '#b9b1ac',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 3,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  heroButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 2,
  },
  heroButtonSelected: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  heroButtonUnselected: {
    backgroundColor: 'transparent',
    borderColor: ORANGE,
  },
  heroButtonDisabled: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  heroButtonText: {
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  heroButtonTextSelected: {
    color: '#000',
  },
  heroButtonTextUnselected: {
    color: ORANGE,
  },
  heroFootnote: {
    color: '#8f8f8f',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#8f8f8f',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginHorizontal: 12,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  secondaryCardSelected: {
    borderColor: ORANGE,
  },
  secondaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  secondaryLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: 'HelveticaNowDisplay-Black',
    marginRight: 6,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: ORANGE,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: ORANGE,
  },
  secondaryPriceLine: {
    marginTop: 8,
  },
  secondaryPriceCurrency: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  secondaryPriceAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'HelveticaNowDisplay-Black',
  },
  secondaryPricePeriod: {
    color: '#bdbdbd',
    fontSize: 13,
    marginLeft: 2,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  secondarySubline: {
    color: '#8f8f8f',
    fontSize: 12,
    marginTop: 3,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  noteBox: {
    backgroundColor: '#1b1613',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  noteText: {
    color: '#b5b5b5',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  secondaryButton: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1.5,
  },
  secondaryButtonSelected: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  secondaryButtonUnselected: {
    backgroundColor: 'transparent',
    borderColor: '#4a4a4a',
  },
  secondaryButtonDisabled: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  secondaryButtonTextSelected: {
    color: '#000',
  },
  secondaryButtonTextUnselected: {
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#666',
  },
  finePrint: {
    color: '#8f8f8f',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
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
});

const HERO_ACTION_THEME: ActionTheme = {
  button: styles.heroButton,
  buttonSelected: styles.heroButtonSelected,
  buttonUnselected: styles.heroButtonUnselected,
  buttonDisabled: styles.heroButtonDisabled,
  text: styles.heroButtonText,
  textSelected: styles.heroButtonTextSelected,
  textUnselected: styles.heroButtonTextUnselected,
  textDisabled: styles.buttonTextDisabled,
};

const SECONDARY_ACTION_THEME: ActionTheme = {
  button: styles.secondaryButton,
  buttonSelected: styles.secondaryButtonSelected,
  buttonUnselected: styles.secondaryButtonUnselected,
  buttonDisabled: styles.secondaryButtonDisabled,
  text: styles.secondaryButtonText,
  textSelected: styles.secondaryButtonTextSelected,
  textUnselected: styles.secondaryButtonTextUnselected,
  textDisabled: styles.buttonTextDisabled,
};
