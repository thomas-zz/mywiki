# P2 — 知识体验：图谱探索 + 涌现可操作 + 时间线演化

## 目标

让"理解的网络"不只是可视化，而是可交互、可行动、有叙事的知识体验。

## 设计思路

### 节点图谱渐进探索

**问题**：局部图谱只展示 1-hop 邻居，点击直接跳转，无法沿图谱漫游。

**方案**：WikiGraph 新增 `interactive` prop。启用时：
- 默认展示 1-hop 邻居
- 右上角"展开更多"按钮切换到 3-hop BFS（完整局部图谱）
- 点击非中心节点仍然导航到该节点详情页（保持简洁，避免复杂的多级展开状态管理）
- NodeDetailView 传入 `interactive` 启用此模式

**为什么不做单击展开**：Cytoscape 的增量 `cy.add()` + 重新布局在小图上体验不佳（节点跳动），且状态管理复杂。1-hop / 3-hop 切换更简洁可靠。

### 涌现视图可操作性

**问题**：涌现页只展示数据，不提供行动建议。

**方案**：三个板块增加上下文信息：
- **候选拆分**：解析节点正文的 h2/h3 标题，作为"可拆分为"建议展示
- **孤岛节点**：基于标题关键词和领域标签，查找可能相关的已连接节点
- **开放问题**：查找同领域或标题有关键词重叠的 insight 节点，作为"相关洞见"展示

匹配算法使用简单的关键词+领域评分，无需外部依赖。

### 时间线演化叙事

**问题**：时间线只按日期罗列节点，缺乏生命周期感和演化线索。

**方案**：
- 每个节点条目右侧增加 StatusBadge（种子/成长/成熟等状态一目了然）
- 有 `derived_from` 或 `splits_into` 的节点，在条目下方展示演化连线（"↑ 演化自 X"、"↓ 拆分为 Y"），可点击跳转
- 顶部增加状态筛选器（圆形 chip 按钮），可多选过滤特定状态的节点

## 改动文件

| 文件 | 变更 |
|------|------|
| `site/src/components/WikiGraph.tsx` | 新增 interactive + expanded 状态，1-hop/3-hop 切换 |
| `site/src/components/views/NodeDetailView.tsx` | 传入 interactive prop |
| `site/src/components/views/EmergenceView.tsx` | 重写：问题关联洞见、拆分建议、孤儿关联候选 |
| `site/src/components/views/TimelineView.tsx` | 重写：状态筛选器、StatusBadge、演化连线 |
