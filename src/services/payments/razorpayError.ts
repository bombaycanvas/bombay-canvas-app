// ===========================================================================
// razorpayError.ts — is this rejection a user backing out, or a real failure?
//
// RazorpayCheckout.open() rejects for BOTH, which is why this distinction has
// to be drawn explicitly. Getting it wrong is costly in either direction: treat
// a dismissal as a failure and the user is shown an error for something they
// chose to do, and treat a failure as a dismissal and a genuine payment problem
// disappears silently.
//
// Kept separate from razorpayRail so it can be tested without the native module
// (importing the rail pulls in react-native-razorpay), the same reason
// verifyFailure.ts stands alone.
// ===========================================================================

/**
 * `Checkout.PAYMENT_CANCELED` from the Razorpay Android SDK, surfaced verbatim
 * by the React Native bridge. This is the authoritative signal; the description
 * match below is only a fallback for builds that do not set it.
 */
export const RAZORPAY_PAYMENT_CANCELLED_CODE = 2;

/**
 * Razorpay's own wording for a user dismissal, e.g. "Payment processing
 * cancelled by user". Deliberately narrow: it requires "by user" rather than
 * merely "cancelled", because a bank or gateway can also cancel a payment and
 * that is a failure the user needs to be told about.
 */
const CANCELLED_BY_USER = /cancell?ed by user/i;

/** Pull `{ code, description }` out of the shapes the bridge can reject with. */
const readErrorFields = (
  error: unknown,
): { code?: unknown; description?: unknown } => {
  if (!error || typeof error !== 'object') return {};

  const candidate = error as { code?: unknown; description?: unknown; message?: unknown };
  if (candidate.code !== undefined || candidate.description !== undefined) {
    return candidate;
  }

  // Some bridge versions reject with an Error whose message is the JSON payload
  // rather than with the payload itself.
  if (typeof candidate.message === 'string') {
    try {
      const parsed = JSON.parse(candidate.message);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      return { description: candidate.message };
    }
    return {};
  }

  return {};
};

/**
 * True when the user closed the Razorpay sheet without paying.
 *
 * Callers should treat this as a normal outcome — no error copy, no retry
 * prompt — and leave whatever state preceded checkout exactly as it was.
 */
export const isCheckoutDismissal = (error: unknown): boolean => {
  const { code, description } = readErrorFields(error);

  if (Number(code) === RAZORPAY_PAYMENT_CANCELLED_CODE) return true;
  return typeof description === 'string' && CANCELLED_BY_USER.test(description);
};
