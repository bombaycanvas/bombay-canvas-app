import { api } from '../utils/api';

export interface AppleVerifyResponse {
  subscriptionId: string;
  status: string;
}

/** One transaction the restore submitted, and whether this account may own it. */
export interface AppleLinkTransactionResult {
  originalTransactionId: string;
  linked: boolean;
  /** The server's typed refusal code when `linked` is false. */
  reason?: string;
}

export interface AppleLinkResponse {
  granted: string[];
  // The per-transaction verdicts, not just the granted count. A restore that
  // links nothing is the normal case (a device with no purchases) and a restore
  // the server REFUSED because the Apple ID's subscription belongs to another
  // Canvas account are indistinguishable from the count alone — and only the
  // second one must stop the paywall from selling a subscription Apple will
  // charge for and the server will then decline to grant.
  results: AppleLinkTransactionResult[];
  claimedOrphans: number;
}

/** Verifies one JWS from a just-completed purchase and grants the entitlement. */
export const verifyAppleTransaction = async (
  signedTransaction: string,
): Promise<AppleVerifyResponse> => {
  try {
    const response = await api('/api/monetize/subscription/apple/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { signedTransaction },
    });
    return {
      subscriptionId: response?.data?.subscriptionId ?? '',
      status: response?.data?.status ?? '',
    };
  } catch (error) {
    console.error('Verify Apple Transaction Error:', error);
    throw error;
  }
};

// There are deliberately no react-query hooks wrapping these two. A restore
// hook that called /apple/link on its own drifted from the rail adapter the
// launch sync uses: it never read the per-transaction verdicts, so a restore the
// server REFUSED reported itself as "nothing found" and left the paywall's
// ownership notice untouched. Every caller goes through
// getPaymentRail().restore(), which is the one place those verdicts are read.
//
// Restore and orphan-claim are the same server call. Streamlined Purchasing is
// on and cannot be disabled, so a subscription bought from the App Store product
// page reaches the webhook with no appAccountToken and no way back to an account;
// handing the server every JWS the App Store still holds for this Apple ID is the
// only thing that attaches it. Reinstalls and device switches take the same path.
/** Claims every subscription this Apple ID owns for the signed-in user. */
export const linkAppleTransactions = async (
  signedTransactions: string[],
): Promise<AppleLinkResponse> => {
  try {
    const response = await api('/api/monetize/subscription/apple/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { signedTransactions },
    });
    return {
      granted: response?.data?.granted ?? [],
      results: response?.data?.results ?? [],
      claimedOrphans: response?.data?.claimedOrphans ?? 0,
    };
  } catch (error) {
    console.error('Link Apple Transactions Error:', error);
    throw error;
  }
};
