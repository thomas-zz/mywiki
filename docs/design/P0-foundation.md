# P0 — 基础设施：版本日志 + 多层级标签树

## 目标

为后续迭代建立两项基础能力：
1. **版本日志系统**：让用户（和自己）能追踪每次产品变更，本地查看 CHANGELOG.md，线上访问 `/changelog` 页面。
2. **多层级标签树**：将扁平的两层标签（`#技术/前端`）升级为支持 N 层的树状结构（`#技术/前端/React/Hooks`），侧边栏可折叠展示，域视图支持父子级导航，LLM skill 理解标签层级。

## 设计思路

### 版本日志

- 在项目根目录维护 `CHANGELOG.md`，采用 [Keep a Changelog](https://keepachangelog.com/) 格式。
- 创建 `/changelog` 页面（服务端组件），读取 CHANGELOG.md 并复用已有的 `unified` markdown 渲染管线。
- 侧边栏 NAV_ITEMS 增加"更新日志"入口。

**为什么不用数据库或 JSON**：CHANGELOG.md 是 Git 友好的、人类可读的、无需额外依赖的方案，且能直接在 GitHub 上查看。

### 多层级标签树

**数据层**：标签字符串本身已用 `/` 编码层级信息。改动在于 domainMap 构建时，为每个标签的所有祖先路径也建立索引。例如 `#技术/前端/React` 同时出现在 `#技术`、`#技术/前端`、`#技术/前端/React` 三个 key 下。

**UI 层**：
- 新建 `domainTree.ts`：从 domainMap 构建递归树结构 `DomainTreeNode[]`，每个节点包含 `label`（段名）、`fullPath`（完整路径）、`count`（直接节点数）、`totalCount`（递归总数）。
- 新建 `DomainTree.tsx`：递归渲染可折叠树，第一层默认展开，缩进 12px/层，点击跳转域视图。
- `DomainView` 升级：父级域（如 `#技术`）顶部显示子域 chip 导航，正文区分"直接标记的节点"和"来自子领域的节点"。

**Skill 层**：ingest skill 的"领域标签"章节更新为完整的层级文档，列出现有标签树，规定新增子层级的规则。

## 改动文件

| 文件 | 变更 |
|------|------|
| `CHANGELOG.md` (新建) | 项目版本日志，初始化 v0.1-v0.4 基线 |
| `site/src/app/(main)/changelog/page.tsx` (新建) | 更新日志页面，服务端渲染 |
| `site/src/lib/domainTree.ts` (新建) | 标签树构建函数 |
| `site/src/components/DomainTree.tsx` (新建) | 可折叠树 UI 组件 |
| `site/src/components/Sidebar.tsx` | NAV_ITEMS 增加更新日志；域列表替换为 DomainTree |
| `site/src/lib/parser.ts` | domainMap 增加祖先路径索引 |
| `site/src/lib/clientParser.ts` | 同上（客户端版本） |
| `site/src/components/views/DomainView.tsx` | 子域 chip 导航 + 直接/继承节点分区 |
| `docs/mywiki/mywiki-ingest/SKILL.md` | 标签层级文档 + 现有标签树 + 使用规则 |
