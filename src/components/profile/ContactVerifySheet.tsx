import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import BottomSheet from '../BottomSheet';
import OtpVerifyStep, { otpFooterStyles } from '../OtpVerifyStep';
import { ContactTarget, useVerifyContactOtp } from '../../api/account';

const OTP_LENGTH = 4;
const INCORRECT_CODE = 'Incorrect code. Please try again.';

interface ContactVerifySheetProps {
  /** The email/phone a code was just sent to; null hides the sheet. */
  target: ContactTarget | null;
  /** Changes on every send, so each code starts with an empty input. */
  sendId: number;
  onClose: () => void;
  resendRemaining: number;
  onResend: () => void;
  isResending: boolean;
}

type CodeEntryProps = Omit<ContactVerifySheetProps, 'target' | 'sendId'> & {
  target: ContactTarget;
};

// Owns the typed code; remounted per send so no earlier code shows, even
// for the first frame.
const CodeEntry = ({
  target,
  onClose,
  resendRemaining,
  onResend,
  isResending,
}: CodeEntryProps) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verify = useVerifyContactOtp({
    onVerified: ({ kind, value }) => {
      Toast.show({
        type: 'success',
        text1: kind === 'email' ? 'Email verified' : 'Phone number verified',
        text2: `${value} is now linked to your account`,
      });
      onClose();
    },
    onInvalidOtp: () => setError(INCORRECT_CODE),
  });

  const submit = (code: string) => {
    if (code.length !== OTP_LENGTH || verify.isPending) return;
    verify.mutate({ target, otp: code });
  };

  const isEmail = target.kind === 'email';

  return (
    <>
      <OtpVerifyStep
        title={isEmail ? 'Verify your email' : 'Verify your number'}
        destination={target.value}
        value={otp}
        onChange={code => {
          setOtp(code);
          setError(null);
        }}
        onSubmit={submit}
        isSubmitting={verify.isPending}
        error={error}
        resendRemaining={resendRemaining}
        onResend={onResend}
        isResending={isResending}
        autoComplete={isEmail ? 'one-time-code' : 'sms-otp'}
        footerLeft={
          <Text style={otpFooterStyles.text}>
            {isEmail ? 'Code expires in 10 min' : 'Sent by SMS'}
          </Text>
        }
      />
      <View style={styles.spacer} />
    </>
  );
};

const ContactVerifySheet = ({
  target,
  sendId,
  onClose,
  ...rest
}: ContactVerifySheetProps) => (
  <BottomSheet visible={!!target} onClose={onClose}>
    {target && (
      <CodeEntry key={sendId} target={target} onClose={onClose} {...rest} />
    )}
  </BottomSheet>
);

export default ContactVerifySheet;

const styles = StyleSheet.create({
  spacer: {
    height: 24,
  },
});
