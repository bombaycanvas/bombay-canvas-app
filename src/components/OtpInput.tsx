import React, { ReactNode, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PostHogMaskView } from '../utils/analytics';
import { formatResendLabel } from '../hooks/useResendTimer';

interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Fired when the last digit is typed, and on Submit. */
  onSubmit: (code: string) => void;
  isSubmitting?: boolean;
  /** Shown bottom-left; defaults to "OTP sent to {sentTo}". */
  footerLeft?: ReactNode;
  sentTo?: string;
  /** Turns the circles red and shows the message under them. */
  error?: string | null;
  resendRemaining: number;
  onResend: () => void;
  isResending?: boolean;
  length?: number;
  /** 'sms-otp' lets Android offer the SMS code; email codes are typed. */
  autoComplete?: 'sms-otp' | 'one-time-code';
}

const OtpInput = ({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  footerLeft,
  sentTo,
  error,
  resendRemaining,
  onResend,
  isResending,
  length = 4,
  autoComplete = 'sms-otp',
}: OtpInputProps) => {
  const inputRef = useRef<TextInput>(null);
  const activeIndex = Math.min(value.length, length - 1);
  const isComplete = value.length === length;

  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length) onSubmit(cleaned);
  };

  return (
    <>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={autoComplete}
        maxLength={length}
        autoFocus
        style={styles.hiddenInput}
        pointerEvents="none"
      />
      <View
        style={[styles.pillWrapper, !!error && styles.pillWrapperWithError]}
      >
        {/* Masks the digit Text nodes; the real input is offscreen. */}
        <PostHogMaskView style={styles.circlesWrapper}>
          {Array.from({ length }, (_, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.8}
              onPress={() => inputRef.current?.focus()}
            >
              <View
                style={[
                  styles.circle,
                  error
                    ? styles.errorCircle
                    : index === activeIndex && styles.activeCircle,
                ]}
              >
                <Text style={styles.digit}>{value[index] || ''}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </PostHogMaskView>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.submitPill, !isComplete && styles.submitPillDisabled]}
          onPress={() => onSubmit(value)}
          disabled={!!isSubmitting || !isComplete}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="rgba(255, 106, 0, 1)" />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.bottomInfo}>
        <PostHogMaskView style={styles.sentToWrapper}>
          {footerLeft ?? (
            <Text style={styles.sentToText} numberOfLines={1}>
              OTP sent to {sentTo}
            </Text>
          )}
        </PostHogMaskView>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={resendRemaining > 0 || !!isResending}
          onPress={onResend}
        >
          <Text
            style={[
              styles.timerText,
              resendRemaining === 0 && styles.resendActive,
            ]}
          >
            {formatResendLabel(resendRemaining)}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default OtpInput;

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -1000,
  },
  pillWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 35,
    gap: 10,
  },
  circlesWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCircle: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderColor: '#FF6B6B',
  },
  activeCircle: {
    borderColor: 'rgba(255,106,0,1)',
    borderWidth: 2,
    shadowColor: 'rgba(255,106,0,0.8)',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  digit: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  pillWrapperWithError: {
    marginBottom: 10,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginLeft: 5,
    marginBottom: 23,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  submitPill: {
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.8)',
  },
  submitPillDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: 'rgba(255, 106, 0, 1)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  sentToWrapper: {
    flexShrink: 1,
  },
  sentToText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  timerText: {
    color: 'rgba(255, 106, 0, 1)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
  },
  resendActive: {
    textDecorationLine: 'underline',
  },
});
