import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const HomeScreen = () => {
  return (
    <View>
      <Text>India’s first</Text>
    </View>
  );
};

export default HomeScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bold: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
  },
  regular: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  light: {
    fontFamily: 'HelveticaNowDisplay-Light',
    fontWeight: 300,
  },
  medium: {
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
  },
  extraBold: {
    fontFamily: 'HelveticaNowDisplay-ExtraBold',
    fontWeight: 800,
  },
});
