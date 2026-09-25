import {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

export const DEFAULT_COUNTRY: CountryCode = 'IN';

export interface PhoneDraft {
  country: CountryCode;
  /** National number as typed; may contain spaces or a trunk-prefix 0. */
  number: string;
}

export const callingCodeOf = (country: CountryCode) =>
  isSupportedCountry(country) ? `+${getCountryCallingCode(country)}` : '';

const countryForCallingCode = (callingCode: string) =>
  getCountries().find(c => getCountryCallingCode(c) === callingCode);

/** "+919876543210" → { country: 'IN', number: '9876543210' }; empty → India. */
export const splitPhone = (e164?: string | null): PhoneDraft => {
  const parsed = e164 ? parsePhoneNumberFromString(e164) : undefined;
  if (!parsed) return { country: DEFAULT_COUNTRY, number: '' };
  // An unassigned number has no country; any country sharing the calling
  // code still rebuilds the same E.164 value.
  const country =
    parsed.country ??
    countryForCallingCode(parsed.countryCallingCode) ??
    DEFAULT_COUNTRY;
  return { country, number: parsed.nationalNumber };
};

export const phoneDigits = (phone: PhoneDraft) =>
  phone.number.replace(/\D/g, '');

const parseDraft = (phone: PhoneDraft) =>
  isSupportedCountry(phone.country) && phoneDigits(phone)
    ? parsePhoneNumberFromString(phoneDigits(phone), phone.country)
    : undefined;

/**
 * E.164 for the draft, dropping a national trunk prefix ("09876543210" in IN
 * → "+919876543210"). Undefined when the draft isn't a parseable number.
 */
export const toE164 = (phone: PhoneDraft): string | undefined =>
  parseDraft(phone)?.number;

export const isValidPhone = (phone: PhoneDraft) =>
  !!parseDraft(phone)?.isValid();
