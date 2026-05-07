---
name: mywiki-lint
description: "对 myWiki 知识库做健康检查——发现断链、孤岛、索引缺失、过载候选、状态异常和关系语义问题，并提出改进建议。"
---

# myWiki 健康检查

对 wiki 做一次全面体检，输出可操作的改进建议，而不是泛泛而谈。

## Step 0 — 定位 wiki

找到包含 `nodes/`、`raw/`、`meta/` 的 `myWiki/` 目录。

## Step 1 — 全量扫描

读取 `myWiki/nodes/` 下所有文件，解析 frontmatter 和正文，在内存中构建完整图：节点、正向边、正文 wikilink、反向边、索引覆盖、来源可追溯性。

## Step 2 — 执行检查

### Schema 校验
- `id` 与文件名一致（不含 `.md`）
- `meta_type` 在五种之一
- `meta_type = insight` 时 `insight_origin` 应存在于允许值之一
- `status` 在五种之一
- `domains` 是非空数组
- `created` / `updated` 是合法日期

### 来源校验
- `sources[].path` 指向的 raw 文件存在
- `sources` 至少能让后续读者回到原始材料
- 如果节点没有 source，要确认它是不是用户口述或纯演化节点
- insight / decision / comparison 是否建立在可追溯的 observation 或 source 上，而不是无支撑断言

### 洞察来源
- `meta_type: insight` 的节点是否标注 `insight_origin`
- `insight_origin` 是否只使用 `explicit` / `inferred` / `mixed`
- `explicit` 洞察是否忠实素材原意，未把原文弱判断夸大成强结论
- `inferred` 洞察是否有 observation、source 或 prerequisite 关系支撑
- `mixed` 洞察是否其实应该拆成 explicit / inferred 两个节点

### 索引校验
- `myWiki/meta/index.md` 是否覆盖所有非 archived 节点
- 索引条目是否足以让人快速定位节点主题
- 索引是否遗漏了明显的核心节点或总览节点

### 断链
- `relations[].to` 指向不存在的节点 id
- 正文中 `[[wikilink]]` 引用不存在的节点 id

### 孤岛
- 入链为 0 且出链为 0 的节点
- 这些节点与图断开，通常需要补关系或合并

### 关系语义
- `prerequisite / extends / implements / instance-of / evolves-from` 的方向是否符合约定
- 是否手写了不必要的双向边
- `contrasts`、`related` 这类关系是否已经被构建层自动生成 back edge，避免重复计数
- 同一对节点是否存在语义重复的显式关系，例如 A `related` B，同时 B `related` A

### 状态校验
- `seed` 是否只是占位或初步想法
- `growing` 是否仍缺自足性、稳定性、机制完整性或证据
- `mature` 是否真的可以脱离 raw 独立阅读
- 首次摄入但标成 `mature` 的节点要特别复查

### 过载候选
如果一个节点同时表现出以下信号，就提议拆分：
- 正文明显过长，且读完后能分出多个子主题
- 入链较多
- 来自多个不同领域或主题簇

这里不强制固定字数阈值。长度只是信号，真正标准是“单个节点是否已经混入多个可独立理解的主题”。

### 粒度问题
- 正文中有 3 个以上并列的独立论点、机制、方法或权衡，且各自可被独立引用 → 建议拆分
- 节点标题或正文结构呈现 “A + B + C” 式拼盘，但这些主题关系不同 → 建议拆分
- 一个节点同时承担总览、机制解释、实践实现、趋势判断等多种职责 → 建议拆分或保留总览并外链子节点
- 节点正文很短、只有定义/单个事实/孤立例子，且没有独立关系价值 → 建议合并、降为 `seed`，或只保留在 raw
- 多个节点反复描述同一主题，只是来源批次不同 → 建议合并或建立清晰的 `extends` / `evolves-from` 演化关系

### 事实支撑
- insight / decision / comparison 中出现关键概念，但没有对应 observation、source 说明或 `prerequisite` 关系 → 建议补事实节点
- 多个节点共同依赖同一概念，而该概念只散落在正文或 raw 中 → 建议新建 observation 节点
- 最近 ingest 的跳过清单把“被素材解释并参与推理”的概念标为 left in raw → 建议补录为 `observation`
- observation 节点只剩词典定义、没有 wiki 内用途或来源语境 → 建议合并或降为 seed

### 陈旧
- `updated` 距今较久，且状态不是 `mature`
- 可能需要复查或归档

### 潜在矛盾
- 两个节点内容互相冲突，但没有声明 `contradicts`
- 新素材与旧节点明显冲突，但没有触发更新

### 涌现建议
- 多个节点都引用了同一个尚不存在的概念 → 建议新建节点
- 两个节点语义相近但未链接 → 建议建关系
- observation 节点被多处引用且已有因果理解 → 建议升级为 insight
- 两个 seed/growing 节点覆盖高度相似主题 → 建议合并
- 标为 `insight` 但内容其实是单一情境决策 → 建议改为 `decision`

### 日志一致性
- 最近的 ingest log 是否包含素材数量、新建/更新/跳过统计
- log 中提到的 node id 是否真实存在，且不是简称或别名
- 高显著但未建节点的主题是否说明了 absorbed / raw / deferred 去向

## Step 3 — 输出报告

格式：

```markdown
## Lint 报告 — YYYY-MM-DD

**扫描节点数：** N
**Schema 错误：** N

### 索引缺失 (N)
- `node-a` 未出现在 index.md

### 来源问题 (N)
- `node-b` 的 source 文件不存在
- `node-c` 没有 source 说明

### 断链 (N)
- `node-a` → `不存在的id`（在 relations 中）
- `node-b` → `[[缺失引用]]`（在正文中）

### 孤岛节点 (N)
- `node-x` — 建议通过 [关系类型] 连接到 `node-y`

### 关系语义问题 (N)
- `node-a -> prerequisite -> node-b` 方向可疑

### 状态问题 (N)
- `node-w` — 标为 mature，但仍依赖 raw 才能理解

### 洞察来源问题 (N)
- `node-i` — insight 缺少 `insight_origin`
- `node-j` — 标为 inferred，但没有 observation 或 prerequisite 支撑
- `node-k` — 标为 explicit，但正文加入了原文没有的推断，建议拆出 inferred 节点

### 过载候选 (N)
- `node-z` — 主题过多，建议拆成 A / B / C

### 粒度问题 (N)
- `node-m` — 3 个独立机制被压在一个节点中，建议拆成 A / B / C
- `node-n` — 只有定义和一个例子，建议合并到 `node-p` 或降为 seed

### 事实支撑缺失 (N)
- `node-i` — 依赖概念 X，但没有 observation 节点或 prerequisite 关系；建议补 `concept-x`
- `node-j` / `node-k` 都使用概念 Y，Y 目前只在 raw 中；建议新建 observation 节点

### 陈旧节点 (N)
- `node-w` — 上次更新 YYYY-MM-DD，状态：growing

### 日志一致性 (N)
- log 中出现 `short-id`，但不存在对应节点；应使用完整 id `real-node-id`

### 涌现建议
- `node-a` 和 `node-b` 都提到概念 X
  → 建议新建节点 `concept-x`
- `node-p` 和 `node-q` 似乎相关但未链接
  → 建议添加 [关系类型] 关系
```

## Step 4 — 记录日志

追加到 `myWiki/meta/log.md`：

```markdown
## [YYYY-MM-DD] lint | 发现 N 项问题
```

## 规则

- 不自动修复过载节点，只提议拆分。
- 不删除节点或日志条目。
- 建议要具体，指出节点和关系类型。
- 优先呈现可操作的发现，不堆砌噪声。
- 如果发现大量状态偏乐观，优先建议降级而不是默认接受。
