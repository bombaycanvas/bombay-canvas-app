module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // babel-preset-expo rewrites process.env.EXPO_PUBLIC_* into an import of
  // expo/virtual/env (ESM), so expo packages must be transpiled too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(-[a-z-]+)?)/)',
  ],
};
