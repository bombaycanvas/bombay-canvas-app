// Redaction for PostHog Logs.
//

import type { LogAttributes } from './log';

/**
 * Attribute keys whose VALUE is dropped regardless of what it looks like.
 *
 * Matched as a substring, case-insensitively, so `userPassword`, `auth_token`
 * and `X-Api-Key` are all caught without enumerating spellings.
 */
const SENSITIVE_KEY =
  /(pass|secret|token|auth|otp|pin|cvv|card|credential|signature|session_id|apikey|api_key)/i;

/** Replaces a redacted value, so a reader can tell redaction from absence. */
const REDACTED = '[redacted]';

/**
 * Longest body we will send. Guards the 10 GB/month budget and the server's
 * per-record cap: a stringified API response or a stack trace can run to tens
 * of kilobytes, and the tail is never the useful part.
 */
const MAX_BODY_LENGTH = 2000;

// A JWT — our own session token, and Apple's identity token. Matched before the
// URL rule so a token in a path (not a query) is still caught.
const JWT = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/g;

// Everything after `?` in a URL. Signed GCS and CloudFront URLs carry their
// signature, expiry and key id there, so the whole query string goes rather
// than trying to enumerate parameter names that vary by provider.
const URL_QUERY = /(https?:\/\/[^\s?#]+)\?[^\s]*/gi;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Strip the shapes that are unambiguously secret from a free-text string.
 *
 * Order matters: URLs are reduced first so a signed query cannot survive, then
 * bare tokens, then addresses.
 */
export const redactText = (input: string): string => {
  if (!input) return '';

  return input
    .replace(URL_QUERY, '$1?' + REDACTED)
    .replace(JWT, REDACTED)
    .replace(EMAIL, REDACTED)
    .slice(0, MAX_BODY_LENGTH);
};

/**
 * Redact an attribute bag by KEY, then by value shape.
 *
 * Key matching is what catches the things a regex cannot: an `otp` or `phone`
 * attribute is dropped because of what it IS, not what it looks like.
 */
export const redactAttributes = (
  attributes?: LogAttributes,
): LogAttributes | undefined => {
  if (!attributes) return undefined;

  const safe: LogAttributes = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (SENSITIVE_KEY.test(key)) {
      safe[key] = REDACTED;
      continue;
    }

    // Only strings can hide a token; numbers and booleans are passed through so
    // the numeric attributes that make logs queryable stay intact.
    safe[key] = typeof value === 'string' ? redactText(value) : value;
  }

  return safe;
};

/**
 * The `beforeSend` filter handed to the SDK. Runs on EVERY record, including
 * ones written by future code that never read this file.
 *
 * Returns `null` to drop a record entirely — used for an empty body, which
 * carries no information and still costs bandwidth and quota.
 */
export const redactLogRecord = <
  T extends { body: string; attributes?: LogAttributes },
>(
  record: T,
): T | null => {
  try {
    const body = redactText(String(record.body ?? '')).trim();
    if (!body) return null;

    return { ...record, body, attributes: redactAttributes(record.attributes) };
  } catch {
    // A redaction failure must never let an UNREDACTED record through. Dropping
    // it is the only safe outcome: the alternative is shipping the thing this
    // function exists to remove.
    return null;
  }
};
