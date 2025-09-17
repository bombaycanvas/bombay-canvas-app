import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Linking,
  ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import YoutubeIcon from '../assets/YoutubeIcon';
import InstagramIcon from '../assets/InstagramIcon';

const { height } = Dimensions.get('window');

interface CreatorLandingProps {
  data: {
    creator?: {
      name?: string;
      profiles?: {
        name: string;
        description: string;
        posterUrl: string;
        instUrl?: string;
        youtubeUrl?: string;
      }[];
    };
  };
}

const CreatorLanding: React.FC<CreatorLandingProps> = ({ data }) => {
  const profile = data?.creator?.profiles?.[0];
  const bgImage = profile?.posterUrl;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: bgImage }}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
          style={styles.gradient}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
        />

        <View style={styles.content}>
          <Text style={styles.mainTitle}>
            {profile?.name || data?.creator?.name}
          </Text>
          <Text style={styles.para}>{profile?.description}</Text>

          <View style={styles.ctaWrapper}>
            {profile?.instUrl && (
              <TouchableOpacity
                style={styles.button}
                onPress={() => Linking.openURL(profile.instUrl!)}
              >
                <InstagramIcon width={16} height={16} />
                <Text style={styles.buttonText}>Instagram</Text>
              </TouchableOpacity>
            )}
            {profile?.youtubeUrl && (
              <TouchableOpacity
                style={styles.button}
                onPress={() => Linking.openURL(profile.youtubeUrl!)}
              >
                <YoutubeIcon width={16} height={16} />
                <Text style={styles.buttonText}>YouTube</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default CreatorLanding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: height * 0.5,
  },
  background: {
    width: '100%',
    height: height * 0.5,
    justifyContent: 'flex-end',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    bottom: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 5,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    // textAlign: 'center',
    marginBottom: 12,
  },
  para: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.6,
    maxWidth: 500,
    // textAlign: 'center',
    // alignSelf: 'center',
    marginBottom: 20,
  },
  ctaWrapper: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingLeft: 0,
    // marginHorizontal: 4,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
});
