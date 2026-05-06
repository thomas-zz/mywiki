---
id: interruptible-rendering
title: "可中断渲染（interruptible rendering）"
wiki: "前端学习"
meta_type: model
domains: ["#技术/前端"]
status: mature
created: 2026-04-15
updated: 2026-04-15

sources: []

relations:
  - to: delayed-gratification
    type: related
    note: "工程上的延迟满足——舍长期 throughput 换短期 responsiveness"

derived_from: []
splits_into: []
---

把一段长任务切成可暂停、可恢复的小步，让高优先级任务能插队。React Fiber、操作系统调度、generator/async 协程，本质都是这件事。
