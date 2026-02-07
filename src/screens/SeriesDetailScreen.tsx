import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useAuthStore } from '../store/authStore';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  PanResponder,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
  NavigationProp,
  useIsFocused,
} from '@react-navigation/native';
import { useMoviesDataById } from '../api/video';
import { ChevronLeft, Pause, Play, SkipBack, SkipForward } from 'lucide-react-native';
import FastImage from '@d11/react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EpisodesBottomSheet } from '../components/EpisodesBottomSheet';
import { useVideoStore } from '../store/videoStore';
import { capitalizeWords } from '../utils/capitalizeWords';
import { BlurView } from '@react-native-community/blur';
import { useNetflixTransition } from '../hooks/useNetflixTransition';
import { BufferingIndicator } from '../components/videoPlayer/BufferingIndicator';
import { CastButton } from 'react-native-google-cast';
import { useCastManager } from '../hooks/useCastManager';

const { height, width } = Dimensions.get('window');
const DRAG_THRESHOLD = 120;

type RootStackParamList = {
  SeriesDetail: { id: string; cardLayout?: any; posterUrl?: string };
  Video: {
    id: string;
    episodeId?: string;
    cardLayout?: any;
    posterUrl?: string;
  };
};

type RootRedirectVideo = {
  Creator: { id: string };
  Video: { id: string; cardLayout?: any; posterUrl?: string };
};
const SeriesDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const videoRef = useRef(null);
  const navigation = useNavigation<NavigationProp<RootRedirectVideo>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SeriesDetail'>>();
  const params = route.params as any;
  const didAnimateRef = useRef(false);
  const id = params?.id;
  const cardLayout = params?.cardLayout;
  const posterUrl = params?.posterUrl;

  const { data, isLoading, isError } = useMoviesDataById(id);
  const {
    loadQueue,
    switchEpisode,
    isCasting,
    play,
    pause,
    next,
    previous,
    playerState,
    MediaPlayerState,
  } = useCastManager();
  const [isPlaying, setIsPlaying] = useState(true);

  const [isReady, setIsReady] = useState(false);
  const {
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    setAuthRedirect,
    setSeries,
    setEpisodes,
    authRedirect,
  } = useVideoStore();
  const [isEpisodesSheetOpen, setIsEpisodesSheetOpen] = useState(false);
  const { progress, getAnimationValues, open, close, snapBack } =
    useNetflixTransition(Platform.OS === 'ios' ? 0 : 1);

  const [currentEpisode, setCurrentEpisode] = useState<any>(null);
  const series = data?.series;
  const previewEpisode = currentEpisode;
  const queueLoadedRef = useRef(false);

  useEffect(() => {
    if (series?.episodes?.length && !currentEpisode) {
      setCurrentEpisode(series.episodes[0]);
    }
  }, [series, currentEpisode]);

  const previewVideoUrl = previewEpisode?.videoUrl
    ? encodeURI(previewEpisode.videoUrl)
    : undefined;

  const isFocused = useIsFocused();
  const { isAuthenticated: globalAuth } = useAuthStore();
  const isAuthenticated = data?.isAuthenticated || globalAuth;
  const locked =
    currentEpisode && !currentEpisode?.isPublic && !isAuthenticated;
  const isPaidEpisode =
    !locked &&
    currentEpisode?.locked &&
    series?.isPaidSeries &&
    !series?.userPurchased;
  const shouldFetch = !locked && !isPaidEpisode;

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
        const dragProgress = dragDistance / (height * 0.7);
        const newProgress = Math.max(0, 1 - dragProgress * 1.5);

        progress.setValue(newProgress);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!cardLayout) return;

        const shouldClose =
          gestureState.dy > DRAG_THRESHOLD || gestureState.vy > 0.5;

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
    if (!queueLoadedRef.current && isCasting && series && currentEpisode) {
      loadQueue(series, currentEpisode.id, isAuthenticated);
      queueLoadedRef.current = true;
    }

    if (!isCasting) {
      queueLoadedRef.current = false;
    }
  }, [isCasting, series, currentEpisode, loadQueue]);

  useEffect(() => {
    if (didAnimateRef.current) return;
    didAnimateRef.current = true;
    if (cardLayout && Platform.OS === 'ios') {
      open(cardLayout);
    } else {
      progress.setValue(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (series) {
      setSeries(series);
      if (series.episodes?.length) {
        setEpisodes(series?.episodes);
      }
    }
  }, [series, setSeries, setEpisodes]);

  useEffect(() => {
    if (isCasting && series?.userPurchased && authRedirect?.params?.episodeId) {
      const purchasedEpisodeId = authRedirect.params.episodeId;
      loadQueue(series, purchasedEpisodeId, isAuthenticated);
      setAuthRedirect(null);
      console.log('Post-purchase casting triggered for episode:', purchasedEpisodeId);
    }
  }, [isCasting, series?.userPurchased, authRedirect, loadQueue, isAuthenticated, setAuthRedirect]);

  const handleBack = useCallback(() => {
    if (cardLayout && Platform.OS === 'ios') {
      close(cardLayout, () => {
        didAnimateRef.current = false;
        navigation.goBack();
      });
    } else {
      navigation.goBack();
    }
  }, [cardLayout, close, navigation]);

  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      return () => {
        setIsPlaying(false);
        setIsReady(false);
      };
    }, []),
  );

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleViewEpisodes = () => {
    setIsPlaying(false);
    setIsEpisodesSheetOpen(true);
  };

  if (isError) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: 'white' }}>Error loading series.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#000',
            opacity: animationValues.backdropOpacity,
          },
        ]}
      />
      {Platform.OS === 'ios' && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 20,
              opacity: animationValues.posterOpacity,
              transform: [
                { translateX: animationValues.posterTranslateX },
                { translateY: animationValues.posterTranslateY },
                { scale: animationValues.posterScale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: animationValues.borderRadius,
                overflow: 'hidden',
              },
            ]}
          >
            <FastImage
              source={{
                uri:
                  posterUrl ||
                  series?.posterUrl ||
                  'https://via.placeholder.com/300x400',
                priority: FastImage.priority.high,
                cache: FastImage.cacheControl.immutable,
              }}
              style={[StyleSheet.absoluteFill]}
              resizeMode="cover"
              onLoad={() => console.log('Poster loaded')}
              onError={e => console.log('Poster error:', e.nativeEvent.error)}
            />
          </Animated.View>

          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: animationValues.blurOpacity,
              },
            ]}
            pointerEvents="none"
          >
            {Platform.OS === 'ios' ? (
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={20}
                reducedTransparencyFallbackColor="rgba(0,0,0,0.8)"
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: 'rgba(0,0,0,0.7)' },
                ]}
              />
            )}
          </Animated.View>
        </Animated.View>
      )}
      <Animated.View
        style={[
          styles.videoWrapper,
          {
            opacity: animationValues.videoOpacity,
            transform: [
              { translateX: animationValues.translateX },
              { translateY: animationValues.translateY },
              { scale: animationValues.scale },
            ],
          },
        ]}
        pointerEvents="box-none"
        {...panResponder.panHandlers}
      >
        {series && isFocused && (
          <Video
            useTextureView={true}
            ref={videoRef}
            source={previewVideoUrl ? { uri: previewVideoUrl } : undefined}
            style={styles.video}
            paused={!isPlaying || isCasting}
            resizeMode="cover"
            onReadyForDisplay={() => setIsReady(true)}
            poster={series?.posterUrl}
            posterResizeMode="cover"
            repeat
          />
        )}
        {!isReady && series && (
          <FastImage
            source={{
              uri: currentEpisode?.thumbnail || series.posterUrl,
              priority: FastImage.priority.high,
            }}
            style={StyleSheet.absoluteFill}
            resizeMode={FastImage.resizeMode.cover}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
          style={styles.gradient}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
        />
      </Animated.View>

      <View style={[styles.backButtonContainer, { top: insets.top + 10 }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleBack}>
          <ChevronLeft color="#ff6a00" size={28} />
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: animationValues.contentOpacity,
          },
        ]}
      >
        {series && (
          <View style={styles.contentWrapper}>
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: height * 0.5 },
              ]}
            >
              <View style={styles.content}>
                <Text style={styles.title}>{series.title}</Text>

                <View style={styles.actionsRow}>
                  {locked ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.watchButton}
                      onPress={() => {
                        setIsLockedVisibleModal(true);
                        setAuthRedirect({
                          screen: 'SeriesDetail',
                          params: { id, posterUrl },
                        });
                      }}
                    >
                      <Text style={styles.watchText}>Unlock Episodes</Text>
                    </TouchableOpacity>
                  ) : isPaidEpisode ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.watchButton}
                      onPress={() => {
                        setPurchaseSeries(series);
                        setIsPurchaseModal(true);
                      }}
                    >
                      <Text style={styles.watchText}>Purchase Episodes</Text>
                    </TouchableOpacity>
                  ) : (
                    shouldFetch && (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={[styles.watchButton, isCasting && styles.buttonDisabled]}
                          disabled={isCasting}
                          onPress={() => {
                            setIsPlaying(false);
                            setTimeout(() => {
                              navigation.navigate('Video', {
                                id,
                                cardLayout,
                                posterUrl,
                              });
                            }, 100);
                          }}
                        >
                          <Text style={styles.watchText}>Watch Now</Text>
                        </TouchableOpacity>

                        {/* Watch on TV Button - Styled like Play/Pause button */}
                        {series?.isTV && (
                          <View
                            style={[
                              styles.castButton,
                              {
                                width: 46,
                                height: 46,
                                overflow: 'hidden',
                              },
                            ]}
                          >
                            <CastButton
                              style={
                                {
                                  width: 46,
                                  height: 46,
                                  backgroundColor: 'transparent',
                                  tintColor: '#ff6a00',
                                } as any
                              }
                            />
                          </View>
                        )}
                      </>
                    )
                  )}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.playPauseButton}
                    onPress={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause color="#ff6a00" size={22} />
                    ) : (
                      <Play color="#ff6a00" size={22} />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.metaText}>
                  {new Date(series.releaseDate).getFullYear()} •{' '}
                  {capitalizeWords(series.genres?.[0]?.name || '')} •{' '}
                  {series.episodes?.length || 0} Episodes
                </Text>

                {/* Creator Info - FIXED: Ensure it shows */}
                {isCasting ? (
                  <View style={styles.castingControlsContainer}>
                    <Text style={styles.castingStatusText}>
                      Casting to TV
                    </Text>
                    <View style={styles.castingButtonsRow}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.castControlButton}
                        onPress={previous}
                      >
                        <SkipBack color="#fff" size={28} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[styles.castControlButton, styles.playPauseCastButton]}
                        onPress={() => {
                          if (playerState === MediaPlayerState.PLAYING || playerState === MediaPlayerState.BUFFERING) {
                            pause();
                          } else {
                            play();
                          }
                        }}
                      >
                        {playerState === MediaPlayerState.PLAYING || playerState === MediaPlayerState.BUFFERING ? (
                          <Pause color="#000" size={32} fill="#000" />
                        ) : (
                          <Play color="#000" size={32} fill="#000" />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.castControlButton}
                        onPress={next}
                      >
                        <SkipForward color="#fff" size={28} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    {series.uploader && (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.creatorRow}
                        onPress={() =>
                          navigation.navigate('Creator', {
                            id: series.uploader?.id,
                          })
                        }
                      >
                        <FastImage
                          source={{
                            uri:
                              series.uploader?.profiles?.[0]?.avatarUrl ||
                              'https://via.placeholder.com/40',
                            priority: FastImage.priority.high,
                            cache: FastImage.cacheControl.immutable,
                          }}
                          style={styles.avatar}
                          resizeMode={FastImage.resizeMode.cover}
                        />
                        <Text
                          style={styles.creatorName}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {capitalizeWords(series.uploader?.name || 'Unknown')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {series.description && (
                      <Text
                        style={styles.description}
                        numberOfLines={10}
                        ellipsizeMode="tail"
                      >
                        {series.description}
                      </Text>
                    )}
                  </>
                )}
                <View style={{ height: 100 }} />
              </View>
            </ScrollView>
            <View
              style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.episodesButton,
                  // isCasting && styles.buttonDisabled
                ]}
                // disabled={isCasting}
                onPress={handleViewEpisodes}
              >
                <Text style={styles.episodesButtonText}>View Episodes</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {(isLoading || !series) && (
        <View style={styles.loaderOverlay}>
          <BufferingIndicator />
        </View>
      )}
      {series && (
        <EpisodesBottomSheet
          visible={isEpisodesSheetOpen}
          onClose={() => setIsEpisodesSheetOpen(false)}
          episodes={series.episodes}
          activeEpisode={currentEpisode}
          onEpisodeSelect={(ep: any) => {
            if (isCasting) {
              switchEpisode(series, ep.id, isAuthenticated);
            } else {
              setCurrentEpisode(ep);
            }
          }}
          isAuthenticated={isAuthenticated}
          isPending={isLoading}
          series={series}
          screenType="seriesDetail"
          cardLayout={cardLayout}
          posterUrl={posterUrl}
          isCasting={isCasting}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backButtonContainer: {
    position: 'absolute',
    left: 0,
    zIndex: 20,
    justifyContent: 'center',
    padding: 12,
  },
  videoWrapper: {
    position: 'absolute',
    width: width,
    height: height * 0.5,
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    height: '45%',
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  watchButton: {
    flex: 1,
    backgroundColor: '#ff6a00',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  playPauseButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    padding: 12,
  },
  castButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 16,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.25)',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  creatorName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  description: {
    color: '#ddd',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    backgroundColor: '#000',
    paddingTop: 10,
  },
  episodesButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.4)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  episodesButtonText: {
    color: '#ff6a00',
    fontSize: 16,
    fontWeight: '700',
  },
  loader: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 25,
  },
  castingControlsContainer: {
    backgroundColor: 'rgba(255,106,0,0.1)',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.3)',
  },
  castingStatusText: {
    color: '#ff6a00',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  castingButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  castControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseCastButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff6a00',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default SeriesDetailScreen;
