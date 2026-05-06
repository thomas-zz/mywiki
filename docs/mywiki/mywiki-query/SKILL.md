---
name: mywiki-query
description: "查询 myWiki 知识库——搜索节点、综合回答并引用来源，有价值的洞见可回写为新节点。"
---

# myWiki 查询

用户提出一个问题。你用 wiki 积累的知识来回答，带引用。

## Step 0 — 定位 wiki

找到包含 `nodes/`、`raw/`、`meta/` 的 `content/` 目录。

## Step 1 — 搜索

1. 读 `content/meta/index.md`，识别候选节点
2. 扫描 `content/nodes/` 文件名，关键词匹配
3. 读取最相关的节点（通常 3~10 个）

## Step 2 — 综合回答

将多个节点的信息编织成答案。使用 `[[node-id]]` 作为内联引用。

回答应该展示 wiki 的价值——呈现用户可能没看到的节点间联系。跨域连接尤其有价值。

## Step 3 — 提议回写

如果你的回答包含真正新的洞见（不只是已有节点的复述），主动提议：

> "这个综合连接了 [X] 和 [Y]，现有节点中没有捕获这个理解。要不要存为新节点？"

用户同意后，按 mywiki-ingest 流程创建节点。

## Step 4 — 记录日志

追加到 `content/meta/log.md`：
```markdown
## [YYYY-MM-DD] query | <问题摘要>
- 查阅: node-a, node-b, node-c
- 新建节点: <id 或 "无">
```

## 规则

- ✅ 总是用 `[[node-id]]` 引用具体节点
- ✅ 主动呈现跨域连接
- ✅ 只有真正新的洞见才提议回写，复述不需要
- ❌ 不捏造 wiki 中没有的信息——如实说"wiki 中尚未覆盖这个话题"
