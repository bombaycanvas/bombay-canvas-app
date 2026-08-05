import { Dimensions, PixelRatio, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { Base64 } from 'js-base64';

/**
 * Builds the `X-Client-App-Data` header — the device snapshot Meta requires on
 * every app conversion.
 *
 * The backend freezes this onto the Subscription row at create time, because
 * the Razorpay webhook that activates the row minutes later has no request
 * context and cannot read a header. It also reads it live on the auth endpoints
 * for CompleteRegistration.
 *
 * Backend contract (bombay-canvas-be/src/utils/requestOrigin.ts):
 *   header  : X-Client-App-Data, standard base64 (NOT base64url), <= 4096 chars
 *   payload : { advertiser_tracking_enabled, application_tracking_enabled?, extinfo }
 *
 * The backend REJECTS rather than repairs — a snapshot that fails validation is
 * dropped and the conversion is suppressed entirely, not sent degraded. So a
 * mistake here shows up as zero app conversions, not bad ones. The backend logs
 * `suppressed: app conversion carries no usable device snapshot` when that happens.
 */

/**
 * `extinfo` is POSITIONAL and must be exactly 16 elements. Meta reads slot 4 as
 * the OS version regardless of what is in it, so a short array does not degrade
 * gracefully — it shifts every field after the gap. Unknown values are therefore
 * the empty string, NEVER omitted.
 */
const EXTINFO_LENGTH = 16;

/** Base64 of a well-formed snapshot is ~350 chars; the backend caps at 4096. */
const MAX_HEADER_LENGTH = 4096;

/**
 * Device facts don't change during a session, and this runs on the payment path,
 * so the encoded header is built once at init and reused.
 */
let cachedHeader: string | null = null;

/** Every field is best-effort. A missing slot must not cost us the conversion. */
const safe = (read: () => unknown): string => {
  try {
    const value = read();
    if (value === null || value === undefined) return '';
    return String(value);
  } catch {
    return '';
  }
};

/** Meta wants "en_IN"; Intl reports "en-IN". */
const readLocale = (): string =>
  safe(() => Intl.DateTimeFormat().resolvedOptions().locale).replace('-', '_');

/** IANA name, e.g. "Asia/Kolkata". */
const readTimezone = (): string =>
  safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

/**
 * Short timezone label, e.g. "IST". Not one of Meta's two required slots — some
 * engines return "GMT+5:30" here, which is a worse label but still truthful.
 */
const readTimezoneAbbreviation = (): string =>
  safe(
    () =>
      new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
        .formatToParts(new Date())
        .find(part => part.type === 'timeZoneName')?.value,
  );

const bytesToGb = (read: () => number): string => {
  const raw = safe(read);
  if (!raw) return '';
  const gb = Number(raw) / 1024 ** 3;
  return Number.isFinite(gb) ? String(Math.round(gb)) : '';
};

/**
 * On iOS the hardware string ("iPhone15,2") is the more useful identifier; on
 * Android getDeviceId() returns Build.BOARD, which is not the model, so use
 * getModel() there.
 */
const readDeviceModel = (): string =>
  Platform.OS === 'ios'
    ? safe(() => DeviceInfo.getDeviceId())
    : safe(() => DeviceInfo.getModel());

const buildExtinfo = (): string[] => {
  const window = Dimensions.get('window');

  const extinfo = [
    Platform.OS === 'ios' ? 'i2' : 'a2', // 0  version        REQUIRED
    safe(() => DeviceInfo.getBundleId()), // 1  package name
    safe(() => DeviceInfo.getVersion()), // 2  short version
    `${safe(() => DeviceInfo.getVersion())}.${safe(() =>
      DeviceInfo.getBuildNumber(),
    )}`, // 3  long version
    safe(() => DeviceInfo.getSystemVersion()), // 4  OS version     REQUIRED
    readDeviceModel(), // 5  device model
    readLocale(), // 6  locale
    readTimezoneAbbreviation(), // 7  tz abbreviation
    safe(() => DeviceInfo.getCarrierSync()), // 8  carrier
    safe(() => Math.round(window.width)), // 9  screen width
    safe(() => Math.round(window.height)), // 10 screen height
    safe(() => PixelRatio.get()), // 11 screen density
    '', // 12 CPU cores — not exposed by react-native-device-info
    bytesToGb(() => DeviceInfo.getTotalDiskCapacitySync()), // 13 storage GB
    bytesToGb(() => DeviceInfo.getFreeDiskStorageSync()), // 14 free storage GB
    readTimezone(), // 15 device timezone
  ];

  // Belt and braces: the backend drops the whole snapshot on a length mismatch,
  // so guarantee the contract here rather than discovering it in Events Manager.
  return extinfo
    .slice(0, EXTINFO_LENGTH)
    .concat(Array(Math.max(0, EXTINFO_LENGTH - extinfo.length)).fill(''));
};

/**
 * Build and cache the header. Call once from initMetaSdk(), AFTER the ATT
 * status is known.
 *
 * `advertiserTrackingEnabled` must be the SAME boolean passed to
 * Settings.setAdvertiserTrackingEnabled(). If the SDK event says denied and the
 * server event says allowed, the two describe one user differently and dedup
 * quality suffers.
 *
 * `application_tracking_enabled` is deliberately omitted rather than defaulted:
 * Meta reads a supplied 0 as an explicit opt-out.
 */
export const buildAppDataHeader = (
  advertiserTrackingEnabled: boolean,
): void => {
  try {
    const payload = {
      advertiser_tracking_enabled: advertiserTrackingEnabled ? 1 : 0,
      extinfo: buildExtinfo(),
    };

    // Standard base64 of UTF-8. btoa is not UTF-8 safe and mangles non-ASCII
    // carrier and model names, which is why js-base64 is used here.
    const encoded = Base64.encode(JSON.stringify(payload));

    cachedHeader = encoded.length <= MAX_HEADER_LENGTH ? encoded : null;
  } catch (err) {
    cachedHeader = null;
    console.warn('[analytics] app data header build failed', err);
  }
};

/** Null until initMetaSdk() has run, and on web-only or failed builds. */
export const getAppDataHeader = (): string | null => cachedHeader;
