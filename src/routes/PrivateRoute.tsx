import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import HomeScreen from '../screens/HomeScreen';
import { Platform, View } from 'react-native';
import HomeIcon from '../components/assets/HomeIcon';
import VideoScreen from '../screens/VideoScreen';
import CreatorScreen from '../screens/CreatorScreen';
import LoginScreen from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();

function PrivateRoute() {
  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <Tab.Navigator
        screenOptions={() => ({
          animation: 'shift',
          tabBarStyle: {
            backgroundColor: '#FFF',
            height: 80,
            paddingBottom: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            display: Platform.OS === 'ios' ? 'none' : 'flex',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            fontFamily: 'Montserrat-Regular',
            textTransform: 'capitalize',
            lineHeight: 15,
          },
          tabBarLabelPosition: 'below-icon',
          tabBarActiveTintColor: '#191919',
          tabBarInactiveTintColor: '#898989',
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <HomeIcon name="home" color={'black'} size={15} />
            ),
          }}
        />
        <Tab.Screen
          name="Video"
          component={VideoScreen}
          options={{
            tabBarLabel: 'Video',
            tabBarIcon: ({ color, size }) => (
              <HomeIcon name="home" color={'black'} size={15} />
            ),
          }}
        />

        <Tab.Screen
          name="Creator"
          component={CreatorScreen}
          options={{
            tabBarLabel: 'Creator',
            tabBarIcon: ({ color, size }) => (
              <HomeIcon name="home" color={'black'} size={15} />
            ),
          }}
        />
        <Tab.Screen
          name="Auth"
          component={LoginScreen}
          options={{
            tabBarLabel: 'Auth',
            tabBarIcon: ({ color, size }) => (
              <HomeIcon name="home" color={'black'} size={15} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

export default PrivateRoute;
