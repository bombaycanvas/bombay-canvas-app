import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { X } from 'lucide-react-native';
import LockOutlined from '../assets/LockOutlined';
import SubscriptionOutlined from '../assets/SubscriptionOutlined';
import { useVideoStore } from '../store/videoStore';
import { SkeletonEpisodeItem } from './videoPlayer/SkeletonEpisodeItem';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';
import { imgUrl } from '../api/video';

const EqualizerBar = ({ delay }: { delay: number }) => {
  const animatedHeight = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedHeight, {
          toValue: 16,
          duration: 350,
          useNativeDriver: false,
        }),
        Animated.timing(animatedHeight, {
          toValue: 4,
          duration: 350,
          useNativeDriver: false,
        }),
      ]),
    );

    const timeout = setTimeout(() => {
      animation.start();
    }, delay);

    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, [animatedHeight, delay]);

  return (
    <Animated.View
      style={{
        width: 3,
        height: animatedHeight,
        backgroundColor: 'white',
        borderRadius: 1.5,
        marginHorizontal: 1,
      }}
    />
  );
};

const EqualizerAnimation = () => {
  return (
    <View style={styles.equalizerContainer}>
      <View style={styles.equalizerBadge}>
        <View style={styles.equalizerBars}>
          <EqualizerBar delay={0} />
          <EqualizerBar delay={150} />
          <EqualizerBar delay={300} />
          <EqualizerBar delay={75} />
        </View>
      </View>
    </View>
  );
};

type RootRedirectVideo = {
  Video: { id: string; episodeId: string; posterUrl?: string };
};

export const EpisodesBottomSheet = ({
  visible,
  onClose,
  episodes,
  activeEpisode,
  onEpisodeSelect,
  isAuthenticated,
  isPending,
  series,
  screenType = 'videoScreen',
  posterUrl,
  isCasting,
}: any) => {
  const navigation = useNavigation<NavigationProp<RootRedirectVideo>>();
  const {
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    setCurrentEpisodeId,
    setAuthRedirect,
  } = useVideoStore();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Episodes</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onClose}
              style={{ padding: 10 }}
            >
              <X color="white" size={24} />
            </TouchableOpacity>
          </View>
          {!episodes && isPending ? (
            <FlatList
              data={Array.from({ length: 8 })}
              keyExtractor={(_, i) => i.toString()}
              renderItem={() => <SkeletonEpisodeItem />}
            />
          ) : (
            <FlatList
              data={episodes}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => {
                const locked = !item.isPublic && !isAuthenticated;
                const isPaidEpisode =
                  item.locked && series?.isPaidSeries && !series?.userPurchased;

                const isActive = activeEpisode?.id === item.id;

                const episodeContent = (
                  <>
                    <View style={styles.thumbWrapper}>
                      <FastImage
                        source={{
                          uri: imgUrl(item.thumbnail, 320),
                          priority: FastImage.priority.high,
                          cache: FastImage.cacheControl.immutable,
                        }}
                        style={styles.thumbnail}
                        resizeMode={FastImage.resizeMode.cover}
                      />

                      {locked && (
                        <View style={styles.lockOverlay}>
                          <View style={styles.lockBackground}>
                            <LockOutlined width={26} height={26} />
                          </View>
                        </View>
                      )}

                      {!locked && isPaidEpisode && (
                        <View style={styles.lockOverlay}>
                          <View style={styles.purchaseBackground}>
                            <SubscriptionOutlined />
                          </View>
                        </View>
                      )}

                      {!locked && !isPaidEpisode && isActive && (
                        <EqualizerAnimation />
                      )}

                      {item.progress !== undefined && item.progress > 0 && !item.completed && (
                        <View style={styles.thumbnailProgressBarBackground}>
                          <View
                            style={[
                              styles.thumbnailProgressBarFill,
                              { width: `${Math.min(100, Math.max(0, item.progress))}%` },
                            ]}
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.episodeInfo}>
                      <View style={styles.titleRow}>
                        <Text style={styles.episodeTitleText}>
                          E{item.episodeNo}: {item.title}
                        </Text>
                      </View>
                      <Text style={styles.episodeDuration}>
                        {item.duration}m
                      </Text>
                    </View>
                  </>
                );

                return (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      styles.episodeItem,
                      isActive && styles.activeEpisodeItem,
                    ]}
                    onPress={() => {
                      onClose();
                      if (locked) {
                        setAuthRedirect({
                          screen:
                            screenType === 'seriesDetail'
                              ? 'SeriesDetail'
                              : 'Video',
                          params: {
                            id: series?.id,
                            episodeId: item.id,
                            posterUrl: posterUrl || series?.posterUrl,
                          },
                        });
                        setTimeout(
                          () => {
                            requestAnimationFrame(() => {
                              setIsLockedVisibleModal(true);
                            });
                          },
                          Platform.OS === 'ios' ? 600 : 500,
                        );

                        return;
                      }
                      if (
                        !locked &&
                        item.locked &&
                        series?.isPaidSeries &&
                        !series?.userPurchased
                      ) {
                        setTimeout(
                          () => {
                            requestAnimationFrame(() => {
                              setPurchaseSeries(series);
                              setIsPurchaseModal(true);
                            });
                          },
                          Platform.OS === 'ios' ? 600 : 500,
                        );

                        return;
                      }
                      if (onEpisodeSelect) {
                        onEpisodeSelect(item, index);
                      }

                      if (screenType === 'seriesDetail' && !isCasting) {
                        setCurrentEpisodeId(item.id);
                        setTimeout(() => {
                          navigation.navigate('Video', {
                            id: series?.id,
                            episodeId: item.id,
                            posterUrl: posterUrl || series?.posterUrl,
                          });
                        }, 400);
                      }
                    }}
                  >
                    {isActive && (
                      <LinearGradient
                        colors={['#2d1910', '#181818']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    {episodeContent}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 50,
    height: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  activeEpisodeItem: {
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.4)',
    overflow: 'hidden',
    backgroundColor: '#181818',
  },
  thumbnail: { width: 120, height: 70, borderRadius: 4 },
  info: { flex: 1 },
  episodeTitle: { color: '#fff', fontSize: 14 },
  duration: { color: '#aaa', fontSize: 12, marginTop: 2 },
  thumbWrapper: {
    width: 120,
    height: 70,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,106,0,0.25)',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBackground: {
    width: 40,
    height: 40,
    borderRadius: 24,
    backgroundColor: 'rgba(255,106,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseBackground: {
    width: 40,
    height: 40,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: { marginLeft: 10, flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeTitleText: { color: 'white', fontSize: 16, flexShrink: 1 },
  completedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  episodeDuration: { color: '#aaa', fontSize: 12, marginTop: 4 },
  equalizerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equalizerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff6a00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equalizerBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 14,
    justifyContent: 'center',
  },
  thumbnailProgressBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  thumbnailProgressBarFill: {
    height: '100%',
    backgroundColor: '#ff6a00',
  },
});
