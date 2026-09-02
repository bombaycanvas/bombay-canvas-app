// ===========================================================================
// planCodes.ts — the plan/trial vocabulary, and nothing else.
//
// Split out of api/subscription because this is pure data: no fetch, no
// storage, no React. api/subscription reaches AsyncStorage through utils/api
// the moment it is imported, which drags a native module into anything that
// only wanted to know what a trial code is — including paywallOffers, whose
// tests re-import it under a mocked react-native.
//
// api/subscription re-exports everything here, so callers may import from
// either; prefer this module from anything that must stay side-effect free.
// ===========================================================================

export type PlanCode = 'MONTHLY' | 'ANNUAL' | 'TRIAL' | 'TRIAL_NEW';

/** Trial codes in ascending preference order — later entries win. */
export const TRIAL_CODES: PlanCode[] = ['TRIAL', 'TRIAL_NEW'];

/** Whether a plan code is a trial, at any price. */
export const isTrialCode = (code?: string | null): boolean =>
  code != null && TRIAL_CODES.includes(code as PlanCode);

export interface Plan {
  code: PlanCode;
  name: string;
  description: string;
  period: 'monthly' | 'yearly';
  /** PAISE. Divide by 100 to display. For a trial this is the POST-trial price. */
  price: number;
  currency: string;
  trial?: {
    days: number;
    /** Real window length; shortened from `days` only in test environments. */
    durationMinutes: number;
    /** PAISE charged today to authorise the mandate (₹1 = 100). */
    upfrontAmount: number;
  };
  // Present only for iOS callers, and never on a trial code: Apple's free days
  // are an introductory offer on the annual product, not a product of their own.
  appleProductId?: string;
}

/**
 * The single trial to show, out of everything the API returned: the newest code
 * in `TRIAL_CODES` that is actually present.
 *
 * This is what stops the paywall rendering two trial cards at two prices. The
 * choice lives client-side because the server cannot tell an old build from a
 * new one — it offers both and each client takes the newest code it understands.
 */
export const pickTrialPlan = (plans?: Plan[] | null): Plan | undefined => {
  if (!Array.isArray(plans)) return undefined;
  for (let i = TRIAL_CODES.length - 1; i >= 0; i--) {
    const match = plans.find(p => p.code === TRIAL_CODES[i]);
    if (match) return match;
  }
  return undefined;
};
