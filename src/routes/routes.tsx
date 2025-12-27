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
import SearchScreen from '../screens/SearchScreen';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { Platform } from 'react-native';
import CategoryMoviesScreen from '../screens/CategoryMoviesScreen';
import { LockedOverlay } from '../components/videoPlayer/LockedOverlay';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PurchaseModal } from '../components/videoPlayer/PurchaseModal';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import SeriesDetailScreen from '../screens/SeriesDetailScreen';
import StartLoginScreen from '../screens/StartLoginScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';

export type MainTabsParamList = {
  Home: undefined;
  Search: undefined;
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
  const insets = useSafeAreaInsets();
  const { isKeyboardVisible } = useKeyboardHandler();
  const { token } = useAuthStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
          display: Platform.OS !== 'ios' && isKeyboardVisible ? 'none' : 'flex',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName = 'home-outline';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      {token != null ? (
        <Tab.Screen name="Profile" component={ProfileScreen} />
      ) : (
        <Tab.Screen name="Profile" component={LoginScreen} />
      )}
    </Tab.Navigator>
  );
};

const AppStack = () => {
  const { token, hasSkipped } = useAuthStore();
  return (
    <Stack.Navigator
      initialRouteName={token || hasSkipped ? 'MainTabs' : 'StartLogin'}
    >
      <Stack.Screen
        name="StartLogin"
        component={StartLoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CompleteProfile"
        component={CompleteProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Signup"
        children={props => <LoginScreen {...props} fromSignup={true} />}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SeriesDetail"
        children={() => <SeriesDetailScreen />}
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
      <Stack.Screen
        name="CategoryMovies"
        component={CategoryMoviesScreen}
        options={({ route }: any) => {
          const rawCategory = route?.params?.category;
          const title =
            rawCategory.charAt(0).toUpperCase() +
            rawCategory.slice(1).toLowerCase();

          return {
            title,
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
          };
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
      <LockedOverlay />
      <PurchaseModal />
      <Toast config={{ BaseToast, ErrorToast }} topOffset={30} position="top" />
    </NavigationContainer>
  );
}
