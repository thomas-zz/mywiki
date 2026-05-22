#!/usr/bin/env node

import { program } from 'commander'
import { init } from '../lib/init.mjs'
import { panel } from '../lib/panel.mjs'
import { update } from '../lib/update.mjs'

program
  .name('mywiki')
  .description('个人知识 wiki — AI 驱动的结构化理解网络')
  .version('0.1.0')

program
  .command('init')
  .description('初始化 wiki 环境：创建目录 + 安装 skill')
  .option('--path <dir>', 'wiki 数据存储路径', '')
  .option('--with-samples', '复制示例节点到 nodes/')
  .action((opts) => init(opts.path, { withSamples: opts.withSamples }))

program
  .command('panel')
  .description('启动可视化面板')
  .option('--port <port>', '端口号', '9888')
  .action((opts) => panel(parseInt(opts.port)))

program
  .command('update')
  .description('更新 skill 到最新版本')
  .action(() => update())

program.parse()
