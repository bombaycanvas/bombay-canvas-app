import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './src/config/queryClient';
import MainApp from './src/navigation/MainApp';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from './src/config/firebaseConfig';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function App() {
  const appsLength = getApps().length;

  useEffect(() => {
    if (!appsLength) {
      initializeApp(firebaseConfig);
    }
    GoogleSignin.configure({
      webClientId:
        '145295638585-iiaal82avvss8vad07rlcura4sr2t9ps.apps.googleusercontent.com',
      iosClientId:
        '145295638585-dp5sicfb645783a8dggg3peee2450tf9.apps.googleusercontent.com',
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
