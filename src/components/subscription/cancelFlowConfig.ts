// planCodes, not api/subscription: the latter reaches AsyncStorage through
// utils/api the moment it is imported, which drags a native module into a module
// that only wants to know what a trial code is — and into any test that imports
// it. CancelReasonCode is a type-only import, so it is erased entirely.
import { isTrialCode, type PlanCode } from '../../api/planCodes';
import type { CancelReasonCode } from '../../api/subscription';

export interface CancelReasonOption {
  code: CancelReasonCode;
  label: string;
}

export const OTHER_TEXT_MAX = 200;
export const OTHER_TEXT_MIN = 3;

// `paidUpfront` is the only thing that differs between the rails: Razorpay takes
// ₹1 to authorise the mandate, while an App Store introductory offer is free or
// a price tier and never ₹1. Quoting a fee an Apple user was never charged makes
// the option unpickable for the very people it is meant to catch. The reason
// CODES are identical either way, so the backend contract is untouched.
const trialReasons = (paidUpfront: boolean): CancelReasonOption[] => [
  { code: 'UNAWARE_OF_CHARGE', label: "I didn't realise I'd be charged after the trial" },
  { code: 'TOO_EXPENSIVE', label: 'The yearly price is too much' },
  { code: 'NOT_ENOUGH_CONTENT', label: 'Not enough content I want to watch' },
  {
    code: 'JUST_TRYING',
    label: paidUpfront
      ? 'I only wanted to try it for ₹1'
      : 'I only wanted to try it out',
  },
  { code: 'TECHNICAL_ISSUES', label: 'Playback or app problems' },
  { code: 'OTHER', label: 'Something else' },
];

const PAID_REASONS: CancelReasonOption[] = [
  { code: 'NOT_WATCHING', label: "I'm not watching enough to justify it" },
  { code: 'TOO_EXPENSIVE', label: 'Too expensive' },
  { code: 'NOT_ENOUGH_CONTENT', label: 'Not enough content I want to watch' },
  { code: 'TECHNICAL_ISSUES', label: 'Playback or app problems' },
  { code: 'OTHER', label: 'Something else' },
];

/**
 * Trial users cancel over the post-trial charge, paid users over usage — the two
 * lists are deliberately different, and sending a trial user the PAID list drops
 * the one reason that explains most trial churn ("I didn't realise I'd be
 * charged after the trial").
 *
 * `inTrial` is the subscription's STATUS, and it is required because the plan
 * code cannot answer this across both rails. Razorpay files a trial under a
 * trial CODE; Apple files it under the plain yearly plan its free-days product
 * bills against (ANNUAL_POST_TRIAL), so `isTrialCode` is false for every Apple
 * trial and an iOS user cancelling mid-trial was being handed the paid list.
 *
 * The code check stays alongside it: a Razorpay trial that has CONVERTED keeps
 * its trial code with status ACTIVE, and "I didn't realise I'd be charged" is
 * exactly what that person is cancelling over.
 */
export const getCancelReasons = (
  planCode: PlanCode,
  inTrial: boolean,
): CancelReasonOption[] =>
  inTrial || isTrialCode(planCode)
    ? trialReasons(isTrialCode(planCode))
    : PAID_REASONS;
