# myWiki 技术设计文档

## 1. 系统架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                        用户工作流                                 │
│                                                                  │
│  Obsidian / 编辑器                                                │
│       ↓ 写笔记                                                    │
│  Claude Code (本地 LLM)                                           │
│       ↓ ingest → 写/更新 nodes/*.md                               │
│  git push → GitHub                                                │
│       ↓ webhook                                                   │
│  GitHub Action                                                    │
│       ↓ 解析 markdown → 构建静态站                                 │
│  Vercel / Cloudflare Pages                                        │
│       ↓ 部署                                                      │
│  浏览器访问 myWiki 网站                                            │
└──────────────────────────────────────────────────────────────────┘
```

**关键设计决策：写入和展示完全解耦**
- 写入侧：本地 LLM 操作 markdown → push
- 展示侧：CI 构建静态资产 → CDN 分发
- 两侧唯一的契约是 **节点 markdown schema**

## 2. 仓库目录结构

```
repo-root/
├── myWiki/                     # ⭐ 所有节点数据（LLM 维护）
│   ├── nodes/                   # 节点 markdown 文件（平铺，不分子目录）
│   │   ├── tcp-head-of-line-blocking.md
│   │   ├── delayed-gratification.md
│   │   ├── react-fiber-why-linked-list.md
│   │   └── ...
│   ├── raw/                     # 原始素材（不可变，LLM 只读）
│   │   ├── 2026-01-19-tcp.md
│   │   └── ...
│   └── meta/                    # 构建辅助文件（自动生成，不手写）
│       ├── index.md             # 节点索引（LLM 维护）
│       └── log.md               # 操作日志（LLM 追加）
│
├── site/                        # ⭐ 网站源码（Next.js / Astro）
│   ├── src/
│   │   ├── app/                 # 页面路由
│   │   │   ├── page.tsx         # 首页
│   │   │   ├── node/[id]/page.tsx  # 节点详情
│   │   │   ├── graph/page.tsx   # 全局图谱
│   │   │   ├── emergence/page.tsx  # 涌现页
│   │   │   ├── domain/[tag]/page.tsx  # 领域页
│   │   │   ├── all/page.tsx     # 全部节点
│   │   │   └── layout.tsx       # 布局（侧边栏）
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── NodeCard.tsx
│   │   │   ├── RelationPanel.tsx
│   │   │   ├── LocalGraph.tsx
│   │   │   ├── GlobalGraph.tsx
│   │   │   ├── HoverPopover.tsx
│   │   │   ├── SearchBox.tsx
│   │   │   ├── MetaTypeChip.tsx
│   │   │   └── BackBar.tsx
│   │   ├── lib/
│   │   │   ├── parser.ts        # markdown 解析 + graph 构建
│   │   │   ├── graph.ts         # 图算法（度计算、hub 检测、overload）
│   │   │   ├── search.ts        # 搜索索引构建
│   │   │   └── types.ts         # TypeScript 类型定义
│   │   └── styles/
│   │       └── globals.css
│   ├── public/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── scripts/                     # 构建/运维脚本
│   ├── build-data.ts            # 解析 myWiki/nodes/ → .next 构建数据
│   └── validate-schema.ts       # CI 中校验节点 schema 完整性
│
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Action：push → build → deploy
│
├── docs/
│   ├── PRD.md                   # 产品需求文档
│   └── TECH_DESIGN.md           # 本文档
│
├── SCHEMA.md                    # 节点 markdown schema 定义
└── CLAUDE.md                    # LLM 工作指令（ingest/query/lint 协议）
```

## 3. 节点 Markdown Schema

### 3.1 文件命名
- 文件名：kebab-case 英文 id，如 `tcp-head-of-line-blocking.md`
- 路径：`myWiki/nodes/<id>.md`
- 不按领域分子目录

### 3.2 Frontmatter 完整定义

```yaml
---
# === 必填 ===
id: tcp-head-of-line-blocking          # 唯一标识，与文件名一致
title: TCP 队头阻塞的成因链              # 展示标题（中文为主）
meta_type: insight                      # observation | insight | decision | question | comparison
insight_origin: explicit                # explicit | inferred | mixed（仅 insight 节点建议填写）
domains:                                # 领域标签数组，至少一个
  - "#技术/网络"
status: mature                          # seed | growing | mature | needs-split | archived
created: 2026-01-19                     # ISO 日期
updated: 2026-04-29                     # ISO 日期

# === 可选 ===
wiki: 前端学习                           # 物理 wiki 归属（用于隐私管控/筛选）

sources:                                 # 素材出处
  - title: "TCP 协议精讲"
    path: "raw/2026-01-19-tcp.md"
    date: 2026-01-19

relations:                               # 语义关系（出向边）
  - to: quic-vs-tcp                      # 目标节点 id
    type: contrasts                      # 关系类型
    note: "QUIC 用 stream 多路复用解决了它"  # 补充说明（可选）

derived_from: []                         # 自进化：从哪个节点拆出
splits_into: []                          # 自进化：被拆成了哪些节点
---

正文 markdown。支持 [[node-id]] wikilink 语法。
```

### 3.3 构建时自动计算字段

以下字段不写在 markdown 里，由构建脚本自动计算注入数据层：
- `metrics.in_degree`：入链数
- `metrics.out_degree`：出链数
- `back_edges[]`：反向边列表（来源节点 + 关系类型）
- `implicit_relations[]`：从正文 wikilink 自动提取的 `related` 类型关系

### 3.4 Schema 校验规则

构建时（CI 中）校验每个节点文件：
- `id` 与文件名一致
- `meta_type` 在五种之一
- `meta_type = insight` 时建议填写 `insight_origin`
- `insight_origin` 在允许值之一（仅 insight 节点使用）
- `status` 在允许值之一
- `domains` 非空数组
- `created` / `updated` 是合法日期
- `relations[].to` 指向的节点 id 存在（否则警告）
- `relations[].type` 在允许的关系类型之一

## 4. 技术选型

### 4.1 框架

| 层 | 选型 | 理由 |
|---|---|---|
| 前端框架 | **Next.js 14+ (App Router, Static Export)** | SSG 生成全静态、React 生态丰富、图组件库多 |
| 样式 | **Tailwind CSS** | 快速原型、一致性好 |
| 图谱渲染 | **Cytoscape.js** | 成熟、性能好、布局算法丰富（concentric/cose/cola） |
| Markdown 解析 | **gray-matter** (frontmatter) + **remark/rehype** (正文) | Node 生态标准、插件丰富 |
| 搜索 | **Pagefind**（v0.3+）/ 先用 **FlexSearch** 过渡 | Pagefind 构建时索引、纯客户端运行、零后端 |
| 部署 | **Vercel**（优先）/ Cloudflare Pages / GitHub Pages | Vercel 与 Next.js 亲和度最高、自动 preview |
| CI/CD | **GitHub Actions** | push → build → deploy 全自动 |
| 认证 | **Vercel Password Protection** / **Cloudflare Access** | 边缘层拦截、不侵入代码 |

### 4.2 备选方案

- Astro：比 Next.js 更轻、适合内容站。若不需要客户端交互 heavy 的场景可以换。但图谱交互是核心，React 组件在 Astro 里也需要 client directive，收益有限。
- D3.js 替代 Cytoscape：D3 更灵活但需要手写更多。Cytoscape 的布局算法和事件系统对 wiki 图谱场景更开箱即用。

## 5. 数据流详细设计

### 5.1 构建时数据处理流水线

```
myWiki/nodes/*.md
       ↓
  [1] gray-matter 提取 frontmatter + body
       ↓
  [2] schema 校验（报错即 CI 失败）
       ↓
  [3] wikilink 提取：正文 [[id]] → 补充 implicit relations
       ↓
  [4] 图构建：
      - 正向边 = frontmatter.relations + implicit
      - 反向边 = 遍历所有正向边，翻转
      - 度计算 = count(in) / count(out)
       ↓
  [5] 涌现指标计算：
      - hub 排行
      - 跨域 hub（domains.length ≥ 2 && in_degree ≥ 阈值）
      - overload 候选（body.length > 阈值 && in_degree ≥ 阈值）
      - 孤岛检测（in_degree = 0 && out_degree = 0）
       ↓
  [6] 输出 JSON（或 Next.js getStaticProps 直接消费）
      - nodes[]: { id, title, meta_type, domains, status, body_html, sources, relations, metrics, ... }
      - edges[]: { source, target, type, note }
      - emergence: { hubs, crossDomainHubs, overloadCandidates, orphans, recentUpdates, openQuestions }
```

### 5.2 构建脚本伪代码 (`scripts/build-data.ts`)

```typescript
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

const NODES_DIR = path.join(process.cwd(), 'myWiki/nodes')
const WIKILINK_RE = /\[\[([a-z0-9-]+)\]\]/g

interface WikiNode {
  id: string
  title: string
  meta_type: 'observation' | 'insight' | 'decision' | 'question' | 'comparison'
  insight_origin?: 'explicit' | 'inferred' | 'mixed'
  domains: string[]
  status: 'seed' | 'growing' | 'mature' | 'needs-split' | 'archived'
  created: string
  updated: string
  wiki?: string
  sources: { title: string; path: string; date?: string }[]
  relations: { to: string; type: string; note?: string }[]
  derived_from: string[]
  splits_into: string[]
  body_raw: string
  body_html: string
  metrics: { in_degree: number; out_degree: number }
  back_edges: { from: string; type: string; note?: string }[]
}

export function buildData(): { nodes: WikiNode[]; edges: any[]; emergence: any } {
  // 1. Read all .md files
  const files = fs.readdirSync(NODES_DIR).filter(f => f.endsWith('.md'))
  const nodeMap = new Map<string, WikiNode>()

  for (const file of files) {
    const raw = fs.readFileSync(path.join(NODES_DIR, file), 'utf-8')
    const { data: fm, content } = matter(raw)

    // 2. Validate schema (throw on critical errors)
    validateSchema(fm, file)

    // 3. Render markdown → HTML
    const bodyHtml = renderMarkdown(content)

    // 4. Extract implicit wikilinks
    const implicitRels = extractWikilinks(content, fm.relations || [])

    const node: WikiNode = {
      id: fm.id,
      title: fm.title,
      meta_type: fm.meta_type,
      domains: fm.domains || [],
      status: fm.status,
      created: fm.created,
      updated: fm.updated,
      wiki: fm.wiki,
      sources: fm.sources || [],
      relations: [...(fm.relations || []), ...implicitRels],
      derived_from: fm.derived_from || [],
      splits_into: fm.splits_into || [],
      body_raw: content,
      body_html: bodyHtml,
      metrics: { in_degree: 0, out_degree: 0 },
      back_edges: [],
    }

    nodeMap.set(node.id, node)
  }

  // 5. Build graph edges + back edges + metrics
  const edges = []
  for (const [id, node] of nodeMap) {
    node.metrics.out_degree = node.relations.length
    for (const rel of node.relations) {
      const target = nodeMap.get(rel.to)
      if (!target) { console.warn(`Broken link: ${id} → ${rel.to}`); continue }
      target.metrics.in_degree++
      target.back_edges.push({ from: id, type: rel.type, note: rel.note })
      edges.push({ source: id, target: rel.to, type: rel.type, note: rel.note })
    }
  }

  // 6. Compute emergence metrics
  const nodes = Array.from(nodeMap.values())
  const emergence = computeEmergence(nodes)

  return { nodes, edges, emergence }
}
```

### 5.3 搜索索引

**v0.1-v0.2：FlexSearch（客户端内存索引）**
- 构建时将所有节点 `{ id, title, body, domains }` 打包为 JSON
- 客户端加载后建立 FlexSearch 索引
- 适合 < 500 节点

**v0.3+：Pagefind**
- Pagefind 在构建后扫描生成的 HTML → 产出二进制索引
- 客户端按需加载索引分片
- 支持中文分词
- 适合 > 500 节点

## 6. 前端组件架构

### 6.1 页面组件树

```
RootLayout (sidebar + main area)
├── HomePage
│   ├── MetaTypeLegend
│   └── HomeCard[] (hubs, crossDomain, questions, growing)
│       └── NodeCard (with HoverPopover)
├── NodePage
│   ├── BackBar
│   ├── NodeHeader (title, meta_type chip, status, domains, metrics)
│   ├── NodeBody (rendered markdown with clickable wikilinks + HoverPopover)
│   ├── SourcesPanel
│   ├── RelationPanel
│   │   ├── RelationSection ("我指向" / "指向我")
│   │   │   └── RelationRow[] (type chip + NodeCard + note, with HoverPopover)
│   └── LocalGraph (Cytoscape concentric)
├── GraphPage
│   └── GlobalGraph (Cytoscape cose + legend)
├── EmergencePage
│   └── HomeCard[] (hubs, crossDomain, questions, overload, recent, orphans)
├── DomainPage
│   └── NodeList with NodeCard[]
├── AllNodesPage
│   └── MetaTypeSection[] → NodeCard[]
└── SearchOverlay
    └── SearchResultItem[] (with HoverPopover)
```

### 6.2 关键交互组件

#### HoverPopover
```typescript
interface PopoverProps {
  nodeId: string
  triggerRef: RefObject<HTMLElement>
}
// 弹层定位逻辑：
// 1. 跟随 trigger 元素位置
// 2. 优先向上弹出，空间不够时向下
// 3. 左右不超出视口
// 4. 120ms 延迟关闭（避免鼠标移向弹层时闪烁）
// 5. 图谱区域不触发
```

#### LocalGraph
```typescript
interface LocalGraphProps {
  centerId: string
  nodes: WikiNode[]
  edges: Edge[]
}
// 布局策略：
// - concentric layout, center node level=100, others level=1
// - minNodeSpacing = max(80, 700 / neighborCount)
// - padding = 80
// - 中心节点: 110x110, 白字内嵌标题
// - 邻居节点: 44x44, 标题在下方
// - 出向边蓝色, 入向边琥珀色
// - 边标签: autorotate, 白底圆角 chip
// - hover: 描边加深 + pointer cursor
// - click: 跳转详情
```

#### RelationPanel
```typescript
// 分两区: "↗ 我指向" (蓝色 chip) + "↩ 指向我" (琥珀色 chip)
// 每行: [关系类型 chip] [icon] [标题链接] [meta_type chip] [status badge]
//                       [note 斜体灰色]
// 整行可点击跳转, 标题链接支持 HoverPopover
```

### 6.3 响应式策略（v0.1 即实现）

| 断点 | 布局 |
|---|---|
| ≥ 1024px | 侧边栏 260px + 主内容区 |
| 768-1023px | 侧边栏可折叠（汉堡按钮） |
| < 768px | 侧边栏隐藏，顶部汉堡菜单，主内容区全宽 |

图谱在移动端：缩小容器高度、禁用 hover、tap 跳转。
卡片网格：≥1024 两列，<1024 单列。

### 6.4 展示约定

#### 状态标签中文化

| status 值 | 展示标签 |
|---|---|
| `seed` | 种子 |
| `growing` | 成长中 |
| `mature` | 成熟 |
| `needs-split` | 待拆分 |
| `archived` | 已归档 |

#### 元类型展示标签

| meta_type 值 | 展示标签 | 图标 |
|---|---|---|
| `observation` | 事实 | 👁 |
| `insight` | 洞见 | 💡 |
| `decision` | 主张 | 🎯 |
| `question` | 疑问 | ❓ |
| `comparison` | 辨析 | ⚖️ |

#### 首页展示优先级（从上到下）

1. **最近更新**（按 updated 排序，前 8 个）— 最高优先级，反映当前活跃的思考
2. **正在生长**（status = seed / growing）— 当前活跃的节点
3. **入口 hub**（按入链数排序）
4. **跨域枢纽**（domains.length ≥ 2 && in_degree ≥ 2）
5. **开放问题**（meta_type = question）

#### 节点列表分类维度

全部节点页和涌现页支持两种分类视角：
- **按元类型**：事实 / 洞见 / 主张 / 疑问 / 辨析
- **按状态**：种子 / 成长中 / 成熟 / 待拆分 / 已归档

## 7. GitHub Action 流水线

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy myWiki

on:
  push:
    branches: [main]
    paths:
      - 'myWiki/**'
      - 'site/**'
      - 'scripts/**'

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: cd site && pnpm install --frozen-lockfile

      - name: Validate node schema
        run: pnpm tsx scripts/validate-schema.ts

      - name: Build site (SSG)
        run: cd site && pnpm build
        # Next.js static export: reads myWiki/nodes/ at build time

      - name: Generate search index (Pagefind)
        run: npx pagefind --site site/out --glob "**/*.html"

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: site/out
```

## 8. 认证方案

### 第一阶段：Vercel Password Protection
- Vercel 项目设置 → "Password Protection" → 设置一个密码
- 所有访问者需先输入密码
- 零代码改动

### 第二阶段（如需要）：Cloudflare Access
- 支持邮箱 OTP、GitHub OAuth
- 适合想给几个朋友看的场景
- 在 DNS 层拦截，不侵入代码

## 9. 性能考量

### 9.1 构建时优化
- markdown → HTML 在构建时完成，运行时不做解析
- 图数据预计算：度数、hub 排行、overload 候选等
- 搜索索引预构建（Pagefind）

### 9.2 运行时优化
- Next.js static export → 全 CDN 分发
- 图谱按需渲染（进入图谱页时才初始化 Cytoscape）
- 大图谱懒渲染：> 200 节点时初始只显示 top-N hub + 1 跳邻居，用户手动展开
- 代码分割：Cytoscape 和搜索库动态 import

### 9.3 规模预估

| 节点数 | 数据量 | 首屏加载 | 图谱渲染 |
|---|---|---|---|
| 50 | ~200KB JSON | < 1s | 流畅 |
| 200 | ~800KB JSON | < 2s | 流畅 |
| 500 | ~2MB JSON | ~3s | 可接受 |
| 1000+ | > 4MB JSON | 需优化（分片加载） | 需大图优化 |

1000+ 节点时的优化方案：
- JSON 分片：按 wiki/domain 拆分，按需加载
- 图谱改用 WebGL 渲染（Sigma.js）
- 搜索走 Pagefind（已按分片设计）

## 10. LLM 维护协议（CLAUDE.md 核心）

### 10.1 Ingest 流程
1. 接收素材（文件/URL/口述/历史笔记）
2. 复制素材到 `myWiki/raw/`，命名 `YYYY-MM-DD-<标题>.md`
3. 读取素材，提取知识点
4. 判断：是新建节点还是更新已有节点
5. 写/更新 `myWiki/nodes/<id>.md`（按 schema）
6. 更新 `myWiki/meta/index.md`
7. 追加 `myWiki/meta/log.md`
8. 输出汇总报告

### 10.2 Lint 流程
1. 遍历所有节点
2. 检查：断链、孤岛、缺交叉引用、矛盾
3. 检查 overload 信号：正文 > N 字 + 入链 > M 且来自不同 domain
4. 提议拆分/合并（需用户确认）
5. 追加 log

### 10.3 Query 流程
1. 用户提问
2. 搜索 index.md 找候选节点
3. 读取相关节点
4. 合成答案，带 [[wikilink]] 引用
5. 若答案有沉淀价值 → 提议回写为新节点

## 11. 安全与隐私

- 私密 wiki（如工作相关）通过 `.gitignore` 排除出 git
- 部署时私密内容不进构建
- 认证层在 CDN 边缘拦截
- 无后端、无数据库、无用户数据收集

## 12. 离线 / 本地模式

### 12.1 架构

线上模式和离线模式共享同一份代码，区别仅在数据来源：

```
线上模式：GitHub Action 构建 → 静态产物部署到 CDN → 浏览器访问
离线模式：本地 `pnpm dev` → Next.js dev server 实时读 myWiki/ → 浏览器 localhost
```

### 12.2 目录配置

项目根目录有一个 `mywiki.config.ts`：

```typescript
// mywiki.config.ts
import { defineConfig } from './site/src/lib/config'

export default defineConfig({
  // wiki 内容目录（相对于项目根 或 绝对路径）
  wikiDir: './myWiki',

  // 站点配置
  site: {
    title: 'myWiki',
    tagline: '个人理解的镜子',
    owner: 'zzy',
  },

  // 认证（线上部署时生效，本地 dev 默认跳过）
  auth: {
    enabled: true,
    provider: 'vercel-password', // 或 'cloudflare-access'
  },
})
```

用户可以修改 `wikiDir` 指向任意本地目录。这意味着：
- wiki 仓库和网站代码可以分离（wiki 是一个纯 markdown 仓库，网站是另一个代码仓库）
- 也可以合在一起（monorepo）

### 12.3 本地开发体验

```bash
# 克隆网站代码
git clone myWiki-site && cd myWiki-site

# 修改 mywiki.config.ts，指向你的 wiki 目录
# wikiDir: '/Users/zzy/my-knowledge-base/myWiki'

# 启动本地 dev server
pnpm dev
# → http://localhost:3000 即可浏览全部 wiki 内容
# → 修改 myWiki/ 下的 markdown 后，HMR 自动刷新
```

### 12.4 两种部署拓扑

**拓扑 A：Monorepo（简单）**
```
repo-root/
├── myWiki/     # wiki 数据
├── site/        # 网站代码
└── .github/     # CI/CD
```
push 到 GitHub 一把触发构建部署。

**拓扑 B：分仓（灵活）**
```
知识库仓库：my-knowledge-base/ (myWiki/ + CLAUDE.md)
网站仓库：mywiki-site/ (site/ + mywiki.config.ts 指向知识库路径)
```
知识库可以 private（不含网站代码），网站仓库 public（开源给别人用）。
部署时 GitHub Action 拉两个仓库拼在一起构建。

## 13. LLM Skill 设计

### 13.1 为什么需要 Skill

用户不直接写 wiki 节点——LLM 帮写。但不同 LLM（Claude Code、Codex、Cursor 等）需要一份统一指令告诉它：
- 节点写到哪里
- 文件名怎么取
- frontmatter 字段怎么填
- 什么时候新建 vs 更新
- 关系怎么建立
- 什么时候提议拆分

这份指令就是 Skill 文件。它放在 wiki 仓库根目录，任何 LLM Agent 读了就能操作这个 wiki。

### 13.2 Skill 触发方式

用户在本地 LLM 对话中说：
- "把这份文档摄入 wiki" → 触发 ingest
- "这个话题有哪些节点" → 触发 query
- "跑一遍 lint" → 触发 lint
- "把这个节点拆一下" → 触发 refactor

LLM 读取 Skill → 执行对应流程 → 写文件 → 用户 review → git push。

### 13.3 Skill 文件位置

```
myWiki/
├── SKILL.md          # ⭐ LLM 工作指令（核心 skill）
├── nodes/
├── raw/
└── meta/
```

Skill 跟着数据走（不跟着网站代码），这样即使换网站框架、换部署方式，LLM 的工作流程不变。

详见下方 `SKILL.md` 完整内容。

## 14. 开发计划（修订）

### v0.1 — 可推送即更新的静态站 ✅ 已完成
- [x] 初始化 Next.js 16 项目（App Router + Static Export）
- [x] 实现数据层 `parser.ts`（解析 markdown → 构建 nodes/edges/emergence）
- [x] 页面组件：首页、节点详情、全局图谱、涌现页、领域页、全部节点、搜索
- [x] LocalGraph + GlobalGraph 组件（Cytoscape）
- [x] RelationPanel 组件
- [x] Sidebar（响应式）+ BackBar + 路由
- [x] 响应式布局（lg 断点侧边栏折叠、grid 自适应）
- [x] 展示约定：元类型/状态中文标签、首页优先级、按状态分类
- [x] GitHub Action 部署到 Vercel
- [ ] Vercel Password Protection 配置（部署后在 Vercel 面板操作）
- [ ] HoverPopover 组件（延后到 v0.2）

### v0.2 — 真实数据 ✅ 已完成
- [x] 设计 SKILL.md（ingest/lint/query/refactor 协议）
- [x] 从 data.js 迁移全部 24 个节点为独立 markdown
- [x] 验证端到端流程：本地 build → 全部页面正确生成

### v0.3 — 搜索 + 体验优化 ← 当前
- [ ] 本地目录选择（用户可指定 wikiDir，dev 时实时读取）
- [ ] 集成 Pagefind（替代 FlexSearch）
- [ ] 图谱移动端适配（缩小、tap 跳转）
- [ ] validate-schema.ts 脚本（CI 校验）
- [ ] HoverPopover 悬浮预览组件

### v0.4 — 时间维度（TODO）
- [ ] 时间线视图页面（`/timeline`）：按 updated/created 垂直排列节点，展示思考脉络
- [ ] 支持按月/季度聚合，回答"这个月我在想什么"

### v1.0 — LLM 查询
- [ ] 轻后端（Vercel Edge Function / Cloudflare Worker）
- [ ] 接入 Claude API
- [ ] 网页内提问 → 搜索相关节点 → LLM 合成答案 → 带引用返回

## 附录 A：关系类型完整表

| type | 正向标签 | 反向标签 | 典型场景 |
|---|---|---|---|
| `implements` | 实现 | 被实现 | 具体方案 → 抽象概念 |
| `contradicts` | 反驳 | 被反驳 | 新发现推翻旧认知 |
| `contrasts` | 对照 | 对照 | 两个方案的对比 |
| `extends` | 扩展 | 被扩展 | 在已有理解上深入 |
| `instance-of` | 实例 | 包含实例 | 具体案例 → 通用模型 |
| `prerequisite` | 前置 | 后续 | 理解 A 需要先理解 B |
| `evolves-from` | 演化自 | 演化为 | 思考迭代 |
| `related` | 相关 | 相关 | wikilink 默认/弱关联 |

## 附录 B：元类型设计哲学

五种元类型跨领域通用，本质对应人类认知的五种动作：

1. **观察**（observation/事实）→ 输入层：我接收到了什么
2. **建模**（insight/洞见）→ 加工层：我怎么理解它
3. **决策**（decision/主张）→ 输出层：基于理解我做了什么
4. **存疑**（question/疑问）→ 元认知层：我知道我不知道什么
5. **辨析**（comparison/辨析）→ 关系层：两个事物的关系本身

这五种覆盖技术、生活、工作、艺术——结构同构。
