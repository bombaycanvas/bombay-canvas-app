import FastImage from '@d11/react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { FlatGrid } from 'react-native-super-grid';
import { RootStackParamList } from '../types/navigation';
import { capitalizeWords } from '../utils/capitalizeWords';

type Series = {
  id: string;
  posterUrl?: string;
  uploaderId?: string;
  uploader?: {
    name?: string;
    profiles?: { avatarUrl?: string }[];
  };
};

type CreatorGridsProps = {
  data?: { series?: Series[] };
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

const CreatorCard = React.memo(({ item, navigation }: { item: Series; navigation: any }) => {
  const cardRef = React.useRef<View>(null);
  return (
    <View ref={cardRef}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, { backgroundColor: '#222' }]}
        onPress={() => {
          cardRef.current?.measureInWindow((x, y, width, height) => {
            navigation.navigate('SeriesDetail', {
              id: item.id,
              posterUrl: item.posterUrl,
            });
          });
        }}
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
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.videoOverlay}
          onPress={e => {
            e.stopPropagation();
          }}
        >
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
          <Text style={styles.name}>
            {capitalizeWords(item?.uploader?.name)}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
});

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
      data={data?.series ?? []}
      spacing={12}
      itemDimension={110}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.wrapper}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <CreatorCard item={item} navigation={navigation} />
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
    borderWidth: 0.5,
    borderColor: 'rgba(205,106,0,0.25)',
  },
  poster: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: 8.78,
  },
  videoOverlay: {
    position: 'absolute',
    left: 10,
    height: 15,
    width: 'auto',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingRight: 4,
  },
  avatar: {
    width: 15,
    height: 15,
    borderRadius: 50,
    marginRight: 3,
  },
  name: {
    fontSize: 7.5,
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
    color: '#fff',
  },
});
