import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PostHogMaskView } from '../../utils/analytics';

interface ProfileFieldProps extends TextInputProps {
  icon: string;
  /** Renders plain muted text instead of an input. */
  readOnly?: boolean;
}

/** CompleteProfile's input style. */
const ProfileField = ({
  icon,
  readOnly,
  value,
  ...inputProps
}: ProfileFieldProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <PostHogMaskView style={[styles.field, focused && styles.focused]}>
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
    </PostHogMaskView>
  );
};

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
});
