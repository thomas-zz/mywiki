/* myWiki demo data
 * In production this would be generated at build time by parsing markdown frontmatter.
 * For the demo we hand-craft a representative dataset spanning multiple domains
 * to show how cross-domain hubs and self-evolution become visible.
 */
window.WIKI_DATA = {
  meta: {
    name: "myWiki",
    owner: "zzy",
    generatedAt: "2026-05-04",
  },

  /* Five universal meta-types */
  metaTypes: {
    observation: { label: "事实", icon: "👁", color: "#94a3b8", desc: "看到/听到/读到的，不掺自己的理解" },
    model:       { label: "洞见", icon: "💡", color: "#6366f1", desc: "我自己提炼出的理解、心智模型、因果链" },
    decision:    { label: "主张", icon: "🎯", color: "#f59e0b", desc: "基于理解我选择了什么、相信什么" },
    question:    { label: "疑问", icon: "❓", color: "#ef4444", desc: "还没想清的问题，挂在这里慢慢长" },
    comparison:  { label: "辨析", icon: "⚖️", color: "#10b981", desc: "X 与 Y 的对比与取舍本身" },
  },

  relationTypes: {
    implements:    "实现",
    contradicts:   "反驳",
    contrasts:     "对照",
    extends:       "扩展",
    "instance-of": "实例",
    prerequisite:  "前置",
    "evolves-from":"演化自",
    related:       "相关",
  },

  /* Inverse mapping for back-edges */
  inverseLabels: {
    implements:    "被实现",
    contradicts:   "被反驳",
    contrasts:     "对照",
    extends:       "被扩展",
    "instance-of": "包含实例",
    prerequisite:  "后续",
    "evolves-from":"演化为",
    related:       "相关",
  },

  /* The actual nodes — 24 across tech/work/life/思考 */
  nodes: [
    /* —— 技术：网络 —— */
    {
      id: "tcp-head-of-line-blocking",
      title: "TCP 队头阻塞的成因链",
      wiki: "前端学习",
      meta_type: "model",
      domains: ["#技术/网络"],
      status: "mature",
      created: "2026-01-19", updated: "2026-04-29",
      sources: [{ title: "TCP 协议精讲", path: "raw/2026-01-19-tcp.md" }],
      relations: [
        { to: "quic-vs-tcp", type: "contrasts" },
        { to: "http2-multiplexing-limit", type: "extends", note: "应用层多路复用救不了传输层 HoL" },
      ],
      body:
`TCP 把字节流当作严格有序的整体——任何一个分段丢失，后面的分段哪怕已到达，也必须等丢失分段重传补齐才能交给上层。

这就是队头阻塞：**有序保证 = 一损俱损**。HTTP/1.1 的同域并发限制和 HTTP/2 的多路复用都没有解决它，因为它根植于传输层。要解决就得换一层——QUIC 在 UDP 之上自建多 stream，每个 stream 独立处理丢包，绕过了 TCP 的全局有序约束。

理解这一点的价值不在于记住"TCP 有 HoL"，而在于看到一个普适模式：**强一致性约束在出错时会放大代价**。`
    },
    {
      id: "quic-vs-tcp",
      title: "QUIC vs TCP：为什么要重新发明传输层",
      wiki: "前端学习",
      meta_type: "comparison",
      domains: ["#技术/网络"],
      status: "mature",
      created: "2026-02-10", updated: "2026-04-29",
      sources: [{ title: "HTTP 演化史", path: "raw/2026-02-10-http-evolution.md" }],
      relations: [
        { to: "tcp-head-of-line-blocking", type: "extends" },
      ],
      body:
`| | TCP | QUIC |
|---|---|---|
| 多路复用 | 仅应用层（HTTP/2 仍受 HoL 限制） | 传输层多 stream，独立丢包恢复 |
| 握手 | 3-way + TLS 单独握手 | 0-RTT / 1-RTT 集成 TLS |
| 连接迁移 | 五元组绑定，IP 变化即断 | Connection ID，跨网络无缝迁移 |

QUIC 不是"更快的 TCP"，而是承认了"传输层语义需要跟应用层绑定"。这是反 OSI 分层教条的设计，但更贴合现代应用——视频会议、移动网络、CDN 都受益于此。`
    },
    {
      id: "http2-multiplexing-limit",
      title: "HTTP/2 多路复用的天花板",
      wiki: "前端学习",
      meta_type: "observation",
      domains: ["#技术/网络"],
      status: "mature",
      created: "2026-02-10", updated: "2026-02-10",
      sources: [{ title: "HTTP 演化史", path: "raw/2026-02-10-http-evolution.md" }],
      relations: [
        { to: "tcp-head-of-line-blocking", type: "instance-of" },
      ],
      body: `HTTP/2 在一个 TCP 连接上跑多个 stream，理论上消除了 HTTP/1.1 的连接级队头阻塞。但只要 TCP 丢包，所有 stream 都得停下等重传——传输层的 HoL 把应用层的努力一笔勾销。这就是 QUIC 出现的直接动因。`
    },

    /* —— 技术：包管理 —— */
    {
      id: "phantom-dependency",
      title: "幽灵依赖（phantom dependency）",
      wiki: "前端学习",
      meta_type: "model",
      domains: ["#技术/工程"],
      status: "mature",
      created: "2026-03-05", updated: "2026-04-09",
      sources: [{ title: "幽灵依赖详解", path: "raw/2026-03-05-phantom-dependency.md" }],
      relations: [
        { to: "npm-flattening", type: "evolves-from", note: "扁平化的副作用" },
        { to: "pnpm-symlink-strategy", type: "contrasts" },
      ],
      body:
`npm/yarn 把 node_modules 扁平化以省空间，副作用是：你能 require 一个**没在 package.json 里声明**的包——只要它恰好被某个直接依赖间接拉进来。这就是幽灵依赖。

后果不是立刻爆炸，而是**当那个间接依赖升级、换了实现，或者你的依赖树重排时，幽灵依赖突然消失**——你的代码在没人改的情况下挂掉。

这是一类典型的"省小钱（磁盘）惹大祸（隐性契约）"的设计。pnpm 用 symlink + 严格的 node_modules 结构反过来——只有声明的依赖能被找到。`
    },
    {
      id: "npm-flattening",
      title: "npm 扁平化策略",
      wiki: "前端学习",
      meta_type: "decision",
      domains: ["#技术/工程"],
      status: "mature",
      created: "2026-04-09", updated: "2026-04-09",
      sources: [{ title: "包管理深潜", path: "raw/2026-04-09-package-managers-deep-dive.md" }],
      relations: [],
      body: `npm 3 起，安装时尽量把依赖提升到顶层 node_modules，减少嵌套和磁盘占用。代价是模块解析变得不确定，催生了 phantom dependency。`
    },
    {
      id: "pnpm-symlink-strategy",
      title: "pnpm 的 symlink + 内容寻址",
      wiki: "前端学习",
      meta_type: "decision",
      domains: ["#技术/工程"],
      status: "mature",
      created: "2026-04-09", updated: "2026-04-09",
      sources: [{ title: "包管理深潜", path: "raw/2026-04-09-package-managers-deep-dive.md" }],
      relations: [
        { to: "phantom-dependency", type: "contradicts", note: "用结构强制阻断" },
      ],
      body: `pnpm 把所有包存到全局 store（按内容哈希去重），项目 node_modules 里只放 symlink。每个项目只能 require 自己声明的依赖——结构层面消灭幽灵依赖。`
    },

    /* —— 技术：架构 —— */
    {
      id: "react-fiber-why-linked-list",
      title: "React Fiber 为什么用链表",
      wiki: "前端学习",
      meta_type: "model",
      domains: ["#技术/前端"],
      status: "mature",
      created: "2026-04-15", updated: "2026-04-15",
      sources: [],
      relations: [
        { to: "interruptible-rendering", type: "implements" },
      ],
      body:
`递归遍历 fiber 树意味着调用栈不能中断——浏览器要插队渲染、要响应输入，必须等递归走完。

链表 + 显式指针让 React 把"遍历状态"从 JS 调用栈搬到了堆里。每处理完一个 fiber 节点，就检查一次时间预算（5ms 默认），不够就把当前指针存下来，交还主线程。下次再继续。

**机制本身不复杂，难的是看出"递归 → 链表"是为了换取"可中断"这个可调度性**。`
    },
    {
      id: "interruptible-rendering",
      title: "可中断渲染（interruptible rendering）",
      wiki: "前端学习",
      meta_type: "model",
      domains: ["#技术/前端"],
      status: "mature",
      created: "2026-04-15", updated: "2026-04-15",
      sources: [],
      relations: [
        { to: "delayed-gratification", type: "related", note: "工程上的延迟满足——舍长期 throughput 换短期 responsiveness" },
      ],
      body: `把一段长任务切成可暂停、可恢复的小步，让高优先级任务能插队。React Fiber、操作系统调度、generator/async 协程，本质都是这件事。`
    },

    /* —— 工作：思考 —— */
    {
      id: "ai-coder-tradeoff-pnpm",
      title: "AI Coder 项目为什么选 pnpm",
      wiki: "AI编码助手",
      meta_type: "decision",
      domains: ["#工作/AI编码助手", "#技术/工程"],
      status: "mature",
      created: "2026-04-23", updated: "2026-04-23",
      sources: [],
      relations: [
        { to: "pnpm-symlink-strategy", type: "implements" },
        { to: "phantom-dependency", type: "related" },
      ],
      body: `项目里有多个 NestJS 模块互相依赖，幽灵依赖会让排查问题极痛苦。pnpm 的严格性虽然偶尔让初学者迷惑，但长期 ROI 远高于一次次 debug 隐性依赖。`
    },
    {
      id: "agent-engine-react-loop",
      title: "Agent 引擎的 ReAct 循环本质",
      wiki: "AI编码助手",
      meta_type: "model",
      domains: ["#工作/AI编码助手", "#技术/AI"],
      status: "mature",
      created: "2026-04-27", updated: "2026-04-27",
      sources: [],
      relations: [
        { to: "subagent-thread-isolation", type: "extends" },
        { to: "tool-error-tolerance", type: "related" },
      ],
      body: `LLM → 选工具 → 执行 → 把结果写回上下文 → 再 LLM。本质是把"思考"和"行动"在 token 流里交错。难点不是这个循环本身，而是上下文怎么不爆炸、错误怎么不滚雪球。`
    },
    {
      id: "subagent-thread-isolation",
      title: "Subagent 线程隔离",
      wiki: "AI编码助手",
      meta_type: "decision",
      domains: ["#工作/AI编码助手"],
      status: "growing",
      created: "2026-04-28", updated: "2026-04-28",
      sources: [],
      relations: [],
      body: `每个 subagent 跑独立的对话线程，主 agent 只看到 subagent 的最终回报，不看到中间步骤。这避免了上下文污染，代价是主 agent 失去了纠偏的能力——subagent 错了主 agent 不一定察觉。`
    },
    {
      id: "tool-error-tolerance",
      title: "工具错误容忍度",
      wiki: "AI编码助手",
      meta_type: "question",
      domains: ["#工作/AI编码助手"],
      status: "seed",
      created: "2026-04-28", updated: "2026-04-28",
      sources: [],
      relations: [],
      body: `工具调用失败时，agent 应该重试、换工具、还是直接报告？目前是简单重试 1 次。需要更细的策略——但策略本身又会让 agent 决策变重。还没想清。`
    },

    /* —— 生活/思考 —— */
    {
      id: "delayed-gratification",
      title: "延迟满足并不是「忍」",
      wiki: "个人成长",
      meta_type: "model",
      domains: ["#生活/育儿", "#自我管理", "#思考"],
      status: "growing",
      created: "2026-03-12", updated: "2026-04-30",
      sources: [],
      relations: [
        { to: "marshmallow-experiment-replication", type: "extends" },
        { to: "product-roadmap-patience", type: "related", note: "做产品也要延迟满足" },
        { to: "interruptible-rendering", type: "related" },
      ],
      body:
`延迟满足容易被误解为"克制欲望"。真正起作用的是**对"延迟后会发生什么"的清晰预期**——如果你不相信将来会得到，硬忍就是消耗意志力，不可持续。

孩子做不到不是因为"自控力差"，是因为他们还没建立"未来兑现"的可信感。建立这种可信感是大人的事，不是孩子的事。

工作里同样适用：团队不愿延迟满足，往往不是不耐烦，是不相信领导给的承诺会兑现。`
    },
    {
      id: "marshmallow-experiment-replication",
      title: "棉花糖实验的复现危机",
      wiki: "个人成长",
      meta_type: "observation",
      domains: ["#生活/育儿"],
      status: "mature",
      created: "2026-03-10", updated: "2026-03-10",
      sources: [],
      relations: [],
      body: `2018 年扩大样本的复现研究发现，控制家庭社经地位后，棉花糖测试对未来成就的预测力大幅减弱。延迟满足能力很大程度上是"环境是否值得信任"的反映，而不是孩子的内在品质。`
    },
    {
      id: "product-roadmap-patience",
      title: "做产品的耐心 vs 节奏",
      wiki: "个人成长",
      meta_type: "decision",
      domains: ["#工作/职业", "#自我管理"],
      status: "growing",
      created: "2026-04-20", updated: "2026-04-20",
      sources: [],
      relations: [
        { to: "delayed-gratification", type: "instance-of" },
        { to: "ship-small-iterate-fast", type: "contrasts" },
      ],
      body: `想清楚的事可以等，半懂的事要尽快出原型。耐心用错地方就是拖延，节奏用错地方就是仓促。判断"现在到底是哪种"比执行更难。`
    },
    {
      id: "ship-small-iterate-fast",
      title: "小步快跑的隐性成本",
      wiki: "个人成长",
      meta_type: "observation",
      domains: ["#工作/职业"],
      status: "mature",
      created: "2026-04-20", updated: "2026-04-20",
      sources: [],
      relations: [],
      body: `迭代快的代价是**架构借贷**——每次小决策都欠下一点结构债，长期会让重构成本指数级上升。意识到这一点之后，会知道哪些决策值得停下来想清。`
    },

    /* —— 思考方法论 —— */
    {
      id: "wiki-vs-blog",
      title: "wiki 不是博客",
      wiki: "个人成长",
      meta_type: "model",
      domains: ["#思考", "#工作/职业"],
      status: "growing",
      created: "2026-04-29", updated: "2026-05-04",
      sources: [{ title: "LLM Wiki 思路", path: "raw/2026-04-29-llm-wiki.md" }],
      relations: [
        { to: "emergence-over-taxonomy", type: "implements" },
        { to: "future-of-personal-site", type: "extends" },
      ],
      body:
`博客的最小单元是"文章"，写完就发布、发布就不动。wiki 的最小单元是"理解"，会被反复回看、修改、拆分。

博客是给别人看的橱窗——只展示成品；wiki 是给自己看的镜子——也展示半成品和疑问。

这个区别决定了产品形态：博客重首页和列表，wiki 重节点和关系。`
    },
    {
      id: "emergence-over-taxonomy",
      title: "涌现优于分类",
      wiki: "个人成长",
      meta_type: "model",
      domains: ["#思考"],
      status: "growing",
      created: "2026-05-01", updated: "2026-05-04",
      sources: [],
      relations: [
        { to: "self-evolving-nodes", type: "implements" },
      ],
      body:
`传统知识库逼你先想好分类树，再往里填内容。但有意义的分类来自内容本身——你只有写了 50 个节点，才知道"职业"和"育儿"其实共享一个底层模型（信任与延迟）。

正确做法：不预设分类，只打自由标签 + 元类型。让 hub 自己浮出水面。LLM 周期性回看，提示"这几个节点正在围绕同一个未命名的概念聚集"。`
    },
    {
      id: "self-evolving-nodes",
      title: "节点会自我进化",
      wiki: "个人成长",
      meta_type: "model",
      domains: ["#思考"],
      status: "growing",
      created: "2026-05-01", updated: "2026-05-04",
      sources: [],
      relations: [
        { to: "emergence-over-taxonomy", type: "extends" },
      ],
      body:
`一个节点最初可能是粗糙的一段话。被引用 1-2 次时它够用。被引用 10+ 次、且不同语境引用的"侧面"不同时——它该拆了。

LLM 在 lint 时识别"过载"信号：长度过长、入链来自相距甚远的领域、子主题密度高。识别 → 提议 → 用户确认 → 拆分 → 重路由所有引用 → 留下 derived_from 痕迹。

进化历史本身就是知识。`
    },
    {
      id: "future-of-personal-site",
      title: "为什么传统个人博客不再重要",
      wiki: "个人成长",
      meta_type: "decision",
      domains: ["#思考", "#工作/职业"],
      status: "mature",
      created: "2026-05-03", updated: "2026-05-04",
      sources: [],
      relations: [
        { to: "wiki-vs-blog", type: "extends" },
        { to: "ai-takes-mechanical-recall", type: "implements" },
      ],
      body:
`简单知识不再稀缺。AI 能背 API、能查事实、能写样板代码。

学习的重心从"机械记忆 + 低层执行"转向"系统理解、问题定义、质量判断、领域直觉"。这些是 AI 接不走、必须留给人的。

所以个人输出的形式也该变——不再是"写一篇文章告诉别人 X 是什么"，而是"展示我对 X 是怎么理解的，它跟 Y、Z 怎么联系"。前者 AI 已经做得很好了，后者只有你能做。`
    },
    {
      id: "ai-takes-mechanical-recall",
      title: "AI 接走机械记忆，人留住理解",
      wiki: "个人成长",
      meta_type: "model",
      domains: ["#思考", "#技术/AI"],
      status: "growing",
      created: "2026-05-03", updated: "2026-05-04",
      sources: [],
      relations: [],
      body:
`Agent 可以记 PyTorch 的 \`tensor.view()\` 和 \`storage\` 怎么写，但人要理解"view 不复制内存"这件事意味着什么——意味着别名、意味着写时复制陷阱、意味着 GPU 上的对齐。

Agent 可以写支付逻辑代码，但人要理解"这笔钱归谁"——用户身份、资金归属、出错时谁兜底，这些是业务直觉，不是 API 调用。

**让 AI 拿走可记忆的，人留住要理解的**——这不是退让，是分工。`
    },

    /* —— 健康/生活 —— */
    {
      id: "morning-light-anchors-rhythm",
      title: "早晨日光是生物钟的锚",
      wiki: "个人成长",
      meta_type: "model",
      domains: ["#生活/健康"],
      status: "mature",
      created: "2026-02-15", updated: "2026-02-15",
      sources: [],
      relations: [
        { to: "sleep-debt-cant-be-binged", type: "related" },
      ],
      body: `醒后 1 小时内 10 分钟的户外光照（不是隔窗）能锚定褪黑素分泌节律，比晚上吃褪黑素更可持续。机制：视网膜 ipRGC 直接通路下丘脑 SCN。`
    },
    {
      id: "sleep-debt-cant-be-binged",
      title: "睡眠债不能「周末补」",
      wiki: "个人成长",
      meta_type: "observation",
      domains: ["#生活/健康"],
      status: "mature",
      created: "2026-02-15", updated: "2026-02-15",
      sources: [],
      relations: [],
      body: `周末补觉只能恢复显性疲劳，不能逆转累积的代谢和认知损伤。规律性比总时长更重要——这点跟"延迟满足靠可信感"同构：稳定的预期压倒一次性的强度。`
    },

    /* —— 一个开放问题，跨域 —— */
    {
      id: "what-do-i-want-from-work",
      title: "我到底想要什么样的工作节奏",
      wiki: "个人成长",
      meta_type: "question",
      domains: ["#工作/职业", "#自我管理", "#思考"],
      status: "seed",
      created: "2026-04-30", updated: "2026-04-30",
      sources: [],
      relations: [
        { to: "ship-small-iterate-fast", type: "related" },
        { to: "delayed-gratification", type: "related" },
      ],
      body: `想要的"自由"和想要的"被需要"会冲突。想要的"专注"和想要的"广度"也会冲突。这个问题挂在这里，不强求答案，等更多观察来喂养它。`
    },
  ],
};
