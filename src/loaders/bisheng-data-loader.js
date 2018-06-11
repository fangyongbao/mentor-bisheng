const fs = require('fs');
const path = require('path');
const getThemeConfig = require('../utils/get-theme-config');
const sourceData = require('../utils/source-data');
const resolvePlugins = require('../utils/resolve-plugins');
const context = require('../context');
const boss = require('./common/boss');

module.exports = function bishengDataLoader( /* content */ ) {
  if (this.cacheable) {
    this.cacheable();
  }

  const bishengConfig = context.bishengConfig;
  const themeConfig = getThemeConfig(bishengConfig.theme);

  // change 
  // { 'document': '/Users/yongbao.fyb/Desktop/mentor/mentor-component/mo-org-tree/document' } to
  // { 'document': { 
  //     api: '/Users/yongbao.fyb/Desktop/mentor/mentor-component/mo-org-tree/document/api.md',
  //     demo: {
  //       basic: '/Users/yongbao.fyb/Desktop/mentor/mentor-component/mo-org-tree/document/demo/basic.md'
  //     }
  // },
  const markdown = sourceData.generate(bishengConfig.source, bishengConfig.transformers);

  // 获取bisheng plug
  const browserPlugins = resolvePlugins(themeConfig.plugins, 'browser');

  // pluginsString:
  // [require('/Users/yongbao.fyb/Desktop/mentor/mentor-cli/node_modules/_mentor-bisheng@0.24.8@mentor-bisheng/lib/bisheng-plugin-highlight/lib/browser.js'), {}],
  // [require('/Users/yongbao.fyb/Desktop/mentor/mentor-cli/node_modules/bisheng-plugin-react/lib/browser.js'), {"lang":"__react"}],
  // [require('/Users/yongbao.fyb/Desktop/mentor/mentor-cli/node_modules/bisheng-plugin-antd/lib/browser.js'), {}]
  const pluginsString = browserPlugins
    .map(plugin => `[require('${plugin[0]}'), ${JSON.stringify(plugin[1])}]`)
    .join(',\n');

  // async为webpack自定义loader api，代表异步返回loader结果
  const callback = this.async();

  const picked = {};
  const pickedPromises = []; // Flag to remind loader that job is done.
  if (themeConfig.pick) {
    const nodePlugins = resolvePlugins(themeConfig.plugins, 'node');
    sourceData.traverse(markdown, (filename) => {
      const fileContent = fs.readFileSync(path.join(process.cwd(), filename)).toString();
      pickedPromises.push(new Promise((resolve) => {
        boss.queue({
          filename,
          content: fileContent,
          plugins: nodePlugins,
          transformers: bishengConfig.transformers,
          isBuild: context.isBuild,
          callback(err, result) {
            const parsedMarkdown = eval(`(${result})`); // eslint-disable-line no-eval

            Object.keys(themeConfig.pick).forEach((key) => {
              if (!picked[key]) {
                picked[key] = [];
              }

              const picker = themeConfig.pick[key];
              const pickedData = picker(parsedMarkdown);
              if (pickedData) {
                picked[key].push(pickedData);
              }
            });

            resolve();
          },
        });
      }));
    });
  }

  Promise.all(pickedPromises).then(() => {
    const sourceDataString = sourceData.stringify(markdown, {
      lazyLoad: themeConfig.lazyLoad,
    });
    callback(
      null,
      'module.exports = {' +
      `\n  markdown: ${sourceDataString},` +
      `\n  picked: ${JSON.stringify(picked, null, 2)},` +
      `\n  plugins: [\n${pluginsString}\n],` +
      '\n};',
    );
  });
};

/*** 
module.exports = {
  markdown: {
    'document': {
      'api': require('/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/_mentor-bisheng@0.24.10@mentor-bisheng/lib/loaders/source-loader!/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/document/api.md'),
      'demo': {
        'basic': require('/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/_mentor-bisheng@0.24.10@mentor-bisheng/lib/loaders/source-loader!/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/document/demo/basic.md'),
        'custom': require('/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/_mentor-bisheng@0.24.10@mentor-bisheng/lib/loaders/source-loader!/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/document/demo/custom.md'),
      },
    },
  },
  picked: {},
  plugins: [
    [require('/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/_mentor-bisheng@0.24.10@mentor-bisheng/lib/bisheng-plugin-highlight/lib/browser.js'), {}],
    [require('/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/bisheng-plugin-react/lib/browser.js'), {
      "lang": "__react"
    }],
    [require('/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/bisheng-plugin-antd/lib/browser.js'), {}]
  ],
};
***/
