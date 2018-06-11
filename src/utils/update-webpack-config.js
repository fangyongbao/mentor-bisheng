const path = require('path');
const webpack = require('atool-build/lib/webpack');
const context = require('../context');

const bishengLib = path.join(__dirname, '..');
const bishengLibLoaders = path.join(bishengLib, 'loaders');
const tmpDirPath = path.join(__dirname, '..', 'tmp');

module.exports = function updateWebpackConfig(webpackConfig) {
  const bishengConfig = context.bishengConfig;
  webpackConfig.entry = {};
  if (context.isBuild) {
    //如果isBuild为true，那么更新webpack.output.path为配置文件的output属性
    //否则还是使用webpack.out.path默认的值
    webpackConfig.output.path = bishengConfig.output;
  }

  // dev 静态资源放到更目录下    build 静态资源放到bishengConfig.root下
  webpackConfig.output.publicPath = context.isBuild ? bishengConfig.root : '/';

  // 自定义 bisheng-data-loader 解析 uitls/data.js。 entry.index.js中引入了 util/data.js
  webpackConfig.module.loaders.push({
    test(filename) {
      return filename === path.join(bishengLib, 'utils', 'data.js') ||
        filename === path.join(bishengLib, 'utils', 'ssr-data.js');
    },
    loader: path.join(bishengLibLoaders, 'bisheng-data-loader'),
  });

  const customizedWebpackConfig = bishengConfig.webpackConfig(webpackConfig, webpack);
  const entryPath = path.join(tmpDirPath, `entry.${bishengConfig.entryName}.js`);
  if (customizedWebpackConfig.entry[bishengConfig.entryName]) {
    throw new Error(`Should not set \`webpackConfig.entry.${bishengConfig.entryName}\`!`);
  }
  customizedWebpackConfig.entry[bishengConfig.entryName] = entryPath;

  // 返回webpack config 给dora-plugin-webpack处理
  return customizedWebpackConfig;
};
