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

export type MainTabsParamList = {
  Home: undefined;
  Creator: { id: string };
  Video: { id: string };
  Login: undefined;
  SignUp: undefined;
};

const Stack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#888',
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
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Login') {
            iconName = focused ? 'log-in' : 'log-in-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Login"
        children={props => <LoginScreen {...props} fromSignup={false} />}
        options={{ tabBarLabel: 'Login' }}
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
        name="Signup"
        component={LoginScreen}
        options={{ headerShown: false }}
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
