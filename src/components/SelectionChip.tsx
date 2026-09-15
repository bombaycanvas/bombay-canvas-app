import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = {
  label: string;
  subLabel?: string | null;
  selected: boolean;
  onPress: () => void;
};

const SelectionChip = ({ label, subLabel, selected, onPress }: Props) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
  >
    {selected && (
      <Ionicons name="checkmark" size={14} color="#fff" style={styles.check} />
    )}
    <Text style={styles.label}>{label}</Text>
    {!!subLabel && (
      <Text style={selected ? styles.subSelected : styles.subIdle}>
        {subLabel}
      </Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  chipSelected: { backgroundColor: '#ff6a00' },
  chipIdle: { backgroundColor: '#222' },
  check: { marginRight: 6 },
  label: { color: '#fff', fontSize: 14, fontWeight: '500' },
  subSelected: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginLeft: 6 },
  subIdle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 6 },
});

export default SelectionChip;
