import { posthog } from './posthog';

// Structured logging to PostHog Logs.


export type LogAttributeValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | unknown[]
  | Record<string, unknown>;

export type LogAttributes = Record<string, LogAttributeValue>;

const write = (
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  attributes?: LogAttributes,
): void => {
  try {
    posthog.logger[level](message, attributes);
  } catch {
    // Never surfaces. A logging failure that broke the thing being logged about
    // would be the worst possible outcome.
  }
};

/**
 * Structured logger.
 *
 * @example
 * log.error('Episode playback failed', {
 *   episode_id: episode.id,
 *   error_code: 'MEDIA_ERR_DECODE',
 * });
 *
 * Keep `message` a stable, human-readable constant and put the varying parts in
 * `attributes` — that is what makes logs groupable and searchable. A message
 * built by interpolation ("Episode abc123 failed") is a unique string per
 * occurrence and cannot be aggregated.
 */
export const log = {
  debug: (message: string, attributes?: LogAttributes) =>
    write('debug', message, attributes),
  info: (message: string, attributes?: LogAttributes) =>
    write('info', message, attributes),
  warn: (message: string, attributes?: LogAttributes) =>
    write('warn', message, attributes),
  error: (message: string, attributes?: LogAttributes) =>
    write('error', message, attributes),
};
