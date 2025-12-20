import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface LoadingLogoProps {
  fullScreen?: boolean;
}

export const LoadingLogo = ({ fullScreen = false }: LoadingLogoProps) => {
  const scale = useRef(new Animated.Value(15)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.2, 0, 0, 1),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(100),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => animation.stop();
  }, [scale, opacity, rotate, containerOpacity]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { opacity: containerOpacity },
      ]}
    >
      <Animated.Image
        source={require('../assets/logo_loading.png')}
        style={[
          styles.logo,
          {
            transform: [{ scale }, { rotate: spin }],
            opacity,
          },
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: 'black',
    zIndex: 9999,
  },
  logo: {
    width: 100,
    height: 100,
  },
});
