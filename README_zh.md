# myWiki

[English](./README.md)

> 个人知识 wiki — AI 驱动的结构化理解网络

myWiki 不是笔记工具。它存储的是**结构化的理解**：每个节点是一个可独立引用的认知单元（事实、洞见、主张、疑问、辨析），节点之间通过语义关系互联，形成可演化的知识网络。

## 前置条件

- Node.js >= 20

## Quick Start

```bash
# 全局安装（推荐，只下载一次）
npm install -g mywiki-cli
mywiki init
mywiki panel

# 或使用 npx 直接运行（无需安装）
npx mywiki-cli init
npx mywiki-cli panel
```

初始化完成后，在 Claude Code 中直接对话即可：

```
> 帮我摄入这篇文章: https://example.com/article
> 我的 wiki 里有什么关于分布式系统的内容？
> 跑一遍 lint
```

## 工作原理

```
你 ──对话──→ AI Agent (Claude Code 等)
                 │
                 ├── 加载 mywiki skill（已安装到 ~/.claude/skills/）
                 ├── 按规则提炼素材为知识节点
                 └── 写入 ~/mywiki/nodes/
                          │
                          └──→ mywiki panel 可视化查看
```

**CLI 不做 AI 工作**。AI 逻辑由你自己的 agent 通过已安装的 skill 执行。CLI 只负责环境搭建和面板。

## 命令

| 命令 | 作用 |
|------|------|
| `mywiki init [--path <dir>] [--with-samples]` | 创建 wiki 目录 + 安装 skill |
| `mywiki panel [--port 9888]` | 启动可视化面板 |
| `mywiki update` | 更新 skill 到最新版本 |

> 以上命令也可通过 `npx mywiki-cli <command>` 方式运行。

## 目录结构

```
~/mywiki/                 ← 你的知识数据（可配置路径）
├── nodes/                ← wiki 节点（markdown + frontmatter）
├── raw/                  ← 原始素材
└── meta/
    ├── index.md          ← 内容索引
    └── log.md            ← 操作日志
```

## 节点示例

```markdown
---
id: delayed-gratification
title: 延迟满足并不是"忍"
meta_type: insight
insight_origin: explicit
domains: ["#生活/育儿", "#自我管理"]
status: growing
created: 2025-03-12
updated: 2025-04-30
relations:
  - { to: marshmallow-experiment, type: extends }
---

延迟满足容易被误解为"克制欲望"。真正起作用的是对"延迟后会发生什么"的清晰预期...
```

## 可视化面板

面板提供：
- 首页概览（节点统计、涌现枢纽）
- 时间线（按更新/创建排序）
- 全局图谱（Cytoscape 力导向图）
- 涌现/自进化视图
- 全文搜索

### 本地使用

```bash
npx mywiki-cli panel
```

默认免登录，直接读取本地 wiki 目录。

## 在线部署（Vercel 等）

将本仓库部署到 Vercel 后，通过面板内的「数据源」按钮配置 GitHub 仓库（支持私有仓库，需在浏览器中输入 GitHub Personal Access Token）。配置保存在浏览器 localStorage 中，每次打开自动刷新数据。

建议设置环境变量 `MYWIKI_PASSWORD` 启用密码保护，避免未授权访问你的 token。

## 安全

- 密码保护通过 `MYWIKI_PASSWORD` 环境变量启用，使用 HMAC 签名 cookie 验证
- Markdown 渲染已做 XSS 清洗（rehype-sanitize + DOMPurify）
- GitHub Token 仅存储在你的浏览器 localStorage 中，不经过服务端

## 限制

- 面板为只读视图，不支持在线编辑节点（保证单一数据源）
- 本地面板默认无密码保护（适用于个人电脑）

## 开发

```bash
git clone <repo-url>
cd mywiki-cli
npm install
cd site && npm install && cd ..
npm run lint       # ESLint
npm run build      # 构建 skill + 面板
```


## License

MIT
