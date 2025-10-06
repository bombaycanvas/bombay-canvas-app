import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BackgroundWrapper } from './BackgroundImage';

const { height } = Dimensions.get('window');

interface CreatorLandingProps {
  data: {
    series: {
      uploader: {
        name: string;
        profiles: {
          name: string;
          description: string;
          posterUrl: string;
          instUrl?: string;
          youtubeUrl?: string;
        }[];
      };
    }[];
  };
}

const CreatorLanding: React.FC<CreatorLandingProps> = ({ data }) => {
  const profile = data?.series[0]?.uploader?.profiles[0];
  const bgImage = profile?.posterUrl;

  return (
    <View style={styles.container}>
      <BackgroundWrapper source={bgImage}>
        <LinearGradient
          colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
          style={styles.gradient}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
        />

        <View style={styles.content}>
          <Text style={styles.mainTitle}>
            {profile?.name || data?.series[0]?.uploader?.name}
          </Text>
          <Text style={styles.para}>{profile?.description}</Text>
        </View>
      </BackgroundWrapper>
    </View>
  );
};

export default CreatorLanding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: height * 0.59,
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
    paddingBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 5,
  },
  mainTitle: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 5,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
    lineHeight: 28,
  },
  para: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.6,
    maxWidth: 500,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
    lineHeight: 20,
  },
  ctaWrapper: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
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
  button: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 14,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
  },
});
