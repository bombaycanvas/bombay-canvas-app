import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import { TransitionPresets } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VideoScreen from '../screens/VideoScreen';
import CreatorScreen from '../screens/CreatorScreen';
import SeriesDetailScreen from '../screens/SeriesDetailScreen';
import CategoryMoviesScreen from '../screens/CategoryMoviesScreen';
import StartLoginScreen from '../screens/StartLoginScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import { LockedOverlay } from '../components/videoPlayer/LockedOverlay';
import { PurchaseModal } from '../components/videoPlayer/PurchaseModal';

export type MainTabsParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  StartLogin: undefined;
  CompleteProfile: undefined;
  Signup: undefined;
  SeriesDetail: {
    id: string | number;
    cardLayout?: any;
    posterUrl?: string;
  };
  Video: {
    id: string;
    episodeId?: string;
    cardLayout?: any;
    posterUrl?: string;
  };
  Creator: { id: string | number };
  Settings: undefined;
  CategoryMovies: { category: string };
};

const Tab = createBottomTabNavigator<MainTabsParamList>();
const Stack = createSharedElementStackNavigator<RootStackParamList>();

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const { isKeyboardVisible } = useKeyboardHandler();
  const { token } = useAuthStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopWidth: 0,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
          display: Platform.OS !== 'ios' && isKeyboardVisible ? 'none' : 'flex',
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName: string = 'home-outline';

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
      <Tab.Screen
        name="Profile"
        component={token ? ProfileScreen : StartLoginScreen}
      />
    </Tab.Navigator>
  );
};

const AppStack = () => {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={token ? 'MainTabs' : 'StartLogin'}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="StartLogin" component={StartLoginScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />

      <Stack.Screen
        name="Signup"
        component={LoginScreen}
        initialParams={{ fromSignup: true }}
      />
      <Stack.Screen
        name="SeriesDetail"
        component={SeriesDetailScreen}
        options={{
          ...(Platform.OS === 'android'
            ? {
              ...TransitionPresets.SlideFromRightIOS,
            }
            : {
              presentation: 'transparentModal',
              cardStyle: { backgroundColor: 'transparent' },
              gestureDirection: 'vertical',
              gestureEnabled: false,
            }),
        }}
      />

      <Stack.Screen
        name="Video"
        component={VideoScreen}
        options={{
          headerShown: false,
          ...(Platform.OS === 'android'
            ? {
              ...TransitionPresets.SlideFromRightIOS,
            }
            : {
              presentation: 'fullScreenModal',
              cardStyle: { backgroundColor: 'transparent' },
              gestureDirection: 'vertical',
            }),
        }}
      />

      <Stack.Screen
        name="Creator"
        component={CreatorScreen}
        options={{
          ...(Platform.OS === 'android'
            ? {
              ...TransitionPresets.SlideFromRightIOS,
            }
            : {
              presentation: 'transparentModal',
              cardStyle: { backgroundColor: 'transparent' },
              gestureDirection: 'vertical',
              gestureEnabled: false,
            }),
        }}
      />

      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#202020' },
          headerTintColor: '#fff',
        }}
      />

      <Stack.Screen
        name="CategoryMovies"
        component={CategoryMoviesScreen}
        options={({ route }: any) => {
          const rawCategory = route?.params?.category ?? '';
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
    initializeAuth();
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
