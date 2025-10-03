import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';

export async function signInWithGoogle(): Promise<string> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const result = await GoogleSignin.signIn();

    if (result.type !== 'success' || !result.data?.idToken) {
      throw new Error('No Google idToken received');
    }

    const { idToken } = result.data;

    const authInstance = getAuth();
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Modular style
    const userCredential = await signInWithCredential(
      authInstance,
      googleCredential,
    );

    return await userCredential.user.getIdToken();
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}
