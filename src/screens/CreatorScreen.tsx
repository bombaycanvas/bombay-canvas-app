import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StyleSheet, ScrollView, RefreshControl, TouchableOpacity, View, Text, Dimensions, Animated, Platform, PanResponder } from 'react-native';
import CreatorLanding from '../components/CreatorLanding';
import { useMoviesDataByCreator } from '../api/video';
import CreatorGrids from '../components/CreatorGrid';
import { useCallback, useRef, useMemo, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetflixTransition } from '../hooks/useNetflixTransition';

type CreatorStackParamList = {
  Creator: { id: string };
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAG_THRESHOLD = 120;

const CreatorScreen = () => {
  const route = useRoute<RouteProp<CreatorStackParamList, 'Creator'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = route.params as any;
  const id = params?.id ?? 'cmfc48arw0002s60ex05k9w5c';
  const cardLayout = params?.cardLayout;

  const { data, isLoading, refetch, isFetching } = useMoviesDataByCreator(
    id,
  );

  const { progress, getAnimationValues, open, close, snapBack } = useNetflixTransition();
  const didAnimateRef = useRef(false);

  const animationValues = useMemo(() => {
    if (cardLayout) {
      return getAnimationValues(cardLayout);
    }
    return {
      scale: new Animated.Value(1),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      blurOpacity: new Animated.Value(0),
      contentOpacity: new Animated.Value(1),
      backdropOpacity: new Animated.Value(0.7),
      posterOpacity: new Animated.Value(0),
      posterScale: new Animated.Value(1),
      posterTranslateX: new Animated.Value(0),
      posterTranslateY: new Animated.Value(0),
      videoOpacity: new Animated.Value(1),
      borderRadius: new Animated.Value(0),
    };
  }, [cardLayout, getAnimationValues]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => Platform.OS === 'ios',
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (Platform.OS !== 'ios') return false;
        return (
          gestureState.dy > 10 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderGrant: () => {
        progress.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (!cardLayout) return;
        const dragDistance = Math.max(0, gestureState.dy);
        const dragProgress = dragDistance / (SCREEN_HEIGHT * 0.7);
        const newProgress = Math.max(0, 1 - dragProgress * 1.5);
        progress.setValue(newProgress);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!cardLayout) return;
        const shouldClose = gestureState.dy > DRAG_THRESHOLD || gestureState.vy > 0.5;
        if (shouldClose) {
          handleBack();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: () => {
        snapBack();
      },
    }),
  ).current;

  useEffect(() => {
    if (didAnimateRef.current) return;
    didAnimateRef.current = true;
    if (cardLayout && Platform.OS === 'ios') {
      open(cardLayout);
    } else {
      progress.setValue(1);
    }
  }, [cardLayout, open, progress]);

  const handleBack = useCallback(() => {
    if (cardLayout && Platform.OS === 'ios') {
      close(cardLayout, () => {
        navigation.goBack();
      });
    } else {
      navigation.goBack();
    }
  }, [cardLayout, close, navigation]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const noSeries = !data?.series || data?.series?.length === 0;

  return (
    <View style={styles.mainContainer} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#000',
            opacity: animationValues.backdropOpacity,
          },
        ]}
      />
      <View style={[styles.backButtonContainer, { top: insets.top + 10 }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleBack}>
          <ChevronLeft color="#ff6a00" size={28} />
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[
          styles.animatedContent,
          {
            opacity: animationValues.contentOpacity,
            transform: [
              { translateX: animationValues.translateX },
              { translateY: animationValues.translateY },
              { scale: animationValues.scale },
            ],
          },
        ]}
      >
        <Animated.View style={{ flex: 1, borderRadius: animationValues.borderRadius, overflow: 'hidden' }}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={onRefresh}
                tintColor="#fff"
              />
            }
          >
            <CreatorLanding data={data} />

            {noSeries ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  This creator hasn’t uploaded any series yet.
                </Text>
              </View>
            ) : (
              <CreatorGrids data={data} isLoading={isLoading} />
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default CreatorScreen;
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
  },
  scrollView: {
    flex: 1,
  },
  backButtonContainer: {
    position: 'absolute',
    left: 0,
    zIndex: 999,
    justifyContent: 'center',
    padding: 12,
  },
  animatedContent: {
    flex: 1,
    backgroundColor: 'black',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    textAlign: 'center',
  },
});
