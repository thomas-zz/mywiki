---
id: phantom-dependency
title: "幽灵依赖（phantom dependency）"
wiki: "前端学习"
meta_type: insight
domains: ["#技术/工程"]
status: mature
created: 2026-03-05
updated: 2026-04-09

sources:
  - title: "幽灵依赖详解"
    path: "raw/2026-03-05-phantom-dependency.md"

relations:
  - to: npm-flattening
    type: evolves-from
    note: "扁平化的副作用"
  - to: pnpm-symlink-strategy
    type: contrasts

derived_from: []
splits_into: []
---

npm/yarn 把 node_modules 扁平化以省空间，副作用是：你能 require 一个**没在 package.json 里声明**的包——只要它恰好被某个直接依赖间接拉进来。这就是幽灵依赖。

后果不是立刻爆炸，而是**当那个间接依赖升级、换了实现，或者你的依赖树重排时，幽灵依赖突然消失**——你的代码在没人改的情况下挂掉。

这是一类典型的"省小钱（磁盘）惹大祸（隐性契约）"的设计。pnpm 用 symlink + 严格的 node_modules 结构反过来——只有声明的依赖能被找到。
