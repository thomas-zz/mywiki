---
id: npm-flattening
title: "npm 扁平化策略"
wiki: "前端学习"
meta_type: decision
domains: ["#技术/工程"]
status: mature
created: 2026-04-09
updated: 2026-04-09

sources:
  - title: "包管理深潜"
    path: "raw/2026-04-09-package-managers-deep-dive.md"

relations: []

derived_from: []
splits_into: []
---

npm 3 起，安装时尽量把依赖提升到顶层 node_modules，减少嵌套和磁盘占用。代价是模块解析变得不确定，催生了 phantom dependency。
