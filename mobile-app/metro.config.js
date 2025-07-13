const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Basic configuration without problematic options
config.watchFolders = [__dirname];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Increase timeout for slow connections
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Increase timeout for all requests
      res.setTimeout(300000); // 5 minutes
      return middleware(req, res, next);
    };
  },
};

// Optimize transformer for stability
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Reduce worker count for stability
config.maxWorkers = 2;

module.exports = withNativeWind(config, { input: './global.css' });
