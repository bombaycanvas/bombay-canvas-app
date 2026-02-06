import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { capitalizeWords } from '../utils/capitalizeWords';
import { SharedElement } from 'react-navigation-shared-element';
import { useVideoStore } from '../store/videoStore';
import LinearGradient from 'react-native-linear-gradient';

type Movie = any;

type ExploreProps = {
  heading: string;
  movieData: Movie[];
  isLoading?: boolean;
  onCardPress?: (movie: Movie, layout: any) => void;
};

type RootStackParamList = {
  SeriesDetail: { id: string | number; cardLayout?: any; posterUrl: string };
  Creator: { id: string | number; cardLayout?: any };
};

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const ExploreCard = React.memo(
  ({
    movie,
    navigation,
    onCardPress,
  }: {
    movie: Movie;
    navigation: Navigation;
    onCardPress?: (movie: Movie, layout: any) => void;
  }) => {
    const opacity = React.useRef(new Animated.Value(0)).current;
    const cardRef = React.useRef<View>(null);
    const { setActiveCardRef } = useVideoStore();

    const [isImageLoaded, setIsImageLoaded] = React.useState(false);
    const shimmerAnim = React.useRef(new Animated.Value(-1)).current;
    const skeletonOpacity = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
      if (!isImageLoaded) {
        shimmerAnim.setValue(-150);

        const loop = Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 150,
            duration: 1300,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        );

        loop.start();

        return () => loop.stop();
      }
    }, [isImageLoaded]);


    const shimmerTranslate = shimmerAnim;


    const handleLoad = () => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(skeletonOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsImageLoaded(true);
      });
    };


    return (
      <View ref={cardRef} collapsable={false}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.card}
          disabled={!isImageLoaded}
          onPress={() => {
            if (!isImageLoaded) return;

            setActiveCardRef(cardRef);
            cardRef.current?.measureInWindow((x, y, width, height) => {
              onCardPress?.(movie, { x, y, width, height });
            });
          }}
        >
          {/* Skeleton */}
          {!isImageLoaded && (
            <Animated.View
              style={[
                styles.skeletonCard,
                { opacity: skeletonOpacity }
              ]}
            >
              <Animated.View
                style={[
                  styles.shimmerContainer,
                  { transform: [{ translateX: shimmerTranslate }] },
                ]}
              >
                <LinearGradient
                  colors={[
                    'transparent',
                    'rgba(255, 106, 0, 0.31)',
                    'transparent',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shimmerGradient}
                />
              </Animated.View>
            </Animated.View>
          )}


          <SharedElement id={`series.${movie?.id}.poster`} style={{ flex: 1 }}>
            <Animated.View style={{ flex: 1, opacity }}>
              <FastImage
                source={{
                  uri:
                    movie?.posterUrl || 'https://via.placeholder.com/300x400',
                  priority: FastImage.priority.high,
                  cache: FastImage.cacheControl.immutable,
                }}
                style={styles.cardImage}
                resizeMode={FastImage.resizeMode.cover}
                onLoad={handleLoad}
              />
            </Animated.View>
          </SharedElement>

          {/* Creator overlay show only after image loaded */}
          {isImageLoaded && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.videoOverlay}
              onPress={e => {
                e.stopPropagation();
                navigation.navigate('Creator', { id: movie?.uploader?.id });
              }}
            >
              <FastImage
                source={{
                  uri:
                    movie?.uploader?.profiles?.[0]?.avatarUrl ||
                    'https://via.placeholder.com/50',
                }}
                style={styles.avatar}
              />
              <Text style={styles.name}>
                {capitalizeWords(movie?.uploader?.name)}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
  },
);


const Explore: React.FC<ExploreProps> = ({
  heading,
  movieData,
  isLoading,
  onCardPress,
}) => {
  const navigation = useNavigation<Navigation>();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>{heading ? heading : 'New On Canvas'}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 10 }}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={`skeleton-${index}`} style={styles.card} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        <Text style={styles.header}>
          {heading.charAt(0).toUpperCase() + heading.slice(1).toLowerCase()}
        </Text>
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 10 }}
      >
        {(movieData || []).map(movie => (
          <ExploreCard
            key={movie.id}
            movie={movie}
            navigation={navigation}
            onCardPress={onCardPress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default Explore;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
  },
  card: {
    width: 130,
    height: 195,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,106,0,0.25)',
    backgroundColor: 'rgba(0, 0, 0, 0.36) ',
  },
  cardImage: {
    width: '100%',
    height: '100%',
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
    color: '#fff',
  },
  skeletonCard: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    borderRadius: 12,
  },

  shimmerContainer: {
    width: 150,
    height: '100%',
  },

  shimmerGradient: {
    flex: 1,
  },

});
