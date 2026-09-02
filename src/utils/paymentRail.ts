import { Platform } from 'react-native';

/** The two doors money can come through. The backend treats them identically. */
export type PaymentRail = 'apple' | 'razorpay';

// The ONLY Platform.OS check in the app that decides how money is taken. Apple
// guideline 3.1.1 requires an iOS subscription to be sold through In-App
// Purchase, so the Razorpay checkout must be unreachable on iOS rather than
// merely hidden. Keeping the decision in one constant means there is a single
// line to audit, and no screen can grow a second opinion about which rail it is
// on.
export const PAYMENT_RAIL: PaymentRail =
  Platform.OS === 'ios' ? 'apple' : 'razorpay';

export const IS_APPLE_RAIL = PAYMENT_RAIL === 'apple';
export const IS_RAZORPAY_RAIL = PAYMENT_RAIL === 'razorpay';
