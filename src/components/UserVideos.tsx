import FastImage from '@d11/react-native-fast-image';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';

type Movie = {
  id: string;
  posterUrl?: string;
};

type UserVideosProps = {
  data?: Movie[];
  isLoading?: boolean;
};

type RootStackParamList = {
  Video: { id: string };
};

const UserVideos: React.FC<UserVideosProps> = ({ data, isLoading }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  if (isLoading) {
    return (
      <FlatList
        data={Array.from({ length: 16 })}
        numColumns={3}
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
    <FlatList
      data={data ?? []}
      numColumns={3}
      contentContainerStyle={styles.wrapper}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableWithoutFeedback
          onPress={() => navigation.navigate('Video', { id: item.id })}
        >
          <View style={[styles.card, { backgroundColor: '#222' }]}>
            <FastImage
              source={{
                uri: item.posterUrl,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.poster}
              resizeMode={FastImage.resizeMode.cover}
            />
          </View>
        </TouchableWithoutFeedback>
      )}
    />
  );
};

export default UserVideos;

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
    paddingHorizontal: 16,
    backgroundColor: 'black',
    gap: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    width: 110,
    height: 160,
    borderRadius: 12,
  },
});
