import { Dimensions, PixelRatio, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { Base64 } from 'js-base64';


const EXTINFO_LENGTH = 16;

const MAX_HEADER_LENGTH = 4096;


let cachedHeader: string | null = null;

const safe = (read: () => unknown): string => {
  try {
    const value = read();
    if (value === null || value === undefined) return '';
    return String(value);
  } catch {
    return '';
  }
};

const readLocale = (): string =>
  safe(() => Intl.DateTimeFormat().resolvedOptions().locale).replace('-', '_');

const readTimezone = (): string =>
  safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone);


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


const readDeviceModel = (): string =>
  Platform.OS === 'ios'
    ? safe(() => DeviceInfo.getDeviceId())
    : safe(() => DeviceInfo.getModel());

const buildExtinfo = (): string[] => {
  const window = Dimensions.get('window');

  const extinfo = [
    Platform.OS === 'ios' ? 'i2' : 'a2',
    safe(() => DeviceInfo.getBundleId()),
    safe(() => DeviceInfo.getVersion()),
    `${safe(() => DeviceInfo.getVersion())}.${safe(() =>
      DeviceInfo.getBuildNumber(),
    )}`,
    safe(() => DeviceInfo.getSystemVersion()),
    readDeviceModel(),
    readLocale(),
    readTimezoneAbbreviation(),
    safe(() => DeviceInfo.getCarrierSync()),
    safe(() => Math.round(window.width)),
    safe(() => Math.round(window.height)),
    safe(() => PixelRatio.get()),
    '',
    bytesToGb(() => DeviceInfo.getTotalDiskCapacitySync()),
    bytesToGb(() => DeviceInfo.getFreeDiskStorageSync()),
    readTimezone(),
  ];

  return extinfo
    .slice(0, EXTINFO_LENGTH)
    .concat(Array(Math.max(0, EXTINFO_LENGTH - extinfo.length)).fill(''));
};


export const buildAppDataHeader = (
  advertiserTrackingEnabled: boolean,
): void => {
  try {
    const payload = {
      advertiser_tracking_enabled: advertiserTrackingEnabled ? 1 : 0,
      extinfo: buildExtinfo(),
    };

    const encoded = Base64.encode(JSON.stringify(payload));

    cachedHeader = encoded.length <= MAX_HEADER_LENGTH ? encoded : null;
  } catch (err) {
    cachedHeader = null;
    console.warn('[analytics] app data header build failed', err);
  }
};

export const getAppDataHeader = (): string | null => cachedHeader;
