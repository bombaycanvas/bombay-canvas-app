import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import UserVideos from '../components/UserVideos';
import { useMoviesDataByCreator } from '../api/video';
import { useUserData } from '../api/auth';
import FastImage from '@d11/react-native-fast-image';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { data: userProfile } = useUserData(useAuthStore.getState().token);
  const { data: userData, isLoading } = useMoviesDataByCreator(
    userProfile?.userData?.id,
  );
  const isCreator =
    userProfile?.userData?.role === 'CREATOR' ||
    userProfile?.userData?.role === 'ADMIN';

  return (
    <ScrollView style={styles.container}>
      {userProfile?.userData && (
        <View style={styles.loggedInContainer}>
          <ImageBackground
            source={{
              uri:
                userData?.creator?.profiles[0]?.posterUrl ??
                'https://storage.googleapis.com/bombay_canvas_buckett/uploads/1757661776404-Card Image.png',
            }}
            style={styles.coverPhoto}
          >
            <View style={styles.overlay} />
            <FastImage
              source={{
                uri:
                  userData?.creator?.profiles[0]?.avatarUrl ||
                  'https://via.placeholder.com/150',
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.avatar}
              resizeMode={FastImage.resizeMode.cover}
            />
          </ImageBackground>

          <View style={styles.profileInfo}>
            <Text style={styles.username}>
              {userProfile?.userData.name || 'N/A'}
            </Text>
            <Text style={styles.email}>
              {userProfile?.userData.email || 'N/A'}
            </Text>

            {isCreator && (
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {userData?.allMovies?.length}
                  </Text>
                  <Text style={styles.statLabel}>Videos</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Settings' as never)}
            >
              <Text style={styles.buttonText}>Settings</Text>
            </TouchableOpacity>
          </View>

          {isCreator && (
            <UserVideos data={userData?.allMovies} isLoading={isLoading} />
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loggedInContainer: {
    flex: 1,
  },
  coverPhoto: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInfo: {
    padding: 20,
    alignItems: 'center',
  },
  username: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 24,
    color: '#fff',
    marginBottom: 5,
  },
  email: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 18,
    color: '#fff',
  },
  statLabel: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  button: {
    backgroundColor: '#ef8a4c',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 16,
  },
});

export default ProfileScreen;
