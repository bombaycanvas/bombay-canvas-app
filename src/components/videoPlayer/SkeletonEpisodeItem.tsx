import { View, StyleSheet } from 'react-native';

export const SkeletonEpisodeItem = () => {
  return (
    <View style={styles.row}>
      <View style={styles.thumbnail} />
      <View style={styles.textContainer}>
        <View style={styles.line1} />
        <View style={styles.line2} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
  },
  thumbnail: {
    width: 120,
    height: 70,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  textContainer: {
    flex: 1,
    paddingLeft: 12,
  },
  line1: {
    height: 16,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  line2: {
    height: 14,
    backgroundColor: '#333',
    borderRadius: 4,
    width: '40%',
  },
});
