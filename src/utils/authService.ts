import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export async function googleLogin() {
  // Ensure device has Google Play Services
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Sign in with Google
  const { idToken } = await GoogleSignin.signIn();

  // Build Firebase credential
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);

  // Sign in to Firebase
  return auth().signInWithCredential(googleCredential);
}
