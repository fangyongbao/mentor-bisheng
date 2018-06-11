const path = require('path');
const loaderUtils = require('loader-utils');
const getThemeConfig = require('../utils/get-theme-config');
const resolvePlugins = require('../utils/resolve-plugins');
const context = require('../context');
const boss = require('./common/boss');

module.exports = function sourceLoader(content) {

  if (this.cacheable) {
    this.cacheable();
  }
  const webpackRemainingChain = loaderUtils.getRemainingRequest(this).split('!');
  const fullPath = webpackRemainingChain[webpackRemainingChain.length - 1];
  const filename = path.relative(process.cwd(), fullPath);
  // console.log(`fullPath: ${fullPath}`); // /Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/document/demo/basic.md
  // console.log(`filename: ${filename}`); // document/demo/basic.md

  const bishengConfig = context.bishengConfig;
  const themeConfig = getThemeConfig(bishengConfig.theme);

  // 获取在bisheng.config.js中配置的plugins的lib/node下的文件
  const plugins = resolvePlugins(themeConfig.plugins, 'node');

  const callback = this.async();

  const tast = {
    filename,
    content,
    plugins,
    transformers: bishengConfig.transformers,
    isBuild: context.isBuild,
    callback(err, result) {
      callback(err, `module.exports = ${result};`);
    },
  };
  // 添加队列
  boss.queue(tast);
};
