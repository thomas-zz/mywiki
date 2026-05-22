# myWiki

> 个人知识 wiki — AI 驱动的结构化理解网络

myWiki 不是笔记工具。它存储的是**结构化的理解**：每个节点是一个可独立引用的认知单元（事实、洞见、主张、疑问、辨析），节点之间通过语义关系互联，形成可演化的知识网络。

## Quick Start

```bash
# 初始化 wiki + 安装 AI skill
npx mywiki init

# （可选）启动可视化面板
npx mywiki panel
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
                          └──→ npx mywiki panel 可视化查看
```

**CLI 不做 AI 工作**。AI 逻辑由你自己的 agent 通过已安装的 skill 执行。CLI 只负责环境搭建和面板。

## 命令

| 命令 | 作用 |
|------|------|
| `npx mywiki init [--path <dir>] [--with-samples]` | 创建 wiki 目录 + 安装 skill |
| `npx mywiki panel [--port 9888]` | 启动可视化面板 |
| `npx mywiki update` | 更新 skill 到最新版本 |

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

## 与 OpenClaw / Shortcuts 集成

myWiki 天然支持自动化：在手机上分享一个链接，本地自动完成摄入。

```
手机分享链接 → OpenClaw/Shortcuts
    → 触发: claude "请摄入这篇文章: <url>"
        → agent 按 skill 规则自动处理
```

只需确保 `npx mywiki init` 已完成（skill 已安装），之后直接触发 claude session 即可。

## License

MIT
