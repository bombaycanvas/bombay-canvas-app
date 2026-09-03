import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// GET /me is authorised by the TOKEN. Gating its query on the cached `user`
// object instead looked equivalent and was not: `user` hydrates from
// AsyncStorage separately and is legitimately null on valid sessions.
//
// A disabled query is not merely idle — invalidateQueries SKIPS it while
// refetch() runs anyway. That combination is why the regression was invisible:
// cancelling a subscription invalidated ['mySubscription'] to no effect, the
// card kept offering "Cancel Subscription" for an already-cancelled
// subscription, and useFocusEffect's refetch hid it on the next visit.
// ---------------------------------------------------------------------------

const mockAuthState: { user: any; token: string | null } = { user: null, token: null };

jest.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: any) => unknown) => selector(mockAuthState),
}));

const mockGetMe = jest.fn();
jest.mock('../utils/api', () => ({
  api: (...args: any[]) => mockGetMe(...args),
  ApiError: class extends Error {},
}));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

import { useMySubscription } from './subscription';

let mounted: { unmount: () => void; client: QueryClient } | null = null;

const renderHook = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnMount: false } },
  });
  const Probe = () => {
    useMySubscription();
    return null;
  };
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  // Tracked so afterEach can tear the observer down. Without it the query stays
  // subscribed and jest holds the worker open at the end of the run.
  mounted = { unmount: () => tree.unmount(), client: queryClient };
  return queryClient;
};

const flush = () => act(async () => { await Promise.resolve(); });

afterEach(() => {
  if (mounted) {
    act(() => mounted!.unmount());
    mounted.client.clear();
    mounted = null;
  }
});

beforeEach(() => {
  mockGetMe.mockReset();
  mockGetMe.mockResolvedValue({ data: { subscription: { id: 'sub_1' } } });
  mockAuthState.user = null;
  mockAuthState.token = null;
});

describe('useMySubscription', () => {
  it('fetches on a token-only session, when the cached user object is null', async () => {
    mockAuthState.token = 'jwt';
    renderHook();
    await flush();

    expect(mockGetMe).toHaveBeenCalled();
  });

  // The actual regression: the cancel mutation's invalidateQueries is a no-op
  // against a DISABLED query, so the subscription card never learns it was
  // cancelled until something calls refetch() directly.
  it('refetches when the cancel flow invalidates ["mySubscription"]', async () => {
    mockAuthState.token = 'jwt';
    const queryClient = renderHook();
    await flush();
    const afterMount = mockGetMe.mock.calls.length;

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
    });

    expect(mockGetMe.mock.calls.length).toBeGreaterThan(afterMount);
  });

  it('stays idle when there is no token to authorise the call', async () => {
    renderHook();
    await flush();

    expect(mockGetMe).not.toHaveBeenCalled();
  });
});
