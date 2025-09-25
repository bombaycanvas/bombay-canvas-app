import FastImage from '@d11/react-native-fast-image';
import { Dimensions } from 'react-native';

export const BackgroundWrapper = ({
  source,
  children,
}: {
  source: any;
  children: any;
}) => {
  const { height } = Dimensions.get('window');
  return (
    <FastImage
      style={{
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
        height: height * 0.5,
      }}
      source={{ uri: source, priority: FastImage.priority.high }}
      resizeMode={FastImage.resizeMode.cover}
    >
      {children}
    </FastImage>
  );
};
