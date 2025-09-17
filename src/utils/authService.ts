import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export async function googleLogin() {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const { data } = await GoogleSignin.signIn();

    return data;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}
