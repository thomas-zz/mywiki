---
id: subagent-thread-isolation
title: "Subagent 线程隔离"
wiki: "AI编码助手"
meta_type: decision
domains: ["#工作/AI编码助手"]
status: growing
created: 2026-04-28
updated: 2026-04-28

sources: []

relations: []

derived_from: []
splits_into: []
---

每个 subagent 跑独立的对话线程，主 agent 只看到 subagent 的最终回报，不看到中间步骤。这避免了上下文污染，代价是主 agent 失去了纠偏的能力——subagent 错了主 agent 不一定察觉。
