import React from 'react';
import { TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import SubscriptionPlans from './SubscriptionPlans';
import type { PaywallOffers } from './paywallOffers';

// The sheet renders whatever the builder hands it, so the offers are written
// out here rather than built — these tests are about what the cards DO with an
// unpriced offer, not about how one comes to be unpriced.
const PRICED: PaywallOffers = {
  pricesUnavailable: false,
  monthly: { currency: null, amount: '$5.99', period: '/month' },
  annual: { currency: null, amount: '$59.99', period: '/year' },
  annualPerMonthLabel: 'Only $5.00/month',
  annualStrikePrice: null,
  savingsPercent: 17,
  trial: null,
  offered: { monthly: true, annual: true },
  trialConsumedNotice: null,
};

const UNPRICED: PaywallOffers = {
  ...PRICED,
  pricesUnavailable: true,
  monthly: { currency: null, amount: null, period: '/month' },
  annual: { currency: null, amount: null, period: '/year' },
  annualPerMonthLabel: null,
  savingsPercent: null,
};

const renderPlans = (offers: PaywallOffers, handlePurchase: jest.Mock) => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SubscriptionPlans
        selectedPlan="annual"
        setSelectedPlan={() => {}}
        handlePurchase={handlePurchase}
        loading={false}
        offers={offers}
      />,
    );
  });
  return renderer;
};

// Fires every touchable the sheet actually rendered, ignoring their `disabled`
// flag: "the button is disabled" is a weaker promise than "no touchable is
// wired to a purchase at all", and the second is what an unpriced card needs.
//
// Only the touchables the sheet RENDERED count. PurchaseAction's own `onPress`
// prop is the callback waiting to be wired, so sweeping composite props instead
// would report a purchase on a card that renders an inert View.
const pressEverything = (root: ReactTestInstance) => {
  const pressables = root.findAll(node => node.type === TouchableOpacity, {
    deep: true,
  });
  ReactTestRenderer.act(() => {
    pressables.forEach(node => node.props.onPress());
  });
};

const readText = (renderer: ReactTestRenderer.ReactTestRenderer): string =>
  JSON.stringify(renderer.toJSON());

describe('the paywall cards when the store gave no price', () => {
  it('cannot start a purchase from an unpriced card', () => {
    const handlePurchase = jest.fn();
    const renderer = renderPlans(UNPRICED, handlePurchase);

    pressEverything(renderer.root);

    expect(handlePurchase).not.toHaveBeenCalled();
  });

  // The control: the same sweep does buy when there is a price to buy at, so
  // the assertion above is about the missing price and not about the harness.
  it('still starts a purchase from a priced card', () => {
    const handlePurchase = jest.fn();
    const renderer = renderPlans(PRICED, handlePurchase);

    pressEverything(renderer.root);

    expect(handlePurchase).toHaveBeenCalledWith('annual');
  });

  it('draws a neutral placeholder instead of a figure', () => {
    const rendered = readText(renderPlans(UNPRICED, jest.fn()));

    expect(rendered).toContain('—');
    // The DB's rupee figures are the ones this used to fall back to.
    expect(rendered).not.toContain('₹');
    expect(rendered).not.toContain('499');
  });
});
