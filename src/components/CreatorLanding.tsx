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
              <LinearGradient
                colors={['rgba(14,14,14,0.71)', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradient2}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => Linking.openURL(profile.instUrl!)}
                >
                  <InstagramIcon width={16} height={16} />
                  <Text style={styles.buttonText}>Instagram</Text>
                </TouchableOpacity>
              </LinearGradient>
            )}
            {profile?.youtubeUrl && (
              <LinearGradient
                colors={['rgba(14,14,14,0.71)', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradient2}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => Linking.openURL(profile.youtubeUrl!)}
                >
                  <YoutubeIcon width={16} height={16} />
                  <Text style={styles.buttonText}>YouTube</Text>
                </TouchableOpacity>
              </LinearGradient>
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

    color: '#fff',
    // textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
  },
  para: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.6,
    maxWidth: 500,
    // textAlign: 'center',
    // alignSelf: 'center',
    marginBottom: 20,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  ctaWrapper: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  gradient2: {
    borderRadius: 15,
    width: 150,
    paddingVertical: 6,
    paddingHorizontal: 2,

    shadowColor: '#fffafa6f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,

    elevation: 8,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 32,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
  },
});
