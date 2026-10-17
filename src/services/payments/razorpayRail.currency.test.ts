// /create resolves the region again, so its currency can differ from the card
// the user tapped (the store country arrived late, a VPN or network switch).
// Razorpay's sheet must never open in a currency the user wasn't shown.

const mockOpen = jest.fn();
const mockCreate = jest.fn();

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: { open: (...args: unknown[]) => mockOpen(...args) },
}));
jest.mock('../../api/subscription', () => ({
  createSubscription: (...args: unknown[]) => mockCreate(...args),
  cancelSubscription: jest.fn(),
  verifySubscription: jest.fn(),
  isTrialCode: (code: string) => code === 'TRIAL' || code === 'TRIAL_NEW',
}));
jest.mock('../../utils/analytics/log', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { razorpayRail } from './razorpayRail';

const created = (currency?: string) => ({
  subscriptionId: 'sub_local',
  razorpaySubscriptionId: 'sub_rzp',
  razorpayKeyId: 'rzp_test_key',
  ...(currency ? { currency } : {}),
});

beforeEach(() => {
  mockOpen.mockReset();
  mockCreate.mockReset();
});

describe('razorpayRail.startPurchase — currency check', () => {
  it('refuses to open checkout when /create priced a different currency', async () => {
    mockCreate.mockResolvedValue(created('USD'));

    await expect(
      razorpayRail.startPurchase({ planCode: 'MONTHLY', expectedCurrency: 'INR' }),
    ).rejects.toMatchObject({ code: 'PRICES_CHANGED' });
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('opens checkout when the currencies match', async () => {
    mockCreate.mockResolvedValue(created('USD'));
    mockOpen.mockRejectedValue({ code: 2, description: 'dismissed' });

    await razorpayRail
      .startPurchase({ planCode: 'MONTHLY', expectedCurrency: 'USD' })
      .catch(() => {});
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  // A missing key must fail before checkout, never fall back to a fake one.
  it('refuses to open checkout without a Razorpay key', async () => {
    mockCreate.mockResolvedValue({ ...created('INR'), razorpayKeyId: undefined });

    await expect(
      razorpayRail.startPurchase({ planCode: 'MONTHLY', expectedCurrency: 'INR' }),
    ).rejects.toThrow('Payments are unavailable');
    expect(mockOpen).not.toHaveBeenCalled();
  });

  // A server that predates regional pricing sends no currency: it is INR.
  it('reads a missing currency as INR', async () => {
    mockCreate.mockResolvedValue(created());
    mockOpen.mockRejectedValue({ code: 2, description: 'dismissed' });

    await razorpayRail
      .startPurchase({ planCode: 'MONTHLY', expectedCurrency: 'INR' })
      .catch(() => {});
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });
});
