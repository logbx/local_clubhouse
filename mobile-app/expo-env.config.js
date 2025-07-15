const { getDefaultConfig } = require('expo/metro-config');

module.exports = {
  ...getDefaultConfig(__dirname),
  resolver: {
    ...getDefaultConfig(__dirname).resolver,
    alias: {
      '@': './app',
    },
  },
  env: {
    EXPO_ROUTER_APP_ROOT: './app',
  },
};