import FastImage from '@d11/react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { FlatGrid } from 'react-native-super-grid';
import { RootStackParamList } from '../types/navigation';

type Movie = {
  id: string;
  posterUrl?: string;
  uploaderId?: string;
  uploader?: {
    name?: string;
    profiles?: { avatarUrl?: string }[];
  };
};

type CreatorGridsProps = {
  data?: { allMovies?: Movie[] };
  isLoading?: boolean;
  onNavigateVideo?: (id: string) => void;
  onNavigateCreator?: (id: string) => void;
};

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Search'
>;

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const NUM_COLUMNS = 3;
const CARD_WIDTH = (width - CARD_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

const CreatorGrids: React.FC<CreatorGridsProps> = ({ data, isLoading }) => {
  const navigation = useNavigation<SearchScreenNavigationProp>();

  if (isLoading) {
    return (
      <FlatList
        data={Array.from({ length: 16 })}
        numColumns={4}
        contentContainerStyle={styles.wrapper}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        keyExtractor={(_, index) => `skeleton-${index}`}
        renderItem={() => (
          <View style={styles.card}>
            <View style={[styles.poster, { backgroundColor: '#333' }]} />
          </View>
        )}
      />
    );
  }

  return (
    <FlatGrid
      data={data?.allMovies ?? []}
      spacing={12}
      itemDimension={110}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.wrapper}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.card, { backgroundColor: '#222' }]}
          onPress={() => navigation.navigate('Video', { id: item.id })}
        >
          <FastImage
            source={{
              uri: item.posterUrl,
              priority: FastImage.priority.normal,
              cache: FastImage.cacheControl.immutable,
            }}
            style={styles.poster}
            resizeMode={FastImage.resizeMode.cover}
          />

          <TouchableOpacity style={styles.videoOverlay}>
            <Image
              source={{
                uri:
                  item?.uploader?.profiles &&
                  item.uploader.profiles.length > 0 &&
                  item.uploader.profiles[0]?.avatarUrl
                    ? item.uploader.profiles[0].avatarUrl
                    : undefined,
              }}
              style={styles.avatar}
            />
            <Text style={styles.name}>{item?.uploader?.name}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
};

export default CreatorGrids;

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
    backgroundColor: 'black',
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: 8.78,
  },
  videoOverlay: {
    position: 'absolute',
    left: 10,
    height: 12,
    width: 42,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  avatar: {
    width: 10,
    height: 10,
    borderRadius: 50,
    marginRight: 6,
  },
  name: {
    fontSize: 3.3,
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
    color: '#fff',
  },
});
