import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { formatResendLabel, useResendTimer } from './useResendTimer';

type Timer = ReturnType<typeof useResendTimer>;

const renderTimer = (seconds: number, active: boolean) => {
  let latest: Timer;
  const Probe = ({ on }: { on: boolean }) => {
    latest = useResendTimer(seconds, on);
    return null;
  };
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<Probe on={active} />);
  });
  return {
    get current() {
      return latest!;
    },
    setActive: (on: boolean) => act(() => tree.update(<Probe on={on} />)),
  };
};

const tick = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useResendTimer', () => {
  it('counts down to zero and stops', () => {
    const t = renderTimer(3, true);
    tick(1000);
    expect(t.current.remaining).toBe(2);
    tick(5000);
    expect(t.current.remaining).toBe(0);
  });

  it('does not tick while inactive', () => {
    const t = renderTimer(3, false);
    tick(5000);
    expect(t.current.remaining).toBe(3);
    t.setActive(true);
    tick(1000);
    expect(t.current.remaining).toBe(2);
  });

  it('restart() resets the countdown', () => {
    const t = renderTimer(3, true);
    tick(3000);
    expect(t.current.remaining).toBe(0);
    act(() => t.current.restart());
    expect(t.current.remaining).toBe(3);
    tick(1000);
    expect(t.current.remaining).toBe(2);
  });
});

describe('formatResendLabel', () => {
  it.each([
    [30, 'Resend OTP in 00:30'],
    [5, 'Resend OTP in 00:05'],
    [0, 'Resend OTP'],
  ])('%i → %s', (n, label) => {
    expect(formatResendLabel(n)).toBe(label);
  });
});
