import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

import HomeScreen from '../screens/HomeScreen';
import VideoScreen from '../screens/VideoScreen';
import CreatorScreen from '../screens/CreatorScreen';
import LoginScreen from '../screens/LoginScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Ionicons from 'react-native-vector-icons/Ionicons';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type MainTabsParamList = {
  Home: undefined;
  Creator: { id: string };
  Video: { id: string };
  Login: undefined;
  SignUp: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { token } = useAuthStore();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#888',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName = 'home-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Profile"
        component={token ? ProfileScreen : LoginScreen}
      />
    </Tab.Navigator>
  );
};

const AppStack = () => {
  return (
    <Stack.Navigator initialRouteName="MainTabs">
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Signup"
        children={props => <LoginScreen {...props} fromSignup={true} />}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Video"
        children={() => <VideoScreen />}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Creator"
        children={() => <CreatorScreen />}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        children={props => <LoginScreen {...props} fromSignup={false} />}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#202020',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontFamily: 'HelveticaNowDisplay-Bold',
          },
        }}
      />
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
