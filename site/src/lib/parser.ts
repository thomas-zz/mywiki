import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeHighlight from 'rehype-highlight'
import type { WikiNode, Edge, Emergence, WikiData, MetaType, NodeStatus, InsightOrigin } from './types'

const WIKILINK_RE = /\[\[([a-z0-9-]+)\]\]/g

function normalizeInsightOrigin(value: unknown): InsightOrigin | undefined {
  if (typeof value !== 'string') return undefined
  const origin = value.toLowerCase() as InsightOrigin
  return origin === 'explicit' || origin === 'inferred' || origin === 'mixed' ? origin : undefined
}

function getWikiDir(): string {
  const envDir = process.env.WIKI_DIR
  if (envDir) {
    const resolved = path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), '..', envDir)
    return path.join(resolved, 'nodes')
  }
  return path.join(process.cwd(), '..', 'myWiki', 'nodes')
}

async function renderMarkdown(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight, { detect: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
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

export async function buildWikiData(): Promise<WikiData> {
  const nodesDir = getWikiDir()

  let files: string[] = []
  try {
    files = fs.readdirSync(nodesDir).filter(f => f.endsWith('.md'))
  } catch {
    console.warn(`[buildWikiData] 节点目录不存在: ${nodesDir}，返回空数据`)
    return { nodes: [], edges: [], emergence: computeEmergence([]), nodeMap: {}, domainMap: {} }
  }
  const nodeMap = new Map<string, WikiNode>()

  for (const file of files) {
    const raw = fs.readFileSync(path.join(nodesDir, file), 'utf-8')
    const { data: fm, content } = matter(raw)

    const bodyHtml = await renderMarkdown(content)
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
      if (!target) { continue }
      target.metrics.in_degree++
      target.back_edges.push({ from: id, type: rel.type, note: rel.note })
      edges.push({ source: id, target: rel.to, type: rel.type, note: rel.note })
    }
  }

  const nodes = Array.from(nodeMap.values())
  const emergence = computeEmergence(nodes)

  const domainMap: Record<string, WikiNode[]> = {}
  for (const node of nodes) {
    for (const domain of node.domains) {
      if (!domainMap[domain]) domainMap[domain] = []
      domainMap[domain].push(node)
    }
  }

  const nodeRecord: Record<string, WikiNode> = {}
  for (const node of nodes) nodeRecord[node.id] = node

  return { nodes, edges, emergence, nodeMap: nodeRecord, domainMap }
}
