# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

myWiki 是个人知识 wiki 系统，以 npm CLI（`mywiki-cli`）形式分发，包含三部分：
- **CLI**（`bin/` + `lib/`）：`mywiki init/panel/update` — 环境搭建和面板启动
- **Site**（`site/`）：Next.js 16 可视化面板（React 19，Tailwind v4）
- **Skills**（`docs/mywiki/`）：Claude Code skill 定义，负责知识摄入/查询/lint/重构

CLI 不做 AI 工作。AI 逻辑由安装到用户工具中的 skill 提供。

## 架构

### 数据流
`parser.ts` 从 `WIKI_DIR` 读取 `.md` 文件 → gray-matter 解析 frontmatter → unified/remark/rehype 渲染 markdown → 提取 `[[wikilinks]]` 作为隐式关系 → 构建内存中的 `WikiData` 图（节点、边、涌现指标）。

客户端：`WikiDataContext` 通过 React Context + IndexedDB 缓存提供 WikiData，支持多数据源（本地文件系统或 GitHub API）。

### 核心类型（`site/src/lib/types.ts`）
- `MetaType`：`observation | insight | decision | question | comparison`
- 节点生命周期：`seed → growing → mature → needs-split → archived`
- `WikiData`：完整图结构，含 `nodeMap`、`edges`、`emergence`、`domainIndex`

### 路由结构
- `(auth)/login` — 可选密码登录
- `(main)/` — 所有需认证页面，共享侧边栏/导航布局
- `api/auth` — HMAC 签名 cookie 认证（通过 `MYWIKI_PASSWORD` 环境变量启用）

### Site 构建与分发
`next.config.ts` 中 `output: 'standalone'` 生成自包含服务器。`scripts/build-site.sh` 将其打包为 `site-dist/`，随 npm 包发布。CLI 的 `panel` 命令运行 `node site-dist/server.js`。

### 多工具 Skill 安装（`lib/targets.mjs`）
Skill 可安装到 Claude（`~/.claude/skills/`）、Cursor（`.mdc`）、Codex（`AGENTS.md` 区块）、Windsurf（`global_rules.md` 区块）。选择的工具列表持久化在 `~/.mywiki/config.json` 的 `targets` 字段中。

## 注意事项

- **Next.js 16**：本项目使用 Next.js 16，与训练数据可能有差异。写 Next.js 代码前先查阅 `node_modules/next/dist/docs/`。
- **XSS**：Markdown 渲染已做清洗（rehype-sanitize + DOMPurify）。任何新增的用户内容 HTML 插值必须转义。
- **路径别名**：`@` 映射到 `site/src/`（tsconfig）。

## Commit 规范

使用中文，遵循 Conventional Commits（如 `feat: ...`、`fix: ...`、`docs: ...`）。

## 文档规则

- README 维护中英双语：`README.md`（英文，默认展示）和 `README_zh.md`（中文）。修改 README 时必须同步更新两个文件。
- 如果改动影响了 npm 发布的内容（CLI、skill、site-dist、templates），且确认要发布，需在 `package.json` 中升版本号。
