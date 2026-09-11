// Native modules that throw at import time under Jest. `utils/analytics/log`
// pulls both transitively, and it is imported from api/, hooks/ and services/,
// so mocking per-suite would mean mocking them almost everywhere.

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getVersion: () => '0.0.0',
    getBuildNumber: () => '0',
    getBundleId: () => 'com.bombaycanvas.test',
    getSystemVersion: () => '0',
    getModel: () => 'test',
    getDeviceId: () => 'test',
    getCarrierSync: () => '',
    getTotalDiskCapacitySync: () => 0,
    getFreeDiskStorageSync: () => 0,
  },
}));

jest.mock('posthog-react-native', () => {
  const noop = () => {};
  const logger = { trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop };

  class PostHog {
    capture = noop;
    captureException = noop;
    screen = noop;
    identify = noop;
    reset = noop;
    register = noop;
    captureLog = noop;
    getDistinctId = () => 'test-distinct-id';
    flush = () => Promise.resolve();
    logger = logger;
  }

  return {
    __esModule: true,
    default: PostHog,
    PostHog,
    PostHogProvider: ({ children }) => children,
    PostHogMaskView: ({ children }) => children,
    usePostHog: () => new PostHog(),
  };
});
