import { GoogleSignin } from '@react-native-google-signin/google-signin';

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const result = await GoogleSignin.signIn();
    console.log('result', result);

    if (result.type !== 'success' || !result.data?.idToken) {
      throw new Error('No Google idToken received');
    }
    const { idToken } = result.data;

    return idToken;
  } catch (error) {
    console.log('Google Login Error:', error);
    throw error;
  }
}

export async function logoutGoogle() {
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch (error) {
    console.log('Google logout error:', error);
  }
}

export async function logoutApple() {
  try {
    console.log('App logout successfully');
  } catch (error) {
    console.error('Apple logout error:', error);
  }
}
