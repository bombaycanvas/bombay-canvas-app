import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

export async function googleLogin() {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const { data } = await GoogleSignin.signIn();

    const googleCredential = auth.GoogleAuthProvider.credential(data.idToken);
    const userCredential = await auth().signInWithCredential(googleCredential);

    const firebaseToken = await userCredential.user.getIdToken();

    return firebaseToken;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}
