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
    configure: (webpackConfig) => {
      webpackConfig.output = {
        ...webpackConfig.output,
        filename: 'static/js/[name].[contenthash].js',
        chunkFilename: 'static/js/[name].[contenthash].chunk.js',
      };

      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        splitChunks: {
          chunks: 'all',
          maxSize: 244000,
        },
      };

      // Добавляем настройку для sass-loader чтобы убрать предупреждения
      const scssRule = webpackConfig.module.rules
        .find(rule => rule.oneOf)
        .oneOf.find(rule => 
          rule.test && 
          rule.test.toString().includes('scss')
        );

      if (scssRule) {
        const sassLoader = scssRule.use.find(loader => 
          loader.loader && loader.loader.includes('sass-loader')
        );

        if (sassLoader) {
          sassLoader.options = {
            ...sassLoader.options,
            api: 'modern', // Используем современное API Sass
            warnRuleAsWarning: true // Преобразует deprecation warnings в обычные warnings
          };
        }
      }

      return webpackConfig;
    },
  },
};