import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ShimmerLoaderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
  shimmerWidth?: number;
  duration?: number;
  colors?: string[];
  containerBackgroundColor?: string;
}

const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({
  width = '100%',
  height = '100%',
  borderRadius = 0,
  style,
  shimmerWidth = 150,
  duration = 1500,
  colors = ['transparent', 'rgba(255, 106, 0, 0.2)', 'transparent'],
  containerBackgroundColor = 'rgba(255,255,255,0.05)',
}) => {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    shimmerAnim.setValue(-1);
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 2,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-shimmerWidth, 600],
  });

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: containerBackgroundColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerContainer,
          {
            width: shimmerWidth,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmerContainer: {
    height: '100%',
  },
  shimmerGradient: {
    flex: 1,
  },
});

export default ShimmerLoader;
