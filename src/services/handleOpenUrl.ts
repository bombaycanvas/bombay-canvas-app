import { Linking, Alert } from "react-native";


const handleOpenURL = async (url: string) => {
    try {
        await Linking.openURL(url);
    } catch (error) {
        console.error('Failed to open URL:', error);
        Alert.alert('Error', 'Something went wrong while opening the link');
    }
};


export default handleOpenURL;