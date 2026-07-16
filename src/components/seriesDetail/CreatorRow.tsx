import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { imgUrl } from '../../api/video';
import { capitalizeWords } from '../../utils/capitalizeWords';

interface CreatorRowProps {
  uploader: any;
  onPress: () => void;
  style?: any;
}

export const CreatorRow: React.FC<CreatorRowProps> = ({ uploader, onPress, style }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.creatorRow, style]}
      onPress={onPress}
    >
      <FastImage
        source={{
          uri:
            imgUrl(uploader?.profiles?.[0]?.avatarUrl, 100) ||
            'https://via.placeholder.com/40',
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable,
        }}
        style={styles.avatar}
        resizeMode={FastImage.resizeMode.cover}
      />
      <Text
        style={styles.creatorName}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {capitalizeWords(uploader?.name || 'Unknown')}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: 'rgba(255,106,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.4)',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  creatorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
