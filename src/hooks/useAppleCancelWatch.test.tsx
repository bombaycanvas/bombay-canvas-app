import React from 'react';
import renderer, { act } from 'react-test-renderer';

// ---------------------------------------------------------------------------
// The watch used to start from an app foreground event. It never fired:
// AppStore.showManageSubscriptions presents INSIDE the app, so there is no
// background -> active transition, and useFocusEffect does not run either
// because the screen stayed focused the whole time. Cancelling therefore looked
// like nothing had happened until the user navigated away and back.
//
// Every test here runs with AppState untouched, which is the point.
// ---------------------------------------------------------------------------

import { useAppleCancelWatch } from './useAppleCancelWatch';

type Watch = ReturnType<typeof useAppleCancelWatch>;

let tree: renderer.ReactTestRenderer | null = null;

const renderWatch = (initialSettled = false) => {
  const refetch = jest.fn();
  let latest: Watch;
  const Probe = ({ settled }: { settled: boolean }) => {
    latest = useAppleCancelWatch({ settled, refetch });
    return null;
  };
  act(() => {
    tree = renderer.create(<Probe settled={initialSettled} />);
  });
  return {
    refetch,
    get current() {
      return latest!;
    },
    setSettled: (settled: boolean) =>
      act(() => {
        tree!.update(<Probe settled={settled} />);
      }),
  };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  if (tree) act(() => tree!.unmount());
  tree = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('stays idle until the sheet closes', () => {
  const watch = renderWatch();
  expect(watch.current.phase).toBe('idle');
  expect(watch.refetch).not.toHaveBeenCalled();
});

it('polls as soon as the sheet closes, with no foreground event', () => {
  const watch = renderWatch();

  act(() => watch.current.arm(true));

  expect(watch.current.phase).toBe('watching');
  expect(watch.current.confirmedByStore).toBe(true);
  expect(watch.refetch).toHaveBeenCalledTimes(1);

  act(() => jest.advanceTimersByTime(4000));
  expect(watch.refetch).toHaveBeenCalledTimes(3);
});

it('polls even when the store reported no change', () => {
  const watch = renderWatch();

  act(() => watch.current.arm(false));

  expect(watch.current.phase).toBe('watching');
  expect(watch.current.confirmedByStore).toBe(false);
  expect(watch.refetch).toHaveBeenCalledTimes(1);
});

it('stops the moment the server records the cancellation', () => {
  const watch = renderWatch();
  act(() => watch.current.arm(true));

  watch.setSettled(true);
  expect(watch.current.phase).toBe('idle');

  const callsAtSettle = watch.refetch.mock.calls.length;
  act(() => jest.advanceTimersByTime(10000));
  expect(watch.refetch).toHaveBeenCalledTimes(callsAtSettle);
});

it('reports a timeout instead of silently dropping the spinner', () => {
  const watch = renderWatch();
  act(() => watch.current.arm(true));

  act(() => jest.advanceTimersByTime(31000));

  expect(watch.current.phase).toBe('timedOut');
  // Kept, so the card can say Apple has the cancellation and only our row is
  // behind — a different message from "we do not know".
  expect(watch.current.confirmedByStore).toBe(true);

  const callsAtTimeout = watch.refetch.mock.calls.length;
  act(() => jest.advanceTimersByTime(10000));
  expect(watch.refetch).toHaveBeenCalledTimes(callsAtTimeout);
});

it('restarts cleanly on a second trip to the sheet', () => {
  const watch = renderWatch();
  act(() => watch.current.arm(true));
  act(() => jest.advanceTimersByTime(31000));
  expect(watch.current.phase).toBe('timedOut');

  act(() => watch.current.arm(false));
  expect(watch.current.phase).toBe('watching');
  expect(watch.current.confirmedByStore).toBe(false);
});
