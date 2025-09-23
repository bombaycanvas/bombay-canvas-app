import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useGetCoverVideo } from '../api/video';
import LinearGradient from 'react-native-linear-gradient';
import PlayButtonIcon from './assets/PlayButtonIcon';

const { height } = Dimensions.get('window');

interface LandingProps {
  movieData?: any;
  isLoading?: boolean;
}

const Landing: React.FC<LandingProps> = () => {
  const videoRef = useRef(null);
  const navigation = useNavigation();
  const [isPlaying, setIsPlaying] = useState(true);
  const { data } = useGetCoverVideo();

  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      return () => {
        setIsPlaying(false);
      };
    }, []),
  );

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  return (
    <View style={styles.layout}>
      <Video
        ref={videoRef}
        source={{ uri: data?.CoverUrlVideo?.url }}
        style={styles.backgroundVideo}
        resizeMode="cover"
        repeat
        paused={!isPlaying}
      />
      <LinearGradient
        colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
        style={styles.gradient}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
      />

      <View style={styles.content}>
        <Image
          source={require('../images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.mainTitle}>
          India’s first{'\n'}
          <Text style={styles.mainTitleBold}>vertical OTT platform</Text>
        </Text>

        <Text style={styles.para}>
          From microdramas to series in travel, food, fashion, culture and much
          more — discover it all in vertical
        </Text>

        <View style={styles.ctaWrapper}>
          <TouchableOpacity
            style={styles.infoCta}
            onPress={() =>
              navigation.navigate('Creator', { id: data?.admin?.id })
            }
          >
            <Image
              source={{
                uri:
                  data?.admin?.profiles[0]?.avatarUrl ?? '/static/avatar.jpg',
              }}
              style={styles.avatar}
            />
            <Text style={styles.name}>{data?.admin?.profiles[0]?.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
            <PlayButtonIcon />{' '}
            <Text style={styles.playText}>{isPlaying ? 'Pause' : 'Play'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Landing;

const styles = StyleSheet.create({
  layout: {
    position: 'relative',
    width: '100%',
    height: height * 0.58,
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    // zIndex: 2,
  },
  content: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'column',
    gap: 0,
  },
  logo: {
    width: 52,
    height: 20,
  },
  mainTitle: {
    fontFamily: 'HelveticaNowDisplay-Light',
    fontWeight: 300,
    fontSize: 30,
    color: '#fff',
  },
  mainTitleBold: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
    fontSize: 30,
  },
  para: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
    fontSize: 12,
    color: '#fff',
    maxWidth: '90%',
  },
  ctaWrapper: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  playButton: {
    minWidth: 100,
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ff6a00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    color: 'white',
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
    fontSize: 12,
  },
  infoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1.4,
    borderColor: 'rgba(1,1,1,0.2)',

    shadowColor: 'rgba(61,61,61,0.12)',
    shadowOffset: { width: -1, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8.6,
    elevation: 5,
  },
  avatar: {
    width: 14,
    height: 14,
    borderRadius: 12,
    marginRight: 6,
  },
  name: {
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
    fontSize: 12,
  },
  gradient2: {
    borderRadius: 15,
    width: 110,
    paddingVertical: 6,
    paddingHorizontal: 2,

    shadowColor: '#fffafa6f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
