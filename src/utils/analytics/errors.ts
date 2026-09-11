import { posthog } from './posthog';
import { redactText, redactAttributes } from './logRedaction';
import type { LogAttributes } from './log';

// PostHog Error Tracking.
//
// Nothing here replaces an existing handler or console call: the global error
// handler chains to the one React Native already installed, and the console
// mirror invokes the original method first. Removing this module restores the
// previous behaviour exactly.

const DEDUPE_WINDOW_MS = 60_000;
const MAX_EXCEPTIONS_PER_WINDOW = 50;
const MAX_TRACKED_FINGERPRINTS = 200;

const lastSeen = new Map<string, number>();
let windowStart = 0;
let windowCount = 0;

type ErrorWithStatus = { status?: number; statusCode?: number };

/**
 * A 4xx is the API answering, not a defect — "wrong password" and "not found"
 * are outcomes this app handles. `ApiError` (utils/api.ts) carries `status`.
 */
const isExpectedStatus = (error: unknown): boolean => {
  const status =
    (error as ErrorWithStatus)?.status ?? (error as ErrorWithStatus)?.statusCode;

  return typeof status === 'number' && status >= 400 && status < 500;
};

/**
 * A phone loses signal in a lift. Transport failures are a fact of mobile life,
 * not issues to triage — `utils/api.ts` already records them as logs.
 */
const isOffline = (error: unknown): boolean =>
  /network request failed|network error/i.test(
    error instanceof Error ? error.message : String(error),
  );

export const isExpectedError = (error: unknown): boolean =>
  isExpectedStatus(error) || isOffline(error);

export const errorFingerprint = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return `raw|${String(error).slice(0, 200)}`;
  }

  const topFrame = error.stack?.split('\n')[1]?.trim() ?? '';
  return `${error.name}|${error.message}|${topFrame}`;
};

/** One issue per fingerprint per window, so a render loop cannot bill 10,000. */
const shouldSend = (fingerprint: string, now = Date.now()): boolean => {
  if (now - windowStart > DEDUPE_WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
    lastSeen.clear();
  }

  if (lastSeen.has(fingerprint)) return false;
  if (windowCount >= MAX_EXCEPTIONS_PER_WINDOW) return false;
  if (lastSeen.size >= MAX_TRACKED_FINGERPRINTS) return false;

  lastSeen.set(fingerprint, now);
  windowCount += 1;
  return true;
};

/**
 * Report an error to PostHog. Safe to call from anywhere, including a catch
 * block whose failure must stay silent.
 *
 * @example
 * catch (err) {
 *   captureError(err, { source: 'checkout', plan_code: plan.code });
 * }
 */
export const captureError = (
  error: unknown,
  properties: LogAttributes = {},
): void => {
  if (error === null || error === undefined) return;
  if (isExpectedError(error)) return;
  if (!shouldSend(errorFingerprint(error))) return;

  try {
    posthog.captureException(error, {
      ...redactAttributes(properties),
      ...(currentScreen ? { screen: currentScreen } : {}),
    });
  } catch {
    // Error tracking must never be the thing that breaks the screen.
  }
};

let currentScreen: string | undefined;

/** Set from the navigation container so an issue says where it happened. */
export const setErrorScreen = (screenName?: string): void => {
  currentScreen = screenName;
};

type GlobalErrorHandler = (error: Error, isFatal?: boolean) => void;

type ErrorUtilsShape = {
  getGlobalHandler?: () => GlobalErrorHandler;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
};

/**
 * Uncaught JS errors, fatal and non-fatal.
 *
 * The previous handler still runs — it owns the red box in dev and the crash in
 * production. Capture happens FIRST because a fatal error may not return.
 */
const installGlobalHandler = (): void => {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  const previous = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error, isFatal) => {
    captureError(error, { source: 'global_handler', is_fatal: !!isFatal });
    previous?.(error, isFatal);
  });
};

let inCapture = false;

/**
 * Mirrors `console.error(..., error)` into error tracking.
 *
 * Most of this app's catch blocks log and recover in place rather than
 * rethrowing, so wrapping console is what makes them visible without editing
 * every call site.
 */
const installConsoleMirror = (): void => {
  const original = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    original(...args);

    if (inCapture) return;

    const thrown = args.find(arg => arg instanceof Error);
    if (!thrown) return;

    inCapture = true;
    try {
      const message = args
        .filter(arg => typeof arg === 'string')
        .join(' ')
        .trim();

      captureError(thrown, {
        source: 'console.error',
        ...(message ? { log_message: redactText(message) } : {}),
      });
    } catch {
      // Same contract as captureError.
    } finally {
      inCapture = false;
    }
  };
};

let initialised = false;

/** Call once, as early as possible. */
export const initErrorTracking = (): void => {
  if (initialised) return;
  initialised = true;

  installGlobalHandler();
  installConsoleMirror();
};
