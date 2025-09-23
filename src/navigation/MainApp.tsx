import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppNavigator from '../routes/routes';

const MainAppContent = () => {
  return (
    <SafeAreaView edges={[]} style={{ flex: 1 }}>
      <StatusBar backgroundColor={'#202020'} />
      <AppNavigator />
    </SafeAreaView>
  );
};

const MainApp = () => {
  return <MainAppContent />;
};

export default MainApp;
