import React from 'react';
import { TextInput } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import ContactVerifySheet from './ContactVerifySheet';

jest.mock('../../utils/analytics', () => ({
  PostHogMaskView: ({ children }: any) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock('../../api/account', () => ({
  useVerifyContactOtp: () => ({ mutate: jest.fn(), isPending: false }),
}));

const email = { kind: 'email' as const, value: 'me@x.com' };
const phone = { kind: 'phone' as const, value: '+919876543210' };

const sheet = (target: any, sendId: number) => (
  <ContactVerifySheet
    target={target}
    sendId={sendId}
    onClose={jest.fn()}
    resendRemaining={30}
    onResend={jest.fn()}
    isResending={false}
  />
);

/** Value of the code input on the render right after `update`. */
const codeAfter = (
  tree: renderer.ReactTestRenderer,
  next: React.ReactElement,
) => {
  act(() => tree.update(next));
  return tree.root.findByType(TextInput).props.value;
};

describe('ContactVerifySheet', () => {
  let tree: renderer.ReactTestRenderer;

  beforeEach(() => {
    act(() => {
      tree = renderer.create(sheet(email, 1));
    });
    act(() => tree.root.findByType(TextInput).props.onChangeText('12'));
    expect(tree.root.findByType(TextInput).props.value).toBe('12');
  });

  it('starts empty when a code is sent to a different contact', () => {
    expect(codeAfter(tree, sheet(phone, 2))).toBe('');
  });

  it('starts empty after closing and sending again to the same contact', () => {
    act(() => tree.update(sheet(null, 1)));
    expect(codeAfter(tree, sheet(email, 2))).toBe('');
  });

  it('starts empty on resend', () => {
    expect(codeAfter(tree, sheet(email, 2))).toBe('');
  });
});
