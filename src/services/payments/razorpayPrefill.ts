// Razorpay's prefill wants the bare national number, not the E.164 form the
// profile stores. Only an Indian number is reshaped: the last ten digits of any
// other country's number are not a number at all, and an empty field the user
// fills in beats a wrong one.
export const formatIndianMobile = (
  mobile?: string | null,
): string | undefined => {
  if (!mobile) return undefined;
  const trimmed = mobile.trim();
  const digits = trimmed.replace(/\D/g, '');
  const isIndian = trimmed.startsWith('+')
    ? digits.startsWith('91') && digits.length === 12
    : digits.length === 10 ||
      (digits.length === 12 && digits.startsWith('91')) ||
      (digits.length === 11 && digits.startsWith('0'));
  return isIndian ? digits.slice(-10) : undefined;
};
