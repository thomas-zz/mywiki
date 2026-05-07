---
id: ai-coder-tradeoff-pnpm
title: "AI Coder 项目为什么选 pnpm"
wiki: "AI编码助手"
meta_type: decision
domains: ["#工作/AI编码助手", "#技术/工程"]
status: mature
created: 2026-04-23
updated: 2026-04-23

sources: []

relations:
  - to: pnpm-symlink-strategy
    type: implements
  - to: phantom-dependency
    type: related

derived_from: []
splits_into: []
---

项目里有多个 NestJS 模块互相依赖，幽灵依赖会让排查问题极痛苦。pnpm 的严格性虽然偶尔让初学者迷惑，但长期 ROI 远高于一次次 debug 隐性依赖。
