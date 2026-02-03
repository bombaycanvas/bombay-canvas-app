import React from 'react';
import { View, ScrollView } from 'react-native';
import Explore from '../components/Explore';
import Landing from '../components/Landing';
import {
  useMoviesData,
  useRecommendedSeriesData,
  useGetCoverVideo,
} from '../api/video';
import { useNavigation } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';

export default function HomeScreen() {
  const { data, isLoading } = useMoviesData();
  const { data: recommendedSeriesData, isLoading: isRecommendedLoading } =
    useRecommendedSeriesData();
  const { data: coverVideoData } = useGetCoverVideo();
  const navigation = useNavigation<any>();

  React.useEffect(() => {
    const urlsToPreload: string[] = [];

    // Limit to first 5 movies from 'New on canvas'
    if (data?.series) {
      data.series.slice(0, 5).forEach(movie => {
        if (movie.posterUrl) {
          urlsToPreload.push(movie.posterUrl);
        }
        if (movie.uploader?.profiles?.[0]?.avatarUrl) {
          urlsToPreload.push(movie.uploader.profiles[0].avatarUrl);
        }
      });
    }

    // Limit to first 5 movies from 'Recommended'
    if (recommendedSeriesData?.series) {
      recommendedSeriesData.series.slice(0, 5).forEach(movie => {
        if (movie.posterUrl) {
          urlsToPreload.push(movie.posterUrl);
        }
        if (movie.uploader?.profiles?.[0]?.avatarUrl) {
          urlsToPreload.push(movie.uploader.profiles[0].avatarUrl);
        }
      });
    }

    if (coverVideoData?.admin?.profiles?.[0]?.avatarUrl) {
      urlsToPreload.push(coverVideoData.admin.profiles[0].avatarUrl);
    }

    if (urlsToPreload.length > 0) {
      const uniqueUrls = Array.from(new Set(urlsToPreload)).map(uri => ({
        uri,
        priority: FastImage.priority.low, // Lower priority to save bandwidth
        cache: FastImage.cacheControl.immutable,
      }));
      FastImage.preload(uniqueUrls);
    }
  }, [data, recommendedSeriesData, coverVideoData]);

  const getMoviesByGenre = () => {
    const genreMap: Record<string, any[]> = {};
    data?.series?.forEach(movie => {
      movie.genres?.forEach(genre => {
        if (!genreMap[genre.name]) genreMap[genre.name] = [];
        genreMap[genre.name].push(movie);
      });
    });
    return genreMap;
  };

  const genreMap = getMoviesByGenre();

  const onCardPress = (movie: any, cardLayout: any) => {
    navigation.navigate('SeriesDetail', {
      id: movie.id,
      cardLayout,
      posterUrl: movie.posterUrl,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView>
        <Landing />
        <Explore
          heading={'Recommended for you'}
          movieData={recommendedSeriesData?.series ?? []}
          isLoading={isRecommendedLoading}
          onCardPress={onCardPress}
        />
        <Explore
          heading={'New on canvas'}
          movieData={data?.series ?? []}
          isLoading={isLoading}
          onCardPress={onCardPress}
        />
        {Object.entries(genreMap)?.map(([genreName, movies]) => (
          <Explore
            key={genreName}
            heading={genreName}
            movieData={movies}
            isLoading={isLoading}
            onCardPress={onCardPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}
