import React from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { X } from 'lucide-react-native';
import LockOutlined from '../assets/LockOutlined';
import SubscriptionOutlined from '../assets/SubscriptionOutlined';
import { useVideoStore } from '../store/videoStore';
import { SkeletonEpisodeItem } from './videoPlayer/SkeletonEpisodeItem';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';

type RootRedirectVideo = {
  Video: { id: string; episodeId: string };
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
}: any) => {
  const navigation = useNavigation<NavigationProp<RootRedirectVideo>>();
  const {
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    setCurrentEpisodeId,
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
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Episodes</Text>
            <TouchableOpacity activeOpacity={0.9} onPress={onClose}>
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
                          uri: item.thumbnail,
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
                    </View>

                    <View style={styles.episodeInfo}>
                      <Text style={styles.episodeTitleText}>
                        E{item.episodeNo}: {item.title}
                      </Text>
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
                      if (screenType === 'seriesDetail') {
                        setCurrentEpisodeId(item.id);
                        setTimeout(() => {
                          navigation.navigate('Video', {
                            id: series?.id,
                            episodeId: item.id,
                          });
                        }, 400);
                      } else {
                        onEpisodeSelect(item, index);
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
  episodeTitleText: { color: 'white', fontSize: 16 },
  episodeDuration: { color: '#aaa', fontSize: 12, marginTop: 4 },
});
