import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
import { isInvalidOtpError } from './auth';

export type ContactKind = 'email' | 'phone';

export interface ContactTarget {
  kind: ContactKind;
  value: string;
}

// Profile → verify the signed-in account's email / link a phone. These never
// return a session, and a value owned by another account is a 409.
export const sendContactOtp = (kind: ContactKind, value: string) =>
  api(`/api/user/${kind}/send-otp`, {
    method: 'POST',
    body: { [kind]: value },
  });

export const verifyContactOtp = (
  kind: ContactKind,
  value: string,
  otp: string,
) =>
  api(`/api/user/${kind}/verify`, {
    method: 'POST',
    body: { [kind]: value, otp },
  });

const showError = (error: any) =>
  Toast.show({
    type: 'error',
    text1: 'Verification failed',
    text2: error?.message || 'Please try again.',
  });

export const useSendContactOtp = (onSent: (target: ContactTarget) => void) =>
  useMutation({
    mutationFn: (target: ContactTarget) =>
      sendContactOtp(target.kind, target.value),
    onSuccess: (_data, target) => onSent(target),
    onError: showError,
  });

export const useVerifyContactOtp = ({
  onVerified,
  onInvalidOtp,
}: {
  onVerified: (target: ContactTarget) => void;
  onInvalidOtp: () => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ target, otp }: { target: ContactTarget; otp: string }) =>
      verifyContactOtp(target.kind, target.value, otp),
    onSuccess: async (_data, { target }) => {
      await queryClient.invalidateQueries({ queryKey: ['userData'] });
      onVerified(target);
    },
    onError: error =>
      isInvalidOtpError(error) ? onInvalidOtp() : showError(error),
  });
};
