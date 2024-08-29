/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { CracoAliasPlugin } = require('react-app-alias');

const resolvePath = (p) => path.resolve(__dirname, p);

module.exports = {
  plugins: [
    {
      plugin: CracoAliasPlugin,
      options: {},
    },
  ],
  devServer: {
    port: 80,
  },
  webpack: {
    alias: {
      app: resolvePath('./src/app'),
      pages: resolvePath('./src/pages'),
      widgets: resolvePath('./src/widgets'),
      features: resolvePath('./src/features'),
      entities: resolvePath('./src/entities'),
      shared: resolvePath('./src/shared'),
    },
  },
};
