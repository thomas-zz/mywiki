# Changelog

本文件记录 myWiki 各版本的变更内容，遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 格式。

## [Unreleased]

## [0.3.2] - 2026-06-25

### Changed
- 公众号文章读取改用独立开源 skill [`wechat-mp-article-reader`](https://github.com/Thomas-zz/wechat-mp-article-reader)，移除项目内 lxml 重复实现及对应测试
- `mywiki-ingest` 公众号兜底改为纯引导流程：优先调已装 skill，未装则引导一行 `git clone` 安装或降级粘贴正文；myWiki 自身不再内置读取脚本
- README 中英双语"可选独立 Skill"指向独立开源仓库

### Fixed
- `.gitignore` 中 `myWiki/` 改为 `/myWiki/` 锚定仓库根，避免在大小写不敏感文件系统上误伤 `docs/mywiki/` skill 源目录（此前 `git add` 需 `-f`）

## [0.3.1] - 2026-06-05

### Changed
- skill 安装模型切换为 SSOT：固定使用 `~/.mywiki/skills/mywiki/` 作为源目录，再同步到各 AI 工具
- Codex / OpenCode 默认从 `AGENTS.md` 注入切换为 `skills/` 目录安装；更新时会自动移除旧的 mywiki 注入区块
- `~/.mywiki/` 明确为应用配置目录；真实 wiki 数据目录继续由 `~/.mywiki/config.json` 中的 `wikiDir` 决定

### Fixed
- Windows 目录链接失败时自动回退为目录复制
- 非 Windows 平台的目录链接失败也会自动回退为目录复制，避免安装中断
- 面板配置 API 允许 Windows 绝对路径作为 `wikiDir`

### Added
- 安装/更新输出增加安装模式提示：`symlink` / `junction` / `copy` / `file`
- 新增安装器自动化测试，覆盖 legacy 注入清理、Cursor/Windsurf 规则安装、Windows copy fallback

## [0.5.0] - 2026-05-11

### Added
- 版本日志系统：CHANGELOG.md + `/changelog` 页面，侧边栏增加入口
- 多层级标签树：侧边栏域列表升级为可折叠树状结构，支持 N 层标签
- 域视图增强：父级域显示子域 chip 导航，区分直接/继承节点
- 标签祖先路径索引：parser 自动为每个标签的所有祖先路径建立索引
- LLM skill 更新：ingest skill 增加完整标签层级文档和使用规则
- 搜索升级：评分排序（标题>ID>领域>正文）、元类型/状态筛选器、键盘导航
- 全局图谱可读性：按领域/类型着色切换、类型过滤复选框、hover 高亮邻域淡化无关节点
- 深色模式：CSS 变量主题系统、跟随系统偏好 + 手动切换、9 个组件颜色适配
- 节点图谱渐进探索：局部图谱支持 1-hop/3-hop 切换，展开更多邻居节点
- 涌现视图可操作性：过载节点显示拆分建议、孤岛节点显示关联候选、开放问题关联相关洞见
- 时间线演化叙事：状态徽章、演化连线（splits_into/derived_from）、状态筛选器
- 数据源状态指示：列表显示节点数量和同步时间
- 骨架屏加载：首页在数据源切换时显示骨架屏
- 数据源模态框深色模式适配

## [0.4.0] - 2026-04-29

### Added
- 多数据源管理：支持添加、切换、缓存多个 GitHub/本地数据源
- GitHub 数据源自动同步：保存连接配置，每次打开自动刷新
- 密码保护：middleware 拦截 + 登录页 + cookie 认证

### Fixed
- 登录页独立布局：route group 分离 (auth) 和 (main)
- 部署使用 public npm registry

## [0.3.0] - 2026-03-15

### Added
- 涌现·自进化视图：Hub 节点排名、跨域枢纽、孤儿节点检测
- 时间线视图：按创建/更新时间分组
- 全部节点视图：按类型和状态分组
- HoverPopover：鼠标悬浮节点链接显示预览卡片

## [0.2.0] - 2026-02-20

### Added
- 全局图谱：Cytoscape.js 力导向可视化
- 节点详情页：正文渲染、语义关系面板、局部图谱
- 搜索功能：标题/正文/领域子字符串匹配
- 领域视图：按标签筛选节点

## [0.1.0] - 2026-01-19

### Added
- 项目初始化：Next.js 16 + Tailwind CSS 4
- 节点 schema 设计：5 种元类型、8 种语义关系、5 种生命状态
- Markdown 解析管线：gray-matter + remark/rehype + wikilink 提取
- 首页：最近更新、成长中节点、枢纽入口
- 侧边栏导航与领域列表
