import React, { ComponentProps } from 'react';
import { StyleSheet, Text } from 'react-native';
import OtpInput from './OtpInput';
import { PostHogMaskView } from '../utils/analytics';

type OtpVerifyStepProps = ComponentProps<typeof OtpInput> & {
  title: string;
  destination: string;
};

/** "Verify your email" block shared by sign-up/login and the Profile sheet. */
const OtpVerifyStep = ({
  title,
  destination,
  length = 4,
  ...otpProps
}: OtpVerifyStepProps) => (
  <>
    <Text style={styles.title}>{title}</Text>
    <PostHogMaskView>
      <Text style={styles.subtitle}>
        Enter the {length}-digit code sent to{' '}
        <Text style={styles.destination}>{destination}</Text>
      </Text>
    </PostHogMaskView>
    <OtpInput length={length} sentTo={destination} {...otpProps} />
  </>
);

export default OtpVerifyStep;

export const otpFooterStyles = StyleSheet.create({
  text: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  link: {
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Bold',
    textDecorationLine: 'underline',
  },
});

const styles = StyleSheet.create({
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'HelveticaNowDisplay-Bold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  destination: {
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
});
