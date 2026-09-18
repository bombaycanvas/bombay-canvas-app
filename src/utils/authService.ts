import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';

export async function signInWithApple(): Promise<string | null> {
  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    if (!response.identityToken) {
      throw new Error('No Apple identity token received');
    }
    console.log('Apple Sign-In success');
    return response.identityToken;
  } catch (error: any) {
    if (error?.code === appleAuth.Error.CANCELED) {
      console.log('Apple Sign-In cancelled by user');
      return null;
    }
    console.log('Apple Login Error:', error);
    throw error;
  }
}

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const result = await GoogleSignin.signIn();

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
    const isSignedIn = GoogleSignin.hasPreviousSignIn();
    if (isSignedIn) {
      try {
        await GoogleSignin.revokeAccess();
      } catch (error) {
        console.log('Google revokeAccess error:', error);
      }
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        console.log('Google signOut error:', error);
      }
    }
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
