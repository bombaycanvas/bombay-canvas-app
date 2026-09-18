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
  annualPerMonthLabel: "That's just $5.00/month",
  annualStrikePrice: null,
  savingsPercent: 17,
  trial: null,
  offered: { monthly: true, annual: true },
  trialConsumedNotice: null,
  heroCopy: {
    ctaLabel: 'Join Canvas for $59.99/year →',
    savings: { headline: 'Save $12', body: 'compared with paying monthly' },
    footnote: 'Full access today. Cancel anytime.',
    monthlyNote: 'Flexible option. Higher cost over time than annual.',
    trialNote: null,
    trialConversionLabel: null,
    renewalNote: {
      monthly: 'Renews at $5.99/month. Cancel anytime in Settings.',
      annual: 'Renews at $59.99/year. Cancel anytime in Settings.',
    },
  },
};

// Nothing here may carry a figure: the whole point of the unpriced state is that
// no number on this sheet came from anywhere but the store.
const UNPRICED: PaywallOffers = {
  ...PRICED,
  pricesUnavailable: true,
  monthly: { currency: null, amount: null, period: '/month' },
  annual: { currency: null, amount: null, period: '/year' },
  annualPerMonthLabel: null,
  savingsPercent: null,
  heroCopy: {
    ...PRICED.heroCopy!,
    ctaLabel: 'Join Canvas',
    savings: null,
    renewalNote: { monthly: null, annual: null },
  },
};

const WITH_TRIAL: PaywallOffers = {
  ...PRICED,
  trial: {
    planCode: 'ANNUAL_POST_TRIAL',
    title: '3-Day Trial',
    price: { currency: null, amount: '$0', period: ' today' },
    buttonLabel: 'Start Free Trial →',
    footnote: '3 days free, then $99.99/year. Cancel anytime in Settings.',
  },
  heroCopy: {
    ...PRICED.heroCopy!,
    savings: {
      headline: 'Save $40',
      body: 'compared with starting with the trial',
    },
    footnote: 'No trial. No waiting. Full access today.',
    trialNote:
      "Great if you want to try first, but you'll pay $40 more in the first year.",
    trialConversionLabel: 'Then $99.99/year',
  },
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

// The iOS sheet leads with annual and demotes the trial beside monthly, so the
// hero has to carry the whole argument for it.
describe('the annual hero sheet', () => {
  it('leads with the annual price and the reason to take it', () => {
    const rendered = readText(renderPlans(WITH_TRIAL, jest.fn()));

    expect(rendered).toContain('BEST VALUE');
    expect(rendered).toContain('$59.99');
    expect(rendered).toContain('Join Canvas for $59.99/year →');
    expect(rendered).toContain('Save $40');
    expect(rendered).toContain('compared with starting with the trial');
  });

  it('keeps the trial as a secondary card that owns up to its cost', () => {
    const rendered = readText(renderPlans(WITH_TRIAL, jest.fn()));

    expect(rendered).toContain('3-Day Trial');
    expect(rendered).toContain('Then $99.99/year');
    expect(rendered).toContain(
      "Great if you want to try first, but you'll pay $40 more in the first year.",
    );
  });

  // The hero is the selected card here, so its fine print is the one that
  // applies - naming the trial's renewal under a tap that starts no trial is
  // the mis-sell this screen exists to avoid.
  it('shows the fine print of the card the user is about to buy', () => {
    const rendered = readText(renderPlans(WITH_TRIAL, jest.fn()));

    expect(rendered).toContain('Renews at $59.99/year');
    expect(rendered).not.toContain('3 days free, then');
  });

  it('drops the trial card entirely when the rail is offering none', () => {
    const rendered = readText(renderPlans(PRICED, jest.fn()));

    expect(rendered).not.toContain('Trial');
    expect(rendered).toContain('Full access today. Cancel anytime.');
  });
});
