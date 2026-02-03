import { useRef, useCallback } from 'react';
import { Animated, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const useNetflixTransition = (initialValue: number = 0) => {
  const progress = useRef(new Animated.Value(initialValue)).current;
  const isAnimating = useRef(false);

  // Derived animation values
  const getAnimationValues = useCallback(
    (cardLayout: { x: number; y: number; width: number; height: number }) => {
      const startX = cardLayout.x + cardLayout.width / 2;
      const startY = cardLayout.y + cardLayout.height / 2;
      const endX = SCREEN_WIDTH / 2;
      const endY = SCREEN_HEIGHT * 0.25;

      const initialScale = Math.min(
        cardLayout.width / SCREEN_WIDTH,
        cardLayout.height / (SCREEN_HEIGHT * 0.5),
      );

      const translateX = startX - endX - (Platform.OS === 'ios' ? 6 : 0);
      const translateY = startY - endY;

      // Poster-specific values target full screen center
      const posterEndY = SCREEN_HEIGHT / 2;
      const posterInitialScale = Math.min(
        cardLayout.width / SCREEN_WIDTH,
        cardLayout.height / SCREEN_HEIGHT,
      );
      const posterTranslateY = startY - posterEndY;

      const scale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [initialScale, 1],
        extrapolate: 'clamp',
      });

      const posterScale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [posterInitialScale, 1],
        extrapolate: 'clamp',
      });

      const translateXAnim = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [translateX, 0],
        extrapolate: 'clamp',
      });

      const translateYAnim = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [translateY, 0],
        extrapolate: 'clamp',
      });

      const posterTranslateYAnim = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [posterTranslateY, 0],
        extrapolate: 'clamp',
      });

      const blurOpacity = progress.interpolate({
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 1, 1, 0],
        extrapolate: 'clamp',
      });

      const contentOpacity = progress.interpolate({
        inputRange: [0.7, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

      const backdropOpacity = progress.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 0.3, 0.7],
        extrapolate: 'clamp',
      });

      const posterOpacity = progress.interpolate({
        inputRange: [0, 0.85, 0.95, 1],
        outputRange: [1, 1, 0, 0],
        extrapolate: 'clamp',
      });

      const videoOpacity = progress.interpolate({
        inputRange: [0, 0.8, 0.9, 1],
        outputRange: [0, 0, 1, 1],
        extrapolate: 'clamp',
      });

      const cardRadiusAtStart = 12 / initialScale;

      const borderRadius = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [cardRadiusAtStart, 0],
        extrapolate: 'clamp',
      });

      return {
        scale,
        translateX: translateXAnim,
        translateY: translateYAnim,
        posterScale,
        posterTranslateX: translateXAnim,
        posterTranslateY: posterTranslateYAnim,
        blurOpacity,
        contentOpacity,
        backdropOpacity,
        posterOpacity,
        videoOpacity,
        borderRadius,
      };
    },
    [progress],
  );

  const open = (cardLayout: any, onFinish?: () => void) => {
    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start(() => {
      onFinish?.();
    });
  };

  const close = (cardLayout: any, onFinish?: () => void) => {
    isAnimating.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
      progress.setValue(0);
      onFinish?.();
    });
  };

  // Snap back animation
  const snapBack = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start(() => {
      isAnimating.current = false;
    });
  }, [progress]);

  return {
    progress,
    getAnimationValues,
    open,
    close,
    snapBack,
    isAnimating: isAnimating.current,
  };
};
