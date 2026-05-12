# P1 — 核心体验：搜索升级 + 图谱可读性 + 深色模式

## 目标

提升日常使用中最高频的三个交互体验：搜索、图谱浏览、视觉舒适度。

## 设计思路

### 搜索升级

**问题**：原搜索仅做子字符串匹配，无排序、无筛选，结果质量低。

**方案**：自建评分搜索（未使用 FlexSearch，因其 v0.8 API 复杂且中文分词支持不佳）。评分规则：
- 标题完全匹配 → 100 分
- 标题前缀匹配 → 80 分
- 标题包含 → 60 分
- ID 包含 → 40 分
- 领域包含 → 30 分
- 正文包含 → 10 分

新增两个下拉筛选器（元类型、状态），筛选后再搜索。支持键盘上下箭头导航 + Enter 跳转 + Escape 关闭。

### 图谱可读性

**问题**：全局图谱节点多时变成"毛线团"，无法区分领域分布。

**方案**：
- 新增「按类型/按领域」着色切换，领域模式从 15 色调色盘为每个顶级域分配颜色
- 按类型着色时支持复选框过滤显隐各类型
- 全局模式 hover：高亮当前节点的 1-hop 邻域（节点+边），其余淡化至 opacity 0.1
- 图例面板改为动态内容（跟随着色模式切换）

### 深色模式

**问题**：阅读和思考场景下缺乏深色模式，夜间使用刺眼。

**方案**：
- CSS 变量层：`[data-theme="dark"]` 选择器覆盖所有 `--var` 值
- 初始化脚本：`<head>` 中的 inline script 读取 localStorage 或 `prefers-color-scheme`，在首次渲染前设置 `data-theme`，避免闪烁
- ThemeToggle 组件：侧边栏底部的切换按钮，持久化到 localStorage
- 组件适配：9 个组件中的 `bg-white`、`text-gray-900`、`text-gray-500`、`hover:bg-stone-50` 等硬编码颜色替换为 CSS 变量引用
- wiki-body 样式：链接、引用块、表格、行内代码等全部改用 CSS 变量

## 改动文件

| 文件 | 变更 |
|------|------|
| `site/src/components/SearchBox.tsx` | 重写：评分搜索 + 筛选器 + 键盘导航 |
| `site/src/components/WikiGraph.tsx` | 新增 colorBy/visibleTypes props，域着色，hover 高亮邻域 |
| `site/src/components/views/GraphView.tsx` | 着色切换按钮 + 类型过滤复选框 + 域图例 |
| `site/src/app/globals.css` | dark 主题变量 + wiki-body 样式改用变量 |
| `site/src/app/layout.tsx` | head 内 theme 初始化脚本 |
| `site/src/components/ThemeToggle.tsx` (新建) | 主题切换按钮 |
| `site/src/components/Sidebar.tsx` | 引入 ThemeToggle，bg-white → var(--surface) |
| `site/src/components/TopBar.tsx` | bg-white/80 → color-mix |
| `site/src/components/NodeCard.tsx` | 硬编码颜色 → CSS 变量 |
| `site/src/components/BackBar.tsx` | text-gray-900 → var(--text) |
| `site/src/components/HoverPopover.tsx` | bg-white → var(--surface) |
| `site/src/components/RelationPanel.tsx` | text-gray → var(--text/muted) |
| `site/src/components/views/NodeDetailView.tsx` | 标题和小标题颜色适配 |
| `site/src/components/views/EmergenceView.tsx` | 卡片背景适配 |
| `site/src/components/views/TimelineView.tsx` | 按钮和卡片颜色适配 |
| `site/src/components/views/HomeView.tsx` | 卡片背景适配 |
