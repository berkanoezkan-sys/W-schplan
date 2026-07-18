const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const shimPath = path.resolve(__dirname, 'shims/expo-font-server.js');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'expo-font/build/server' &&
    context.originModulePath.includes(`${path.sep}expo-router${path.sep}`)
  ) {
    return { filePath: shimPath, type: 'sourceFile' };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
