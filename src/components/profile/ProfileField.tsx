import React, { ReactNode, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PostHogMaskView } from '../../utils/analytics';

interface ProfileFieldProps extends TextInputProps {
  icon: string;
  /** Renders plain muted text instead of an input. */
  readOnly?: boolean;
  accessory?: ReactNode;
  hint?: string;
}

/** CompleteProfile's input style, with an optional right-hand accessory. */
const ProfileField = ({
  icon,
  readOnly,
  accessory,
  hint,
  value,
  ...inputProps
}: ProfileFieldProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <>
      <PostHogMaskView
        style={[
          styles.field,
          focused && styles.focused,
          !!accessory && styles.withAccessory,
        ]}
      >
        <Ionicons name={icon} size={20} color="rgba(255,255,255,0.5)" />
        {readOnly ? (
          <Text style={[styles.text, styles.readOnly]} numberOfLines={1}>
            {value}
          </Text>
        ) : (
          <TextInput
            style={styles.text}
            value={value}
            placeholderTextColor="rgba(255,255,255,0.3)"
            selectionColor="#ff6a00"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...inputProps}
          />
        )}
        {accessory}
      </PostHogMaskView>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </>
  );
};

export const VerifiedBadge = () => (
  <View style={styles.badge}>
    <Ionicons name="checkmark-circle" size={18} color="#4cd964" />
    <Text style={styles.badgeText}>Verified</Text>
  </View>
);

export const VerifyPill = ({
  onPress,
  disabled,
  loading,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    style={[styles.pill, (disabled || loading) && styles.pillDisabled]}
    onPress={onPress}
    disabled={disabled || loading}
  >
    <Text style={styles.pillText}>{loading ? 'Sending…' : 'Verify'}</Text>
  </TouchableOpacity>
);

export default ProfileField;

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    paddingHorizontal: 10,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  focused: {
    borderColor: '#ff6a00',
  },
  withAccessory: {
    paddingRight: 6,
  },
  text: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  readOnly: {
    color: 'rgba(255,255,255,0.6)',
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: -2,
    marginBottom: 2,
    marginLeft: 5,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 6,
  },
  badgeText: {
    color: '#4cd964',
    fontSize: 13,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  pill: {
    backgroundColor: 'rgba(255,106,0,0.1)',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.8)',
    marginLeft: 8,
  },
  pillDisabled: {
    opacity: 0.5,
  },
  pillText: {
    color: '#ff6a00',
    fontSize: 13,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
});
