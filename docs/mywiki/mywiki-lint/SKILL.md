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
- `status` 在五种之一
- `domains` 是非空数组
- `created` / `updated` 是合法日期

### 来源校验
- `sources[].path` 指向的 raw 文件存在
- `sources` 至少能让后续读者回到原始材料
- 如果节点没有 source，要确认它是不是用户口述或纯演化节点

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

### 过载候选 (N)
- `node-z` — 主题过多，建议拆成 A / B / C

### 陈旧节点 (N)
- `node-w` — 上次更新 YYYY-MM-DD，状态：growing

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
