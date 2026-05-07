---
id: pnpm-symlink-strategy
title: "pnpm 的 symlink + 内容寻址"
wiki: "前端学习"
meta_type: decision
domains: ["#技术/工程"]
status: mature
created: 2026-04-09
updated: 2026-04-09

sources:
  - title: "包管理深潜"
    path: "raw/2026-04-09-package-managers-deep-dive.md"

relations:
  - to: phantom-dependency
    type: contradicts
    note: "用结构强制阻断"

derived_from: []
splits_into: []
---

pnpm 把所有包存到全局 store（按内容哈希去重），项目 node_modules 里只放 symlink。每个项目只能 require 自己声明的依赖——结构层面消灭幽灵依赖。
