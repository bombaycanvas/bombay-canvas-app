import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  getAuth,
  getIdToken,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
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

    const userCredential = await signInWithCredential(
      authInstance,
      googleCredential,
    );

    return await getIdToken(userCredential.user);
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}

export async function logoutGoogle() {
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
    const authInstance = getAuth();
    await signOut(authInstance);
  } catch (error) {
    console.error('Google logout error:', error);
  }
}

export async function logoutApple() {
  try {
    const authInstance = getAuth();
    await signOut(authInstance);
  } catch (error) {
    console.error('Apple logout error:', error);
  }
}
