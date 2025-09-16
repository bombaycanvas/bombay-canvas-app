import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

import HomeScreen from '../screens/HomeScreen';
import VideoScreen from '../screens/VideoScreen';
import CreatorScreen from '../screens/CreatorScreen';
import LoginScreen from '../screens/LoginScreen';

export type MainTabsParamList = {
  Home: undefined;
  Creator: { id: string };
  Video: { id: string };
  Login: undefined;
  SignUp: undefined;
};

const Stack = createNativeStackNavigator();

const AppStack = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Videos"
        component={VideoScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Creator"
        component={CreatorScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        options={{ headerShown: false, gestureEnabled: true }}
      >
        {props => <LoginScreen {...props} fromSignup={false} />}
      </Stack.Screen>
      <Stack.Screen
        name="SignUp"
        options={{ headerShown: false, gestureEnabled: true }}
      >
        {props => <LoginScreen {...props} fromSignup={true} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default function AppNavigator() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    const initialize = async () => {
      await initializeAuth();
    };
    initialize();
  }, [initializeAuth]);

  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}
