import { useRoute } from '@react-navigation/native';
import { Text, View } from 'react-native';

const VideoScreen = () => {
  const route = useRoute();
  const { id } = route.params;

  return (
    <View>
      <Text>Video ID: {id}</Text>
    </View>
  );
};

export default VideoScreen;
