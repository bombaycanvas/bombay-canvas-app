import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ImagePicker, { Options } from 'react-native-image-crop-picker';
import Toast from 'react-native-toast-message';
import BottomSheet from '../BottomSheet';
import type { LocalImage } from '../../api/profile';

const AVATAR_SIZE = 800;
const SHEET_DISMISS_MS = 400;
const PRIMARY_COLOR = '#FF6A00';
const SHEET_COLOR = '#1C1C1E';
const PICKER_OPTIONS: Options = {
  mediaType: 'photo',
  cropping: true,
  cropperCircleOverlay: true,
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  compressImageQuality: 0.8,
  forceJpg: true,
  // Crop screen: dark toolbar to match the app, primary-colored actions.
  cropperToolbarTitle: 'Crop photo',
  cropperToolbarColor: SHEET_COLOR,
  cropperStatusBarLight: false,
  cropperToolbarWidgetColor: PRIMARY_COLOR,
  cropperActiveWidgetColor: PRIMARY_COLOR,
  cropperChooseColor: PRIMARY_COLOR,
  cropperCancelColor: PRIMARY_COLOR,
};

interface PhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  onPicked: (image: LocalImage) => void;
  /** Omit to hide "Remove photo" (nothing custom to remove). */
  onRemove?: () => void;
}

const PhotoSheet = ({
  visible,
  onClose,
  onPicked,
  onRemove,
}: PhotoSheetProps) => {
  const pick = async (source: 'camera' | 'library') => {
    onClose();
    // iOS refuses to present the picker while the sheet is still dismissing.
    await new Promise<void>(resolve =>
      setTimeout(resolve, Platform.OS === 'ios' ? SHEET_DISMISS_MS : 0),
    );
    try {
      const image =
        source === 'camera'
          ? await ImagePicker.openCamera(PICKER_OPTIONS)
          : await ImagePicker.openPicker(PICKER_OPTIONS);
      onPicked({ path: image.path, mime: image.mime || 'image/jpeg' });
    } catch (error: any) {
      if (error?.code === 'E_PICKER_CANCELLED') return;
      Toast.show({
        type: 'error',
        text1:
          source === 'camera'
            ? 'Could not open camera'
            : 'Could not open photos',
        text2: error?.message || 'Please allow access and try again.',
      });
    }
  };

  const options = [
    {
      icon: 'camera-outline',
      label: 'Take photo',
      onPress: () => pick('camera'),
    },
    {
      icon: 'image-outline',
      label: 'Choose from library',
      onPress: () => pick('library'),
    },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Profile photo</Text>
      <View style={styles.options}>
        {options.map(option => (
          <TouchableOpacity
            key={option.label}
            activeOpacity={0.8}
            style={styles.option}
            onPress={option.onPress}
          >
            <Ionicons name={option.icon} size={22} color="#fff" />
            <Text style={styles.optionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
        {onRemove && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.option}
            onPress={() => {
              onClose();
              onRemove();
            }}
          >
            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
            <Text style={[styles.optionText, styles.removeText]}>
              Remove photo
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </BottomSheet>
  );
};

export default PhotoSheet;

const styles = StyleSheet.create({
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'HelveticaNowDisplay-Bold',
    marginBottom: 16,
  },
  options: {
    gap: 10,
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  removeText: {
    color: '#FF6B6B',
  },
});
