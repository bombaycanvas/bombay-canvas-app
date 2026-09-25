import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { ChevronRight } from 'lucide-react-native';
import { PostHogMaskView } from '../../utils/analytics';

const DEFAULT_AVATAR =
  'https://storage.googleapis.com/bombay_canvas_buckett/uploads/1758545484110-aaa.png';

/** Top row of Settings: opens the Profile screen. */
const SettingsProfileRow = ({
  user,
  onPress,
}: {
  user: any;
  onPress: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.9} style={styles.row} onPress={onPress}>
    <FastImage
      source={{ uri: user?.profiles?.[0]?.avatarUrl || DEFAULT_AVATAR }}
      style={styles.avatar}
      resizeMode={FastImage.resizeMode.cover}
    />
    <PostHogMaskView style={styles.text}>
      <Text style={styles.name} numberOfLines={1}>
        {user?.name}
      </Text>
      <Text style={styles.contact} numberOfLines={1}>
        {user?.email || user?.phone}
      </Text>
    </PostHogMaskView>
    {!user?.emailVerified && <Text style={styles.badge}>Verify email</Text>}
    <ChevronRight size={18} color="#888" />
  </TouchableOpacity>
);

export default SettingsProfileRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  contact: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  badge: {
    color: '#ff6a00',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
});
