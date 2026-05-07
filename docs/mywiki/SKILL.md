---
name: mywiki
description: "维护个人知识 wiki——摄入素材、查询节点、健康检查、结构重构。根据用户意图路由到子 skill。"
---

# myWiki

你正在维护一个个人知识 wiki。这个 wiki 存储的是**理解**（而非原始笔记），以带语义关系的 markdown 节点组成互联网络。

## 子 skill

本 skill 包含四个操作。根据用户意图路由到对应子 skill：

| 用户意图 | 子 skill | 文件 |
|---|---|---|
| 给你素材让你处理（文章/笔记/口述/URL） | **ingest** | [mywiki-ingest/SKILL.md](./mywiki-ingest/SKILL.md) |
| 向 wiki 提问 | **query** | [mywiki-query/SKILL.md](./mywiki-query/SKILL.md) |
| 要求健康检查 / "跑一遍 lint" | **lint** | [mywiki-lint/SKILL.md](./mywiki-lint/SKILL.md) |
| 确认执行拆分/合并 / "拆一下这个节点" | **refactor** | [mywiki-refactor/SKILL.md](./mywiki-refactor/SKILL.md) |

读取对应子 skill 的 SKILL.md 并按其指令执行。

## Wiki 位置

wiki 数据在 `content/` 目录下，包含 `nodes/`、`raw/`、`meta/` 三个子目录。找不到时询问用户路径。

## 速查

**五种元类型**：`observation`（事实）、`insight`（洞见）、`decision`（主张）、`question`（疑问）、`comparison`（辨析）

**八种关系类型**：`implements`（实现）、`contradicts`（反驳）、`contrasts`（对照）、`extends`（扩展）、`instance-of`（实例）、`prerequisite`（前置）、`evolves-from`（演化自）、`related`（相关）

**五种状态**：`seed` → `growing` → `mature` → `needs-split` → `archived`

**核心原则**：节点存储的是理解，不是信息。LLM 负责维护，人负责思考。
