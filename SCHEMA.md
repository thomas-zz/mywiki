# myWiki 节点 Schema（v0.1 demo）

每个节点 = 一个 markdown 文件 = 一个"理解的最小单元"。
长度从 3 行到 3 屏不等，由 LLM 在演化过程中拆分/合并。

## 文件命名

- 文件名为 kebab-case 的 id（英文），便于稳定引用
- frontmatter 的 `title` 是真正展示的中文标题
- 路径无强分类目录（无 entities/concepts/decisions 之分），所有节点平铺在 `nodes/`
- 跨领域、跨 wiki 的隔离靠 `domains` 标签和 `wiki` 字段，不靠目录

## frontmatter 字段

```yaml
---
id: tcp-head-of-line-blocking
title: TCP 队头阻塞的成因链
wiki: 前端学习                   # 物理 wiki，私密 wiki 网站层可隐藏
meta_type: insight                 # 五种通用元类型，见下
domains: ["#技术/网络", "#思考"]   # 自由领域标签，可多打
status: mature                   # seed | growing | mature | needs-split | archived
created: 2026-01-19
updated: 2026-04-29

# 来源：节点的素材出处。路径指向 raw/。
sources:
  - title: "TCP 协议精讲"
    path: "raw/2026-01-19-tcp.md"
    date: 2026-01-19

# 语义关系：双向自动对齐（构建时反向边自动生成）
relations:
  - { to: quic-protocol, type: contrasts, note: "QUIC 用 stream 多路复用解决了它" }
  - { to: tcp-three-way-handshake, type: prerequisite }
  - { to: http2-multiplexing, type: extends }

# 自进化痕迹（可选）
derived_from: []                 # 我是从哪个节点拆出来的
splits_into: []                  # 我被拆成了哪些节点（被拆后我自己变索引/归档）

# 涌现指标（构建时自动填，正文中只读不写）
metrics:
  in_degree: 7
  out_degree: 3
---

正文 markdown。可以包含 [[other-node-id]] 形式的 wikilink，
构建时会被解析为 type: related 的关系（如果 frontmatter 没显式写）。
```

## 五种元类型（meta_type）

跨领域通用。技术、生活、工作、思考都适用。

| 元类型 | 含义 | 例子（多领域） |
|---|---|---|
| `observation` | 观察/事实——看到了什么 | "孩子 2 岁突然抗拒分享" / "React 19 新增 Activity API" |
| `model` | 心智模型/直觉/因果——我怎么理解 | "物权意识的发展阶段" / "Fiber 为什么用链表" |
| `decision` | 判断/选择——基于理解我选了什么 | "我们家不强迫分享" / "项目用 pnpm 不用 yarn" |
| `question` | 开放问题——还没想清楚 | "我到底想要什么样的工作节奏" / "RSC 跟 islands 真的本质不同吗" |
| `comparison` | 对照/辨析——X 跟 Y 的关系本身值得单列 | "通勤 vs 远程的隐性成本" / "TCP vs QUIC" |

## 关系类型（relations[].type）

| 类型 | 含义 |
|---|---|
| `implements` | 我是 X 的具体实现/落地 |
| `contradicts` | 我反驳/与 X 矛盾 |
| `contrasts` | 我跟 X 是有意义的对照 |
| `extends` | 我在 X 之上扩展 |
| `instance-of` | 我是 X 的一个实例 |
| `prerequisite` | 理解我之前先理解 X |
| `evolves-from` | 我是 X 思考的演化版（弱于 derived_from） |
| `related` | 弱关联，wikilink 默认归此类 |

构建时双向反向边自动生成：`A implements B` ⇒ B 页面会显示 "implemented-by: A"。

## 自进化协议

节点生命周期：`seed → growing → mature → (过载) → needs-split → splits_into[...]`

LLM 周期 lint 时识别"过载"信号（长度、入链多样性、子主题密度），提议拆分。
拆分必须经用户确认。拆出后：
- 原节点保留，状态置 `archived` 或转为索引型，正文记录拆分理由
- 新节点 frontmatter 写 `derived_from: [原节点]`
- 所有指向原节点的 relations 由 LLM 重路由（人工抽检）

网站会有"最近被拆分/合并"视图，让演化可见。

## 网站三类视图

1. **节点详情页**：正文 + sources + 双向语义关联（按类型分组） + 局部图（1-2 跳邻居）
2. **全局图**：所有节点 + 关系，按 meta_type 着色，按 domain 聚类
3. **涌现页**：最近变化、正在变 hub 的节点、孤岛集群、开放问题积压、跨域 hub
