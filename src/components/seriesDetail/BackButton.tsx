import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

interface BackButtonProps {
  onPress: () => void;
  top: number;
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress, top }) => {
  return (
    <View style={[styles.backButtonContainer, { top }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <ChevronLeft color="#ff6a00" size={28} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  backButtonContainer: {
    position: 'absolute',
    left: 0,
    zIndex: 20,
    justifyContent: 'center',
    padding: 12,
  },
});
