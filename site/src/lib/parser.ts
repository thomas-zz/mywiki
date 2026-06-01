import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import type { WikiNode, Edge, Emergence, WikiData, MetaType, NodeStatus, InsightOrigin } from './types'

const WIKILINK_RE = /\[\[([a-z0-9-]+)\]\]/g

// ── 文件指纹 & 缓存类型 ──────────────────────────────────────────────────────

interface FileFP { mtime: number; size: number }

interface HtmlCache {
  version: number
  entries: Record<string, { fp: FileFP; html: string }>
}

interface GraphSnapshot {
  version: number
  fingerprints: Record<string, FileFP>   // filename → fp（快照新鲜度校验）
  nodes: WikiNode[]
  edges: Edge[]
}

const CACHE_VERSION = 1

function getCachePaths(wikiRoot: string) {
  const metaDir = path.join(wikiRoot, 'meta')
  return {
    htmlCache: path.join(metaDir, '.parse-cache.json'),
    snapshot:  path.join(metaDir, '.wiki-snapshot.json'),
  }
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

function writeJson(filePath: string, data: unknown): void {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    // 原子写入：先写 .tmp 再 rename，避免写入中断导致 JSON 损坏
    const tmp = filePath + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(data), 'utf-8')
    fs.renameSync(tmp, filePath)
  } catch (e) {
    console.warn('[parser] 写缓存失败:', e)
  }
}

function getFileFP(filePath: string): FileFP {
  const st = fs.statSync(filePath)
  return { mtime: st.mtimeMs, size: st.size }
}

// ── 核心工具函数 ──────────────────────────────────────────────────────────────

function normalizeInsightOrigin(value: unknown): InsightOrigin | undefined {
  if (typeof value !== 'string') return undefined
  const origin = value.toLowerCase() as InsightOrigin
  return origin === 'explicit' || origin === 'inferred' || origin === 'mixed' ? origin : undefined
}

function getWikiDir(): string {
  const envDir = process.env.WIKI_DIR
  if (envDir) {
    const resolved = path.isAbsolute(envDir) ? envDir : path.resolve(envDir)
    return path.join(resolved, 'nodes')
  }
  const homeDir = process.env.HOME || process.env.USERPROFILE || ''
  const defaultDir = path.join(homeDir, 'mywiki', 'nodes')
  if (fs.existsSync(defaultDir)) return defaultDir
  const devDir = path.join(process.cwd(), '..', 'myWiki', 'nodes')
  if (fs.existsSync(devDir)) return devDir
  return defaultDir
}

export function getWikiRootDir(): string {
  return path.dirname(getWikiDir())
}

async function renderMarkdown(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight, { detect: true })
    .use(rehypeSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        code: [...(defaultSchema.attributes?.code || []), ['className']],
        span: [...(defaultSchema.attributes?.span || []), ['className']],
      },
    })
    .use(rehypeStringify)
    .process(content)
  return String(result)
}

function extractWikilinks(content: string, existingRelations: { to: string }[]): { to: string; type: string }[] {
  const existingTargets = new Set(existingRelations.map(r => r.to))
  const implicit: { to: string; type: string }[] = []
  let match
  while ((match = WIKILINK_RE.exec(content)) !== null) {
    if (!existingTargets.has(match[1])) {
      implicit.push({ to: match[1], type: 'related' })
      existingTargets.add(match[1])
    }
  }
  return implicit
}

function computeEmergence(nodes: WikiNode[]): Emergence {
  const sorted = [...nodes].sort((a, b) => (b.metrics.in_degree + b.metrics.out_degree) - (a.metrics.in_degree + a.metrics.out_degree))
  const hubs = sorted.slice(0, 5)
  const crossDomainHubs = nodes.filter(n => n.domains.length >= 2 && n.metrics.in_degree >= 2)
  const overloadCandidates = nodes.filter(n => n.body_raw.length > 2000 && n.metrics.in_degree >= 3)
  const orphans = nodes.filter(n => n.metrics.in_degree === 0 && n.metrics.out_degree === 0)
  const recentUpdates = [...nodes].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5)
  const openQuestions = nodes.filter(n => n.meta_type === 'question')
  return { hubs, crossDomainHubs, overloadCandidates, orphans, recentUpdates, openQuestions }
}

// 从节点数组重建 nodeMap / domainMap（反序列化快照后使用）
function rebuildMaps(nodes: WikiNode[]): Pick<WikiData, 'nodeMap' | 'domainMap'> {
  const nodeMap: Record<string, WikiNode> = {}
  for (const node of nodes) nodeMap[node.id] = node

  const domainMap: Record<string, WikiNode[]> = {}
  for (const node of nodes) {
    for (const domain of node.domains) {
      if (!domainMap[domain]) domainMap[domain] = []
      domainMap[domain].push(node)
      const stripped = domain.startsWith('#') ? domain.slice(1) : domain
      const parts = stripped.split('/')
      for (let i = 1; i < parts.length; i++) {
        const ancestor = `#${parts.slice(0, i).join('/')}`
        if (!domainMap[ancestor]) domainMap[ancestor] = []
        if (!domainMap[ancestor].includes(node)) domainMap[ancestor].push(node)
      }
    }
  }
  return { nodeMap, domainMap }
}

// ── 主构建函数 ────────────────────────────────────────────────────────────────

export async function buildWikiData(): Promise<WikiData> {
  const nodesDir = getWikiDir()
  const wikiRoot = path.dirname(nodesDir)
  const { htmlCache: htmlCachePath, snapshot: snapshotPath } = getCachePaths(wikiRoot)

  // 1. 读取所有 .md 文件列表
  let files: string[] = []
  try {
    files = fs.readdirSync(nodesDir).filter(f => f.endsWith('.md'))
  } catch {
    console.warn(`[buildWikiData] 节点目录不存在: ${nodesDir}，返回空数据`)
    return { nodes: [], edges: [], emergence: computeEmergence([]), nodeMap: {}, domainMap: {} }
  }

  // 2. 计算当前所有文件指纹
  const currentFPs: Record<string, FileFP> = {}
  for (const file of files) {
    currentFPs[file] = getFileFP(path.join(nodesDir, file))
  }

  // 3. 尝试命中快照（P1-6）：所有文件指纹一致 → 直接返回
  const snapshot = readJson<GraphSnapshot>(snapshotPath)
  if (
    snapshot &&
    snapshot.version === CACHE_VERSION &&
    Object.keys(currentFPs).length === Object.keys(snapshot.fingerprints).length &&
    Object.entries(currentFPs).every(([f, fp]) => {
      const cached = snapshot.fingerprints[f]
      return cached && cached.mtime === fp.mtime && cached.size === fp.size
    })
  ) {
    const { nodeMap, domainMap } = rebuildMaps(snapshot.nodes)
    const emergence = computeEmergence(snapshot.nodes)
    return { nodes: snapshot.nodes, edges: snapshot.edges, emergence, nodeMap, domainMap }
  }

  // 4. 加载 HTML 缓存（P1-7）：只跳过未变更文件的 markdown 渲染
  const htmlCache = readJson<HtmlCache>(htmlCachePath)
  const htmlEntries = (htmlCache?.version === CACHE_VERSION ? htmlCache.entries : {}) as HtmlCache['entries']

  // 5. 全量构建（对变更文件重新 parse + render）
  const nodeMap = new Map<string, WikiNode>()
  const newHtmlEntries: HtmlCache['entries'] = {}

  for (const file of files) {
    const filePath = path.join(nodesDir, file)
    const fp = currentFPs[file]
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data: fm, content } = matter(raw)

    // 命中 HTML 缓存则跳过 markdown 渲染
    const cached = htmlEntries[file]
    const bodyHtml = (cached && cached.fp.mtime === fp.mtime && cached.fp.size === fp.size)
      ? cached.html
      : await renderMarkdown(content)

    newHtmlEntries[file] = { fp, html: bodyHtml }

    const implicitRels = extractWikilinks(content, fm.relations || [])

    const node: WikiNode = {
      id: fm.id,
      title: fm.title,
      meta_type: fm.meta_type as MetaType,
      insight_origin: normalizeInsightOrigin(fm.insight_origin),
      domains: fm.domains || [],
      status: fm.status as NodeStatus,
      created: fm.created instanceof Date ? fm.created.toISOString().slice(0, 10) : String(fm.created),
      updated: fm.updated instanceof Date ? fm.updated.toISOString().slice(0, 10) : String(fm.updated),
      wiki: fm.wiki,
      sources: (fm.sources || []).map((s: any) => ({ ...s, date: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : s.date ? String(s.date) : undefined })),
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

  const edges: Edge[] = []
  for (const [id, node] of nodeMap) {
    node.metrics.out_degree = node.relations.length
    for (const rel of node.relations) {
      const target = nodeMap.get(rel.to)
      if (!target) continue
      target.metrics.in_degree++
      target.back_edges.push({ from: id, type: rel.type, note: rel.note })
      edges.push({ source: id, target: rel.to, type: rel.type, note: rel.note })
    }
  }

  const nodes = Array.from(nodeMap.values())
  const emergence = computeEmergence(nodes)
  const { nodeMap: nodeRecord, domainMap } = rebuildMaps(nodes)

  // 6. 持久化更新的 HTML 缓存（P1-7）和图谱快照（P1-6）
  writeJson(htmlCachePath, { version: CACHE_VERSION, entries: newHtmlEntries } satisfies HtmlCache)
  writeJson(snapshotPath, { version: CACHE_VERSION, fingerprints: currentFPs, nodes, edges } satisfies GraphSnapshot)

  return { nodes, edges, emergence, nodeMap: nodeRecord, domainMap }
}
