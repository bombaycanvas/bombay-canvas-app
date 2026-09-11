import { isTrialCode } from '../../api/planCodes';
import type { Plan, PlanCode } from '../../api/planCodes';
import { APPLE_SKU_BY_PLAN_CODE } from '../../config/iap';
import type { ApplePlanCode } from '../../config/iap';
import type { AppleProduct } from '../../services/iap/appleIap';

/** What a checkout is worth, in the currency the storefront would charge it in. */
export interface ConversionValue {
  /**
   * MAJOR units of `currency`. undefined when no figure this rail would actually
   * charge could be resolved.
   *
   * Meta optimises delivery against whatever value it is handed, so a guessed
   * one is not a harmless placeholder — it teaches the pixel that a conversion
   * is worth something it is not, and it does so silently. An omitted value
   * costs the event its revenue weighting and nothing else, which is why the
   * ₹499/₹99 fallback that used to sit here was deleted rather than corrected.
   */
  value?: number;
  currency: string;
}

export interface ConversionValueInput {
  planCode: PlanCode;
  /** GET /plans, whose `price` is PAISE — the Razorpay rail's charged amount. */
  plans?: Plan[] | null;
  /** The App Store catalogue's products. Absent or null off the Apple rail. */
  appleProducts?: AppleProduct[] | null;
  isAppleRail: boolean;
}

// The rail Razorpay bills on, and the only currency our own tables record a
// price in. It is also the last resort for an Apple checkout whose storefront
// currency is unknown — which only ever happens alongside an undefined value,
// so it labels an event that carries no amount to mislabel.
const HOME_CURRENCY = 'INR';

// noUncheckedIndexedAccess is off, so an index into a Record keyed by
// ApplePlanCode types as a plain string even for TRIAL / TRIAL_NEW, which are
// deliberately absent from it (see config/iap). The cast is what makes the
// undefined a caller must handle visible to the compiler.
const appleSkuFor = (planCode: PlanCode): string | undefined =>
  (APPLE_SKU_BY_PLAN_CODE as Partial<Record<PlanCode, string>>)[
    planCode as ApplePlanCode
  ];

/**
 * The value and currency to report for a checkout on the active rail.
 *
 * The screen used to report `currency: 'INR'` against a rupee figure from our
 * own database for every buyer on earth, so a US App Store subscriber charged
 * $59.99 was reported to Meta as a ₹499 conversion — wrong number, wrong
 * currency, and wrong in the direction that makes the campaign look cheap.
 */
export const resolveConversionValue = ({
  planCode,
  plans,
  appleProducts,
  isAppleRail,
}: ConversionValueInput): ConversionValue => {
  if (isAppleRail) {
    const sku = appleSkuFor(planCode);
    const product = sku
      ? appleProducts?.find(candidate => candidate.sku === sku)
      : undefined;

    // A device is signed into exactly one storefront, so every product in a
    // catalogue is priced in the same currency — any of them answers "which
    // currency is this user charged in" even when the one being bought is
    // missing from the payload.
    const currency =
      product?.currency ?? appleProducts?.[0]?.currency ?? HOME_CURRENCY;

    // A trial start carries no value on either rail: Apple charges nothing for a
    // free intro period and at most a token intro price for a paid one, Razorpay
    // charges ₹1 to authorise the mandate, and reporting either would have Meta
    // optimise for a conversion worth a fraction of the plan behind it. The real
    // price rides predicted_ltv, which the backend sends.
    if (isTrialCode(planCode)) return { currency };

    // StoreKit already quotes `price` in major units, unlike Plan.price and
    // unlike the milliunits Apple's server-side transaction payloads carry.
    return { value: product?.price ?? undefined, currency };
  }

  if (isTrialCode(planCode)) return { currency: HOME_CURRENCY };

  const plan = plans?.find(candidate => candidate.code === planCode);
  return {
    value: plan ? plan.price / 100 : undefined,
    currency: HOME_CURRENCY,
  };
};
