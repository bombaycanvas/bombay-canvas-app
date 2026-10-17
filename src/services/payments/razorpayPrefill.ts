// Razorpay's prefill wants the bare national number, not the E.164 form the
// profile stores. Only an unmistakably Indian number is reshaped: the last ten
// digits of any other country's number are not a number at all, and an empty
// field the user fills in beats a wrong one.
//
// Unmistakable means +91/91 followed by a mobile, or a bare 10-digit mobile.
// Indian mobiles start 6-9. A leading-zero form (09876543210) is NOT accepted:
// it is indistinguishable from a UK "07…" mobile.
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export const formatIndianMobile = (
  mobile?: string | null,
): string | undefined => {
  if (!mobile) return undefined;
  const trimmed = mobile.trim();
  const digits = trimmed.replace(/\D/g, '');
  const national =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : !trimmed.startsWith('+') && digits.length === 10
      ? digits
      : null;
  return national && INDIAN_MOBILE.test(national) ? national : undefined;
};
