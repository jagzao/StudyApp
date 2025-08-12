const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Ensure that we resolve TypeScript files in correct order
config.resolver.sourceExts.push('cjs', 'ts', 'tsx');

// Configure asset extensions for additional file types
config.resolver.assetExts.push(
  'db',
  'sqlite',
  'wav',
  'mp3',
  'ttf',
  'otf',
  'woff',
  'woff2'
);

// Enable require context for better module resolution
config.transformer.unstable_allowRequireContext = true;

// Enable hermes for better performance
config.transformer.hermesParser = true;

// Support for absolute imports via alias
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@screens': path.resolve(__dirname, 'src/screens'),
  '@services': path.resolve(__dirname, 'src/services'),
  '@types': path.resolve(__dirname, 'src/types'),
  '@utils': path.resolve(__dirname, 'src/utils'),
  '@stores': path.resolve(__dirname, 'src/stores'),
  '@hooks': path.resolve(__dirname, 'src/hooks'),
  '@constants': path.resolve(__dirname, 'src/constants'),
};

// Optimize for different environments
if (process.env.NODE_ENV === 'development') {
  config.transformer.minifierConfig = {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  };
}

if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    keep_fnames: false,
    mangle: {
      keep_fnames: false,
    },
  };
}

module.exports = config;