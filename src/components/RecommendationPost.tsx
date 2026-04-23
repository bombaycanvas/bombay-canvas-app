import React, { useState, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { Play, Volume2, VolumeX } from 'lucide-react-native';
import Video, { OnLoadData } from 'react-native-video';
import { useIsFocused } from '@react-navigation/native';

interface RecommendationPostProps {
  item: any;
  navigation: any;
  isActive: boolean;
}

const RecommendationPost: React.FC<RecommendationPostProps> = ({
  item,
  navigation,
  isActive,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const isFocused = useIsFocused();
  const videoRef = useRef<React.ElementRef<typeof Video>>(null);

  const description = item.description || item.overview || '';
  const videoUrl = item.trailerUrl || 'http://vjs.zencdn.net/v/oceans.mp4';

  const handleVideoLoad = (data: OnLoadData) => {
    setIsVideoReady(true);
    if (data.naturalSize) {
      const { width, height } = data.naturalSize || {};
      if (!width || !height) return;

      const ratio = width / height;
      if (Math.abs(ratio - 16 / 9) < Math.abs(ratio - 4 / 3)) {
        setAspectRatio(16 / 9);
      } else {
        setAspectRatio(4 / 3);
      }
    }
  };
  console.log('item', item);
  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.avatarContainer}>
          <FastImage
            source={{
              uri:
                item.uploader.profiles[0]?.avatarUrl ||
                'https://storage.googleapis.com/bombay_canvas_buckett/uploads/1758545484110-aaa.png',
            }}
            style={styles.avatar}
          />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>
          <Text style={styles.uploaderNameSmall}>
            {item.uploader.profiles[0]?.name}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.watchHeaderButton}
          onPress={() => {
            navigation.navigate('SeriesDetail', {
              id: item.id,
              posterUrl: item.posterUrl,
            });
          }}
        >
          <Play
            style={{ marginRight: 5 }}
            color="#ff6a00"
            size={18}
            fill="#ff6a00"
          />
          <Text style={styles.watchHeaderText}>Watch</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.mediaContainer, { aspectRatio: aspectRatio }]}>
        {videoUrl && isFocused && isActive ? (
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.mainMedia}
              paused={!isActive}
              resizeMode="cover"
              repeat
              muted={isMuted}
              playWhenInactive={false}
              onLoad={handleVideoLoad}
              onReadyForDisplay={() => setIsVideoReady(true)}
              poster={item.posterUrl}
              posterResizeMode="cover"
              useTextureView={Platform.OS === 'android'}
            />
            {isVideoReady && (
              <TouchableOpacity
                style={styles.muteButton}
                onPress={() => setIsMuted(prev => !prev)}
              >
                {isMuted ? (
                  <VolumeX color="white" size={20} />
                ) : (
                  <Volume2 color="white" size={20} />
                )}
              </TouchableOpacity>
            )}
            {!isVideoReady && (
              <FastImage
                source={{ uri: item.posterUrl }}
                style={[styles.mainMedia, StyleSheet.absoluteFill]}
                resizeMode="cover"
              />
            )}
          </View>
        ) : (
          item.posterUrl && (
            <FastImage
              source={{ uri: item.posterUrl }}
              style={styles.mainMedia}
              resizeMode="cover"
            />
          )
        )}
      </View>

      <View style={styles.captionArea}>
        <View style={styles.titleRow}>
          <Text
            style={styles.captionText}
            numberOfLines={isExpanded ? undefined : 1}
          >
            {description}
          </Text>
          {!isExpanded && description.length > 40 && (
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setIsExpanded(true)}
            >
              <Text style={styles.moreText}>...see more</Text>
            </TouchableOpacity>
          )}
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setIsExpanded(false)}
              style={styles.lessTextContainer}
            >
              <Text style={styles.lessText}>Show Less</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postContainer: {
    backgroundColor: '#000',
    marginBottom: 20,
    width: '100%',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#ff6a00',
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  uploaderNameSmall: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  watchHeaderButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,106,0,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,106,0,0.3)',
  },
  watchHeaderText: {
    color: '#ff6a00',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaContainer: {
    width: '100%',
    backgroundColor: '#111',
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: 16 / 9,
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
  },
  mainMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  muteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  captionArea: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  captionText: {
    color: '#fff',
    fontSize: 16,
    flexShrink: 1,
  },
  moreText: {
    color: '#FF6A00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  lessTextContainer: {
    marginTop: 8,
  },
  lessText: {
    color: '#FF6A00',
    fontSize: 14,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 4,
  },
});

export default memo(RecommendationPost, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title
  );
});
