import { APPLE_OWNERSHIP_CONFLICT_CODE } from '../../components/subscription/appleOwnershipConflict';

/** What a failed /apple/verify means for the StoreKit transaction behind it. */
export type VerifyFailureClass = 'terminal' | 'retryable';

export interface VerifyFailureVerdict {
  kind: VerifyFailureClass;
  /** The server's typed code, when it sent one. */
  code?: string;
  /** Present only on a terminal verdict: what to tell the user, once. */
  message?: string;
}

// A verify failure is only ever finished on a code from THIS list. Each one is
// a decision the server has already made and recorded, and re-submitting the
// same JWS re-runs the same check against the same data — so the App Store's
// replay cannot turn any of them into a grant, and leaving the transaction
// queued only buys an error toast on every launch, forever.
const TERMINAL_MESSAGES: Record<string, string> = {
  // No offer to move it across. There is no tool that does that today, and a
  // promise support cannot keep costs the user a second wait on top of the
  // charge. Apple owns the refund, so Apple is where they are sent.
  [APPLE_OWNERSHIP_CONFLICT_CODE]:
    "This Apple ID's subscription belongs to another Canvas account. Sign in with that account to use it. If you were charged just now, request a refund from Apple.",
  APPLE_FAMILY_SHARED_UNSUPPORTED:
    'Family Shared subscriptions are not supported. Please subscribe with your own Apple ID.',
  APPLE_PRODUCT_NOT_SOLD:
    'This subscription is no longer offered. Contact support and we will sort it out.',
};

const readServerCode = (error: unknown): string | null => {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' && code.length > 0 ? code : null;
};

/**
 * Whether a failed verify should finish the StoreKit transaction or leave it
 * queued for the App Store to replay.
 *
 * Retryable is the DEFAULT and every unrecognised failure takes it. That
 * asymmetry is the whole safety property: an unfinished transaction costs a
 * duplicate verify on the next launch, while a wrongly finished one is a
 * purchase the App Store will never mention again — the user has paid and
 * nothing on the device can prove it. A network blip, a 500, a deploy in
 * progress and a code this build has never heard of are all indistinguishable
 * from "try again later", so they are all treated as it.
 */
export const classifyVerifyFailure = (error: unknown): VerifyFailureVerdict => {
  const code = readServerCode(error);
  const message = code ? TERMINAL_MESSAGES[code] : undefined;
  return message
    ? { kind: 'terminal', code: code ?? undefined, message }
    : { kind: 'retryable', code: code ?? undefined };
};
