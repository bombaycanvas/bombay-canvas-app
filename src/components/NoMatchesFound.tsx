import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clapperboard, SearchX } from 'lucide-react-native';

interface NoMatchesFoundProps {
  onOpenFilters: () => void;
}

const NoMatchesFound: React.FC<NoMatchesFoundProps> = ({ onOpenFilters }) => (
  <View style={styles.centeredLoading}>
    <View style={styles.iconContainer}>
      <Clapperboard color="#FF6A00" size={70} />
      <View style={styles.badgeContainer}>
        <SearchX color="#FF6A00" size={20} />
      </View>
    </View>
    <Text style={styles.loadingText}>No matches found</Text>
    <Text style={styles.subText}>Try different filters</Text>
    <TouchableOpacity onPress={onOpenFilters} style={styles.filterButton}>
      <Text style={styles.filterButtonText}>Change Filters</Text>
    </TouchableOpacity>
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
  subText: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
  },
  filterButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(255,106,0,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.3)',
  },
  filterButtonText: {
    color: '#FF6A00',
    fontWeight: '700',
  },
});

export default NoMatchesFound;
