import { isTrialCode, type CancelReasonCode, type PlanCode } from '../../api/subscription';

export interface CancelReasonOption {
  code: CancelReasonCode;
  label: string;
}

export const OTHER_TEXT_MAX = 200;
export const OTHER_TEXT_MIN = 3;

const TRIAL_REASONS: CancelReasonOption[] = [
  { code: 'UNAWARE_OF_CHARGE', label: "I didn't realise I'd be charged after the trial" },
  { code: 'TOO_EXPENSIVE', label: 'The yearly price is too much' },
  { code: 'NOT_ENOUGH_CONTENT', label: 'Not enough content I want to watch' },
  { code: 'JUST_TRYING', label: 'I only wanted to try it for ₹1' },
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

// Trial users cancel over the post-trial charge, paid users over usage — the two lists are deliberately different.
// Keyed on isTrialCode, not on a 'TRIAL' literal: there is more than one trial
// code, and sending a trial user the PAID list drops the one reason that
// explains most trial churn ("I didn't realise I'd be charged after the trial").
export const getCancelReasons = (planCode: PlanCode): CancelReasonOption[] =>
  isTrialCode(planCode) ? TRIAL_REASONS : PAID_REASONS;
