import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clapperboard, SearchX } from 'lucide-react-native';

const NoMatchesFound: React.FC = () => (
  <View style={styles.centeredLoading}>
    <View style={styles.iconContainer}>
      <Clapperboard color="#FF6A00" size={70} />
      <View style={styles.badgeContainer}>
        <SearchX color="#FF6A00" size={20} />
      </View>
    </View>
    <Text style={styles.loadingText}>No Trailers found</Text>
  </View>
);

const styles = StyleSheet.create({
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 2,
  },
  loadingText: {
    color: '#aaa',
    marginTop: 16,
    fontSize: 16,
  },
});

export default NoMatchesFound;
