// Apple product identity. These strings are configured in App Store Connect
// (subscription group "Canvas Premium", group ID 22338316) and are matched
// verbatim by StoreKit — a typo here surfaces as an empty product list from
// fetchProducts rather than an error, so they are declared once and every
// other export in this file is derived from them.

/** The local plan codes an Apple product can map to. */
export type ApplePlanCode = 'MONTHLY' | 'ANNUAL';

// Apple scopes introductory-offer eligibility to the subscription GROUP, not to a
// product, so this is the id that answers "may this Apple ID still take the 3
// free days?" — the only authoritative answer there is.
export const APPLE_SUBSCRIPTION_GROUP_ID = '22338316';

export const APPLE_SKU_ANNUAL = 'com.bombaycanvas.app1.premium.annual';
export const APPLE_SKU_MONTHLY = 'com.bombaycanvas.app1.premium.monthly';

// Aliases under the APPLE_PRODUCT_ID_* naming used by the backend's
// apple.config.ts, so a reader moving between the two repos finds either name.
export const APPLE_PRODUCT_ID_ANNUAL = APPLE_SKU_ANNUAL;
export const APPLE_PRODUCT_ID_MONTHLY = APPLE_SKU_MONTHLY;

// Annual first: it is Level 1 (highest) in the subscription group and the only
// product carrying the 3-day free trial, so this doubles as display order.
export const APPLE_SKUS: readonly string[] = [
  APPLE_SKU_ANNUAL,
  APPLE_SKU_MONTHLY,
];

export const APPLE_SKU_BY_PLAN_CODE: Record<ApplePlanCode, string> = {
  ANNUAL: APPLE_SKU_ANNUAL,
  MONTHLY: APPLE_SKU_MONTHLY,
};

// The local TRIAL code is deliberately absent. It is a Razorpay-only construct
// (Rs 1 mandate + start_at) with no Apple analogue; Apple's 3 free days are an
// introductory offer *on the annual product*, so an Apple trial is an ANNUAL
// subscription whose status happens to be TRIAL. Mapping a SKU to TRIAL here
// would invent a plan Apple never sold.
export const PLAN_CODE_BY_APPLE_SKU: Record<string, ApplePlanCode> = {
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
