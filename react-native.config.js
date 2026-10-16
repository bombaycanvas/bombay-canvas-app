module.exports = {
  assets: ['./assets/fonts'],
  dependencies: {
    // Only a transitive peer of react-native-reanimated-carousel, which the app
    // does not import. RN CLI never linked it; Expo autolinking links transitive
    // deps, so opt out to keep the native module set unchanged.
    'react-native-reanimated': {
      platforms: { android: null, ios: null },
    },
  },
};
