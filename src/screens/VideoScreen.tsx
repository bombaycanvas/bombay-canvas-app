import { useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useMoviesDataById } from '../api/video';
import VideoPlayer from '../components/VideoPlayer';
import { X } from 'lucide-react-native';

const EpisodesBottomSheet = ({
  visible,
  onClose,
  episodes,
  activeEpisode,
  onEpisodeSelect,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Episodes</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="white" size={24} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={episodes}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.episodeItem,
                  activeEpisode?.id === item.id && styles.activeEpisodeItem,
                ]}
                onPress={() => onEpisodeSelect(item)}
              >
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.thumbnail}
                />
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeTitleText}>
                    E{item.episodeNo}: {item.title}
                  </Text>
                  <Text style={styles.episodeDuration}>{item.duration}m</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const VideoScreen = () => {
  const route = useRoute();
  const { id } = route.params ?? {};

  const [playing, setPlaying] = useState(true);
  const [activeEpisode, setActiveEpisode] = useState<any>(null);
  const [isEpisodesVisible, setIsEpisodesVisible] = useState(false);

  const { data, isLoading } = useMoviesDataById(
    id ?? 'cmff99fyf0005s60esh5ndrws',
  );

  useEffect(() => {
    if (data?.movie?.episodes?.length > 0) {
      setActiveEpisode(data.movie.episodes[0]);
    }
  }, [data]);

  const handleEpisodeSelect = (episode: any) => {
    setActiveEpisode(episode);
    setIsEpisodesVisible(false);
    setPlaying(true);
  };

  if (isLoading || !activeEpisode) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoPlayer
        key={activeEpisode?.id}
        episode={activeEpisode}
        movie={data?.movie}
        playing={playing}
        setPlaying={setPlaying}
        onOpenEpisodes={() => setIsEpisodesVisible(true)}
      />
      <EpisodesBottomSheet
        visible={isEpisodesVisible}
        onClose={() => setIsEpisodesVisible(false)}
        episodes={data?.movie?.episodes}
        activeEpisode={activeEpisode}
        onEpisodeSelect={handleEpisodeSelect}
      />
    </View>
  );
};

export default VideoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    marginBottom: 16,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  activeEpisodeItem: {
    backgroundColor: '#333',
  },
  thumbnail: {
    width: 120,
    height: 70,
    borderRadius: 4,
  },
  episodeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  episodeTitleText: {
    color: 'white',
    fontSize: 16,
  },
  episodeDuration: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
});
