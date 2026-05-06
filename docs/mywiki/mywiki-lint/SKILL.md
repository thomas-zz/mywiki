---
name: mywiki-lint
description: "对 myWiki 知识库做健康检查——发现断链、孤岛、过载节点、陈旧内容，并提出改进建议。"
---

# myWiki 健康检查

对 wiki 做一次全面体检。发现结构问题，提出改进建议，识别需要拆分的节点。

## Step 0 — 定位 wiki

找到包含 `nodes/`、`raw/`、`meta/` 的 `content/` 目录。

## Step 1 — 全量扫描

读取 `content/nodes/` 下所有文件。解析每个节点的 frontmatter 和正文。在内存中构建完整图：所有节点、所有正向边（来自 `relations`）、所有隐式边（来自正文中的 `[[wikilink]]`）。

## Step 2 — 执行检查

### Schema 校验
- `id` 与文件名一致（不含 `.md`）
- `meta_type` 在五种之一：`observation`, `model`, `decision`, `question`, `comparison`
- `status` 在五种之一：`seed`, `growing`, `mature`, `needs-split`, `archived`
- `domains` 是非空数组
- `created` / `updated` 是合法日期

### 断链
- `relations[].to` 指向不存在的节点 id
- 正文中 `[[wikilink]]` 引用不存在的节点 id

### 孤岛
- 入链为 0 且出链为 0 的节点
- 这些节点与图断开——建议建立关系

### 缺失的交叉引用
- 正文中提到了某个概念，且该概念已有自己的节点，但未通过 `[[id]]` 或 `relations` 链接

### 过载候选
一个节点过载的信号——以下条件**全部满足**时：
- 正文 > 500 字
- 入链 ≥ 3
- 入链来自 ≥ 2 个不同的 domain

对过载节点提出具体的拆分方案。

### 陈旧
- `updated` 距今 > 6 个月，且 `status` 不是 `mature`
- 可能需要复查或归档

### 潜在矛盾
- 两个节点内容互相冲突，但没有声明 `contradicts` 关系
- 标记让用户复查

### 涌现建议
- 多个节点都引用了同一个尚不存在的概念 → 建议新建节点
- 两个节点语义相近但未链接 → 建议建关系
- observation 节点被多处引用且已有因果理解 → 建议升级为 model

## Step 3 — 输出报告

格式：

```markdown
## Lint 报告 — YYYY-MM-DD

**扫描节点数：** N
**Schema 错误：** N（逐条列出）

### 断链 (N)
- `node-a` → `不存在的id`（在 relations 中）
- `node-b` → `[[缺失引用]]`（在正文中）

### 孤岛节点 (N)
- `node-x` — 建议通过 [关系类型] 连接到 `node-y`

### 过载候选 (N)
- `node-z` — 正文 NNN 字，M 条入链来自 K 个 domain
  建议拆分："子主题 A" + "子主题 B" + "子主题 C"
  ⏳ 等待你确认后执行

### 陈旧节点 (N)
- `node-w` — 上次更新 YYYY-MM-DD，状态：growing

### 涌现建议
- 发现 `node-a` 和 `node-b` 都提到"概念 X"
  → 建议新建专属节点 `concept-x`
- `node-p` 和 `node-q` 似乎相关但未链接
  → 建议添加 [关系类型] 关系
```

## Step 4 — 记录日志

追加到 `content/meta/log.md`：
```markdown
## [YYYY-MM-DD] lint | 发现 N 项问题
```

## 规则

- ❌ 不自动修复过载节点——只提议拆分，等用户确认
- ❌ 不删除节点或日志条目
- ✅ 建议要具体——指名道姓说哪些节点、什么关系类型
- ✅ 优先呈现可操作的发现，不堆砌噪声
