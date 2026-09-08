// Apple product identity. These strings are configured in App Store Connect
// (subscription group "Canvas Premium", group ID 22338316) and are matched
// verbatim by StoreKit — a typo here surfaces as an empty product list from
// fetchProducts rather than an error, so they are declared once and every
// other export in this file is derived from them.

/** The local plan codes an Apple product can map to. */
export type ApplePlanCode = 'MONTHLY' | 'ANNUAL' | 'ANNUAL_POST_TRIAL';

// Apple scopes introductory-offer eligibility to the subscription GROUP, not to a
// product, so this is the id that answers "may this Apple ID still take the 3
// free days?" — the only authoritative answer there is.
export const APPLE_SUBSCRIPTION_GROUP_ID = '22338316';

export const APPLE_SKU_ANNUAL = 'com.bombaycanvas.app1.premium.annual';
export const APPLE_SKU_MONTHLY = 'com.bombaycanvas.app1.premium.monthly';

// The trial product: 3 free days, then ₹899/year. Its own product rather than an
// introductory offer on the ₹499 annual, because Apple cannot charge the ₹1 the
// Razorpay trial takes — an App Store intro offer is free or a price tier, never
// ₹1. So the two rails hook differently ("₹1 today" vs "3 days free") and
// converge on the same ₹899 conversion.
export const APPLE_SKU_ANNUAL_TRIAL =
  'com.bombaycanvas.app1.premium.annual.trial';

// Aliases under the APPLE_PRODUCT_ID_* naming used by the backend's
// apple.config.ts, so a reader moving between the two repos finds either name.
export const APPLE_PRODUCT_ID_ANNUAL = APPLE_SKU_ANNUAL;
export const APPLE_PRODUCT_ID_MONTHLY = APPLE_SKU_MONTHLY;
export const APPLE_PRODUCT_ID_ANNUAL_TRIAL = APPLE_SKU_ANNUAL_TRIAL;

// Trial first: it is the product carrying the 3 free days and the one the
// paywall leads with. This doubles as display order and as the fetch list — a
// SKU missing here is a product StoreKit is never asked about, which surfaces as
// a card that silently does not render.
export const APPLE_SKUS: readonly string[] = [
  APPLE_SKU_ANNUAL_TRIAL,
  APPLE_SKU_ANNUAL,
  APPLE_SKU_MONTHLY,
];

export const APPLE_SKU_BY_PLAN_CODE: Record<ApplePlanCode, string> = {
  ANNUAL_POST_TRIAL: APPLE_SKU_ANNUAL_TRIAL,
  ANNUAL: APPLE_SKU_ANNUAL,
  MONTHLY: APPLE_SKU_MONTHLY,
};

// The local TRIAL / TRIAL_NEW codes are still deliberately absent. They are
// Razorpay-only constructs (₹1 mandate + start_at) that Apple cannot express, so
// mapping a SKU to one would invent a plan Apple never sold.
//
// The free days now ride their own product rather than the ₹499 annual, and that
// product bills ₹899/year — which is ANNUAL_POST_TRIAL's amount, so that is what
// it maps to. An Apple trial is therefore still a plain yearly subscription
// whose STATUS happens to be TRIAL; the code just names the ₹899 yearly plan
// instead of the ₹499 one.
export const PLAN_CODE_BY_APPLE_SKU: Record<string, ApplePlanCode> = {
  [APPLE_SKU_ANNUAL_TRIAL]: 'ANNUAL_POST_TRIAL',
  [APPLE_SKU_ANNUAL]: 'ANNUAL',
  [APPLE_SKU_MONTHLY]: 'MONTHLY',
};

// Prefer this over indexing PLAN_CODE_BY_APPLE_SKU directly. noUncheckedIndexedAccess
// is off, so TypeScript types that lookup as a plain ApplePlanCode even though an
// unrecognised SKU returns undefined at runtime — the ?? null is what makes the
// declared return type honest, not redundant.
/** Plan code for an Apple product id, or null when the SKU is not one of ours. */
export const getPlanCodeForAppleSku = (sku: string): ApplePlanCode | null =>
  PLAN_CODE_BY_APPLE_SKU[sku] ?? null;

/** True when the SKU is one this build sells — guard StoreKit payloads with this. */
export const isKnownAppleSku = (sku: string): boolean =>
  getPlanCodeForAppleSku(sku) !== null;
