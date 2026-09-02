import type { QueryClient } from '@tanstack/react-query';
import type { RestoredTransaction } from '../../services/paymentRail';

/** The server's typed refusal when a transaction belongs to another account's Subscription. */
export const APPLE_OWNERSHIP_CONFLICT_CODE =
  'APPLE_TRANSACTION_OWNED_BY_ANOTHER_USER';

export interface AppleOwnershipConflict {
  /** Apple's transaction id, so support can find the row without asking the user for it. */
  transactionId: string;
}

export const APPLE_OWNERSHIP_CONFLICT_QUERY_KEY = ['appleOwnershipConflict'];

// Three places learn this verdict — the launch/login sync, the restore button,
// and a verify that came back refused — and the paywall has to reflect whichever
// spoke last. They share one writer so a new caller cannot invent a second key
// and leave the notice reading a cache nobody updates.
/** Publishes the paywall's ownership verdict. Pass null to clear it. */
export const setAppleOwnershipConflict = (
  queryClient: QueryClient,
  conflict: AppleOwnershipConflict | null,
): void => {
  queryClient.setQueryData(APPLE_OWNERSHIP_CONFLICT_QUERY_KEY, conflict);
};

// Apple issues ONE originalTransactionId per Apple ID and subscription group and
// reuses it for the whole life of the subscription, so a SECOND Canvas account
// signing in on the same device asks the server to link a transaction the first
// account already owns. The server refuses when that subscription is still live,
// and it is right to: re-parenting a live row would revoke someone's paid access
// to grant someone else's. But the App Store would still happily charge for a
// fresh purchase that lands on the exact same refusal, leaving the payer with
// nothing. Reading the refusal here is what lets the paywall stop the money
// before Apple takes it.
//
// A LAPSED subscription is not a conflict and never reaches here: the server
// hands that row over instead, so a returning customer on a new email is
// granted rather than blocked.
//
// A grant anywhere in the same restore clears the verdict: this account IS
// entitled through some transaction, so whatever else the Apple ID holds — a
// retired product, a subscription bought on a family member's account — is
// blocking nothing and must not take the paywall away.
export const readAppleOwnershipConflict = (
  restored: RestoredTransaction[],
): AppleOwnershipConflict | null => {
  if (restored.some(transaction => transaction.linked)) return null;

  const conflict = restored.find(
    transaction =>
      !transaction.linked &&
      transaction.reason === APPLE_OWNERSHIP_CONFLICT_CODE,
  );
  return conflict ? { transactionId: conflict.id } : null;
};
