import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import renderer, { act } from 'react-test-renderer';
import OtpInput from './OtpInput';

jest.mock('../utils/analytics', () => ({
  PostHogMaskView: ({ children }: any) => children,
}));

const setup = (props: Partial<React.ComponentProps<typeof OtpInput>> = {}) => {
  const onChange = jest.fn();
  const onSubmit = jest.fn();
  const onResend = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <OtpInput
        value=""
        onChange={onChange}
        onSubmit={onSubmit}
        sentTo="a@b.com"
        resendRemaining={0}
        onResend={onResend}
        {...props}
      />,
    );
  });
  const type = (text: string) =>
    act(() => tree.root.findByType(TextInput).props.onChangeText(text));
  const buttons = () => tree.root.findAllByType(TouchableOpacity);
  const text = () => JSON.stringify(tree.toJSON());
  return { tree, type, buttons, text, onChange, onSubmit, onResend };
};

describe('OtpInput', () => {
  it('keeps digits only, up to the code length', () => {
    const { type, onChange, onSubmit } = setup();
    type('1a2 3');
    expect(onChange).toHaveBeenLastCalledWith('123');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('auto-submits when the last digit is typed', () => {
    const { type, onSubmit } = setup();
    type('123456');
    expect(onSubmit).toHaveBeenCalledWith('1234');
  });

  it('respects a custom length', () => {
    const { type, onSubmit } = setup({ length: 6 });
    type('1234');
    expect(onSubmit).not.toHaveBeenCalled();
    type('123456');
    expect(onSubmit).toHaveBeenCalledWith('123456');
  });

  it('disables Submit until the code is complete', () => {
    const incomplete = setup({ value: '12' });
    const submit = incomplete.buttons().at(-2)!;
    expect(submit.props.disabled).toBe(true);

    const complete = setup({ value: '1234' });
    expect(complete.buttons().at(-2)!.props.disabled).toBe(false);
  });

  it('blocks resend during the countdown and shows the timer', () => {
    const { buttons, text } = setup({ resendRemaining: 9 });
    expect(buttons().at(-1)!.props.disabled).toBe(true);
    expect(text()).toContain('Resend OTP in 00:09');
  });

  it('allows resend once the countdown ends', () => {
    const { buttons, onResend } = setup({ resendRemaining: 0 });
    const resend = buttons().at(-1)!;
    expect(resend.props.disabled).toBe(false);
    act(() => resend.props.onPress());
    expect(onResend).toHaveBeenCalled();
  });

  it('shows where the code was sent', () => {
    expect(setup({ sentTo: 'me@x.com' }).text()).toContain('me@x.com');
  });

  it('replaces the sent-to line with a custom footer', () => {
    const { text } = setup({
      sentTo: 'me@x.com',
      footerLeft: <Text>Code expires in 10 min</Text>,
    });
    expect(text()).toContain('Code expires in 10 min');
    expect(text()).not.toContain('OTP sent to');
  });

  it('shows the error message and red circles', () => {
    const { tree, text } = setup({ value: '7219', error: 'Incorrect code.' });
    expect(text()).toContain('Incorrect code.');
    const redCircles = tree.root.findAll(
      node =>
        node.type === View &&
        StyleSheet.flatten(node.props.style)?.borderColor === '#FF6B6B',
    );
    expect(redCircles).toHaveLength(4);
  });

  it('has no error text or red circles by default', () => {
    const { tree, text } = setup({ value: '72' });
    expect(text()).not.toContain('Incorrect');
    const redCircles = tree.root.findAll(
      node =>
        node.type === View &&
        StyleSheet.flatten(node.props.style)?.borderColor === '#FF6B6B',
    );
    expect(redCircles).toHaveLength(0);
  });
});
