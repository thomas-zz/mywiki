---
id: agent-engine-react-loop
title: "Agent 引擎的 ReAct 循环本质"
wiki: "AI编码助手"
meta_type: model
domains: ["#工作/AI编码助手", "#技术/AI"]
status: mature
created: 2026-04-27
updated: 2026-04-27

sources: []

relations:
  - to: subagent-thread-isolation
    type: extends
  - to: tool-error-tolerance
    type: related

derived_from: []
splits_into: []
---

LLM → 选工具 → 执行 → 把结果写回上下文 → 再 LLM。本质是把"思考"和"行动"在 token 流里交错。难点不是这个循环本身，而是上下文怎么不爆炸、错误怎么不滚雪球。
