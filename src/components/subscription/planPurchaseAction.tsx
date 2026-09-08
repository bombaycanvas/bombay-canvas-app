import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { PriceDisplay } from './paywallOffers';

// The pill shapes the paywall draws a purchase action in. Only the styling
// differs between them and between the two layouts, so the behaviour below is
// written once and every card on both layouts goes through it.
export interface ActionTheme {
  button: StyleProp<ViewStyle>;
  buttonSelected: StyleProp<ViewStyle>;
  buttonUnselected: StyleProp<ViewStyle>;
  buttonDisabled: StyleProp<ViewStyle>;
  text: StyleProp<TextStyle>;
  textSelected: StyleProp<TextStyle>;
  textUnselected: StyleProp<TextStyle>;
  textDisabled: StyleProp<TextStyle>;
}

export interface PurchaseActionProps {
  theme: ActionTheme;
  label: string;
  selected: boolean;
  loading: boolean;
  spinnerColor: string;
  isActivePlan: boolean;
  hasActiveSubscription: boolean;
  blockedLabel?: string | null;
  /** This card carries no price. See PaywallOffers.pricesUnavailable. */
  priceUnknown: boolean;
  onPress: () => void;
}

// A subscribed user must not be able to start a second purchase: both rails
// would take the money, and on Apple that is a charge no in-app flow can
// reverse. So the action is removed rather than merely disabled, leaving an
// inert status pill on the plan they already hold and nothing at all on the
// others.
export function PurchaseAction({
  theme,
  label,
  selected,
  loading,
  spinnerColor,
  isActivePlan,
  hasActiveSubscription,
  blockedLabel,
  priceUnknown,
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

  // Per card, unlike the block above: one product can be missing from the store
  // catalogue while its neighbours price fine. Rendered as a View so there is
  // no handler to fire at all — a tap here would send the user to the App Store
  // to be charged an amount this screen never showed them. It ranks below the
  // subscribed case, which is the more important thing to say about a card the
  // user already holds. The label is left as it was rather than replaced with
  // copy about prices; the placeholder standing where the figure should be is
  // what says the price is missing.
  if (priceUnknown) {
    return (
      <View
        style={[theme.button, theme.buttonUnselected, theme.buttonDisabled]}
      >
        <Text style={[theme.text, theme.textDisabled]}>{label}</Text>
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

// Holds the amount's place while the storefront's price is unknown. A neutral
// mark, never a figure and never copy implying one: on the Apple rail the only
// price that is true is the store's, and anything drawn in its absence is a
// number the App Store will not honour. The period stays, because "/year" is
// still true and it keeps the card from reflowing when the price lands.
export const PRICE_PLACEHOLDER = '—';

// The card renders the symbol in its own smaller style, but Apple hands back a
// single localised string ("₹499.00", "$5.99") that must not be taken apart.
export function Price({
  price,
  currencyStyle,
  amountStyle,
  periodStyle,
}: {
  price: PriceDisplay;
  currencyStyle: StyleProp<TextStyle>;
  amountStyle: StyleProp<TextStyle>;
  periodStyle: StyleProp<TextStyle>;
}) {
  return (
    <>
      {price.currency && price.amount !== null ? (
        <Text style={currencyStyle}>{price.currency}</Text>
      ) : null}
      <Text style={amountStyle}>{price.amount ?? PRICE_PLACEHOLDER}</Text>
      <Text style={periodStyle}>{price.period}</Text>
    </>
  );
}
