# myWiki — Demo

> 这是一个**形态原型**，用来确认产品方向。生产版会从你的 markdown 节点自动构建，但 demo 直接用预生成的 `data.js`。

## 怎么打开

直接双击 `index.html`，或在浏览器里打开（不需要 server）。

**登录密码：`demo`**

## 文件

- `index.html` — 整个 SPA，单文件，CDN 引入 marked + cytoscape
- `data.js` — 24 个示例节点（技术 / 工作 / 生活 / 思考），含跨域关系
- `SCHEMA.md` — 节点 markdown schema 定义（这是真正落到你 wiki 里的格式）
- `sample-nodes/` — 一个真实形态的 markdown 节点示例

## 五个视图

1. **首页** — hub、跨域节点、开放问题、正在生长的节点
2. **节点详情** — 正文 + 来源 + 双向语义关联（按类型分组） + 局部图
3. **全局图谱** — Cytoscape 力导图，节点大小 = 入链数，颜色 = 元类型
4. **涌现 · 自进化** — hub / 跨域 hub / 开放问题积压 / 候选拆分 / 最近更新 / 孤岛
5. **领域页 / 全部节点 / 搜索** — 多维度入口

## 设计原则在产品里的体现

| 原则 | 在 demo 里的体现 |
|---|---|
| 节点优先 | URL 主单元是 `#node/<id>`，所有视图都通向节点详情 |
| 通用元类型 | 五种颜色一致贯穿（observation/model/decision/question/comparison） |
| 关系带语义 | 详情页"语义关联"区按 implements/contradicts/contrasts 等分组 |
| 双向自动 | back-edges 在构建时自动算，详情页用 ↩ 标记 |
| 跨 wiki 连通 | 节点 `wiki` 字段只是 metadata，不影响图的连通性 |
| 自进化可见 | 涌现页有"候选拆分（overload signal）"区 |
| 未完成可见 | open question 有专门入口、status seed/growing 有视觉标记 |
| 跨域 hub | 涌现页"跨域 hub"区把多 domain 标签 + 高入链的节点单列 |

## 已知差距（要在生产版补）

- markdown 真实解析（gray-matter + remark）+ GitHub Action 构建链路
- LLM 写入接口：lint 提议 / 拆分 / 标注关系
- Pagefind 全文搜索（demo 用简单子串匹配）
- 移动端布局
- 真正的 auth（Cloudflare Access 之类）
