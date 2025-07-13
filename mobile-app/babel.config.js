module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for NativeWind
      'nativewind/babel',
      // Required for Expo Router
      require.resolve('expo-router/babel'),
      // Required for Reanimated (must be last)
      'react-native-reanimated/plugin',
    ],
  };
};