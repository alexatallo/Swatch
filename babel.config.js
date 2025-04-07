module.exports = {
  presets: ['babel-preset-expo'], // Use Expo's preset
  plugins: [
    'module:react-native-dotenv', // For .env variable usage
    [
      '@babel/plugin-transform-class-properties',
      { loose: true },
    ],
    [
      '@babel/plugin-transform-private-methods',
      { loose: true },
    ],
    [
      '@babel/plugin-transform-private-property-in-object',
      { loose: true },
    ],
  ],
};