import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const VideoScreen = () => {
  return (
    <View>
      <Text style={styles.title}>Home</Text>
    </View>
  );
};

export default VideoScreen;

const styles = StyleSheet.create({
  title: {
    color: 'red',
  },
});
