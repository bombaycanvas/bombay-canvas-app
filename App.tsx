import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './src/config/queryClient';
import MainApp from './src/navigation/MainApp';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from './src/config/firebaseConfig';
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from '@env';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function App() {
  const appsLength = getApps().length;

  useEffect(() => {
    if (!appsLength) {
      initializeApp(firebaseConfig);
    }
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,

      iosClientId: IOS_CLIENT_ID,

      offlineAccess: true,
    });
  }, [appsLength]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <MainApp />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
