// Pure-logic tests for the analytics seam.
//
// Both modules under test are import-free at runtime (`events.ts` imports only a
// TYPE from `./posthog`, which erases at compile time), so nothing here needs a
// native mock or a PostHog client — which is exactly why the logic was put in
// them rather than inline in the player and the entry point.
//
// This is the half of the integration where a bug is SILENT: a dropped event or
// a mistyped name produces no error, just a funnel that quietly under-reports.

import { mapEvent, toSnakeCase } from './events';
import {
  authFailureReason,
  newMilestones,
  PROGRESS_MILESTONES,
} from './productEvents';

describe('toSnakeCase', () => {
  it('splits PascalCase', () => {
    expect(toSnakeCase('ViewContent')).toBe('view_content');
  });

  it('handles the Pascal_Snake names the cancel flow emits', () => {
    expect(toSnakeCase('CancelFlow_ReachedConfirm')).toBe(
      'cancel_flow_reached_confirm',
    );
    expect(toSnakeCase('CancelFlow_Saved')).toBe('cancel_flow_saved');
  });

  it('never emits leading, trailing or doubled underscores', () => {
    expect(toSnakeCase('__Weird--Name__')).toBe('weird_name');
  });
});

describe('mapEvent', () => {
  it('renames the four Meta standard events', () => {
    expect(mapEvent('Subscribe').name).toBe('subscription_started');
    expect(mapEvent('InitiateCheckout').name).toBe('checkout_started');
    expect(mapEvent('StartTrial').name).toBe('trial_started');
    expect(mapEvent('ViewContent').name).toBe('content_viewed');
  });

  // The regression that matters: the cancel flow builds its terminal event name
  // at runtime, so a closed map would drop these entirely and nobody would see
  // an error — only a churn funnel missing its last step.
  it('forwards unmapped names instead of dropping them', () => {
    const target = mapEvent('CancelFlow_Abandoned', { saved_at_step: 'offer' });
    expect(target.kind).toBe('capture');
    expect(target.name).toBe('cancel_flow_abandoned');
    expect(target.properties.saved_at_step).toBe('offer');
  });

  it('routes PageView to a screen target', () => {
    const target = mapEvent('PageView', { screen: 'SubscriptionScreen' });
    expect(target.kind).toBe('screen');
    expect(target.name).toBe('SubscriptionScreen');
  });

  it('does not leave the screen name in the properties as well', () => {
    const target = mapEvent('PageView', { screen: 'HomeScreen' });
    expect(target.properties.screen).toBeUndefined();
  });

  it('falls back to a named screen when navigation reports none', () => {
    expect(mapEvent('PageView').name).toBe('Unknown');
  });

  it('carries the dedup key so a funnel can be joined to a payment row', () => {
    const target = mapEvent('Subscribe', { value: 499 }, 'pay_ABC123');
    expect(target.properties.dedup_key).toBe('pay_ABC123');
    expect(target.properties.value).toBe(499);
  });

  it('drops undefined params rather than sending nulls', () => {
    const target = mapEvent('InitiateCheckout', {
      value: undefined,
      currency: 'INR',
    });
    expect('value' in target.properties).toBe(false);
    expect(target.properties.currency).toBe('INR');
  });
});

describe('newMilestones', () => {
  it('reports a milestone once it is reached', () => {
    expect(newMilestones(30, new Set())).toEqual([25]);
  });

  it('reports nothing before the first milestone', () => {
    expect(newMilestones(10, new Set())).toEqual([]);
  });

  it('excludes milestones already fired', () => {
    expect(newMilestones(60, new Set([25]))).toEqual([50]);
  });

  // A seek must not silently swallow the milestones it skipped over, or a funnel
  // would show viewers reaching 75% without ever reaching 25%.
  it('reports every milestone crossed by a forward seek', () => {
    expect(newMilestones(80, new Set())).toEqual([25, 50, 75]);
  });

  it('is idempotent once everything has fired', () => {
    expect(newMilestones(99, new Set(PROGRESS_MILESTONES))).toEqual([]);
  });

  // duration is 0 on the first ticks, so pct arrives as NaN/Infinity.
  it('survives a non-finite percentage', () => {
    expect(newMilestones(NaN, new Set())).toEqual([]);
    expect(newMilestones(Infinity, new Set())).toEqual([]);
  });

  // 100 is deliberately absent: completion is reported by video_completed from
  // the player's onEnd, and having both would double-count every finished episode.
  it('stops short of 100 so completion is not double-counted', () => {
    expect(PROGRESS_MILESTONES).not.toContain(100);
  });
});

describe('authFailureReason', () => {
  it('keeps the server message, which is the point of the event', () => {
    expect(authFailureReason(new Error('Email already registered'))).toBe(
      'Email already registered',
    );
  });

  it('accepts a bare string rejection', () => {
    expect(authFailureReason('Invalid credentials')).toBe('Invalid credentials');
  });

  // react-query hands onError whatever was thrown, which is not always an Error.
  it('never returns empty for a junk rejection', () => {
    expect(authFailureReason(undefined)).toBe('unknown');
    expect(authFailureReason(null)).toBe('unknown');
    expect(authFailureReason({})).toBe('unknown');
    expect(authFailureReason(new Error('   '))).toBe('unknown');
  });

  // A stack trace or an HTML error page must not become an event property.
  it('caps the length', () => {
    expect(authFailureReason(new Error('x'.repeat(500)))).toHaveLength(100);
  });
});
