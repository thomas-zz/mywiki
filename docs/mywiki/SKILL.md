---
name: mywiki
description: "维护通用知识 wiki——摄入素材、查询节点、健康检查、结构重构。适用于不同领域的个人、研究或团队知识库。"
---

# myWiki

你正在维护一个知识 wiki。它可以用于个人思考、研究、学习、项目、团队知识或其他领域；skill 不假设任何特定主题。

这个 wiki 存储的是**理解**（而非原始笔记），以带语义关系的 markdown 节点组成互联网络。raw sources 是事实来源，nodes 是 LLM 维护的结构化理解层，meta/index.md 和 meta/log.md 是导航与演化记录。

若外部理念文档与本 skill 或本仓库 schema 冲突，以本地 schema 和本 skill 为准。

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

wiki 数据路径查找顺序：
1. `~/.mywiki/config.json` 中 `wikiDir` 字段指定的路径
2. 默认 `~/mywiki`
3. 当前工作目录下的 `myWiki/`（仅作为开发 fallback）

都找不到时询问用户路径。

wiki 包含 `nodes/`、`raw/`、`meta/` 三个子目录。

## 速查

**五种元类型**：`observation`（事实）、`insight`（洞见）、`decision`（主张）、`question`（疑问）、`comparison`（辨析）

**洞察来源**：`explicit`（素材/用户显式写出）、`inferred`（wiki 推断）、`mixed`（两者混合）

**八种关系类型**：`implements`（实现）、`contradicts`（反驳）、`contrasts`（对照）、`extends`（扩展）、`instance-of`（实例）、`prerequisite`（前置）、`evolves-from`（演化自）、`related`（相关）

**五种状态**：`seed` → `growing` → `mature` → `needs-split` → `archived`

## 维护原则

- **事实支撑**：被素材解释、补充、对比或用于推理的概念/事实可以成为 `observation` 节点。wiki 不只存洞见，也要存能支撑洞见的事实层。
- **洞察来源**：`insight` 节点要区分 `explicit` / `inferred` / `mixed`；`explicit` 尊重原意，`inferred` 负责 wiki 自进化。
- **软数量**：字数和节点数只是质量信号，不是目标。不要为了凑数量拆节点，也不要为了凑字数扩写。
- **粒度校准**：节点要能被独立引用、独立建立关系、承载一个清晰认知单元。批量素材宁可多建有价值的 `growing` 节点，也不要过度压缩。
- **硬语义**：关系类型和方向必须严格遵守 schema；反向边由构建层生成，不需要为同一语义双向手写。
- **保守状态**：状态由 LLM 自动判断；拿不准时用 `growing`，不要把首次提炼的节点轻易标成 `mature`。
- **最小改动**：默认只修改本次素材直接相关的节点、index 和 log。大面积重写、拆分、合并必须走 refactor 并获得用户确认。
- **批量确认**：超过 5 份素材或预计改动较大时，先给候选节点清单和跳过清单，确认后再写；用户明确要求直接执行时除外。
- **变更预算**：预计新建超过 10 个节点、更新超过 5 个旧节点、重排索引结构或影响多个主题簇时，先停下汇报计划，等用户确认。
- **可追溯**：新增或更新节点必须能追到 raw source 或明确标注来自用户口述；每次操作都追加 log。
