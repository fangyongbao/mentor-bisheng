const os = require('os');
const path = require('path');
const childProcess = require('child_process');

function createWorkers(count) {
  const workers = [];
  while (workers.length < count) {
    const worker = childProcess.fork(path.join(__dirname, './worker.js'));
    worker.setMaxListeners(1);
    workers.push(worker);
  }
  return workers;
}

const workersCount = os.cpus().length - 1;

module.exports = (function () {
  // 根据内核数启动相应的进程 处理markdown文件
  const workers = createWorkers(workersCount);
  const tasksQueue = [];
  function arrange(task) {
    const worker = workers.pop();
    const { callback } = task;
    worker.send(task);
    worker.once('message', (result) => {
      callback(null, result);
      workers.push(worker); // mission completed
      if (tasksQueue.length > 0) {
        arrange(tasksQueue.pop());
      }
    });
  }
  return {
    queue(task) {
      if (workers.length <= 0) {
        tasksQueue.push(task);
        return;
      }
      arrange(task);
    },
    jobDone() {
      workers.forEach(w => w.kill());
    },
  };
}());

// one task
// {
//   filename: 'document/api.md',
//   content: '---\nplatform: PC\ntype: Other\ntitle: MultiClamp\nsubtitle: 多行文本裁剪\ncols: 2\n---\n\n## API\n\n| 参数        | 说明           | 类型            | 默认值       |\n|-------------|----------------|--------------------|--------------|\n| ellipsis | 超出最大行数裁剪后的省略符号 | String 或 React.Element | \'...\' |\n| clamp | 裁剪最大行数。设置为字符串\'auto\'时会根据最大高度自适应裁剪，此时文本容器需要定义高度 | Number 或 \'auto\' | 3 |\n| reverse | 是否反向裁剪 | Boolean | false |\n| splitByWords | 对于英文，是否按单词逐个裁剪（默认按字母） | Boolean | false |\n| disableCssClamp | 是否禁用原生css裁剪（当ellipsis被设置为\'...\'时，组件会优先使用webkit的原生css裁剪） | Boolean | false |\n',
//   plugins: [
//     ['/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/_mentor-bisheng@0.24.10@mentor-bisheng/lib/bisheng-plugin-highlight/lib/node.js',
//       {}
//     ],
//     ['/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/bisheng-plugin-description/lib/node.js',
//       {}
//     ],
//     ['/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/bisheng-plugin-toc/lib/node.js', [Object]],
//     ['/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/bisheng-plugin-react/lib/node.js', [Object]],
//     ['/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/bisheng-plugin-antd/lib/node.js',
//       {}
//     ]
//   ],
//   transformers: [{
//     test: '/\\.md$/',
//     use: '/Users/yongbao.fyb/Desktop/mentor/mentor-template-pc-old/node_modules/_mentor-bisheng@0.24.10@mentor-bisheng/lib/transformers/markdown'
//   }]
// }
