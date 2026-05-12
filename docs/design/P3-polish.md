# P3 — 打磨：数据源体验优化

## 目标

提升多数据源管理的可用性：让用户一眼看到每个数据源的状态，加载过程有视觉反馈。

## 设计思路

### 数据源状态指示

**问题**：数据源列表只显示名称和时间，不知道包含多少节点。

**方案**：
- `SourceMeta` 增加 `nodeCount` 字段，在保存/刷新时记录节点数量
- 数据源列表每项显示"同步时间 · N 个节点"
- 避免在 `getAll` 时读取完整 WikiData（只读 meta 字段）

### 骨架屏加载

**问题**：切换数据源或首次加载时，页面显示空白。

**方案**：
- 新建 `Skeleton.tsx`：提供 `Skeleton`、`CardSkeleton`、`SectionSkeleton`、`PageSkeleton` 组件
- HomeView 在 `nodes.length === 0 && refreshing` 时展示骨架屏
- 使用 `animate-pulse` + CSS 变量颜色，自动适配深色模式

### 数据源模态框暗色适配

将 DataSourcePicker 模态框的 `bg-white` 和按钮 hover 颜色替换为 CSS 变量。

## 改动文件

| 文件 | 变更 |
|------|------|
| `site/src/lib/WikiDataContext.tsx` | SourceMeta 增加 nodeCount，保存/刷新时写入 |
| `site/src/components/DataSourcePicker.tsx` | 显示节点数，暗色模式适配 |
| `site/src/components/Skeleton.tsx` (新建) | 骨架屏组件库 |
| `site/src/components/views/HomeView.tsx` | 加载态骨架屏 |
