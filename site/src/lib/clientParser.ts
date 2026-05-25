'use client'

import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import type { WikiNode, WikiData, Edge, Emergence, MetaType, NodeStatus, InsightOrigin } from '@/lib/types'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)

const markedInstance = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      return hljs.highlightAuto(code).value
    },
  })
)

export function parseFrontmatter(text: string): { data: Record<string, any>; content: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { data: {}, content: text }
  const yamlStr = match[1]
  const content = match[2]
  const data: Record<string, any> = {}
  const lines = yamlStr.split('\n')

  let currentKey = ''
  let inArray = false
  let arrayItems: any[] = []
  let currentObj: Record<string, string> | null = null
  let arrayItemIndent = 0

  function flushObj() {
    if (currentObj) { arrayItems.push(currentObj); currentObj = null }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (inArray) {
      const dashMatch = line.match(/^(\s+)-\s+(.*)/)
      const contMatch = line.match(/^(\s+)([a-z_]+):\s*(.*)$/)

      if (dashMatch) {
        flushObj()
        arrayItemIndent = dashMatch[1].length
        const val = dashMatch[2].trim()
        if (val.startsWith('{')) {
          try { arrayItems.push(JSON.parse(val.replace(/'/g, '"'))) } catch { arrayItems.push(val) }
        } else if (val.includes(':')) {
          currentObj = {}
          const [k, ...v] = val.split(':')
          if (k && v.length) currentObj[k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '')
        } else {
          arrayItems.push(val.replace(/^["']|["']$/g, ''))
        }
        continue
      } else if (contMatch && contMatch[1].length > arrayItemIndent && currentObj) {
        const k = contMatch[2]
        const v = contMatch[3].trim().replace(/^["']|["']$/g, '')
        currentObj[k] = v
        continue
      } else {
        flushObj()
        data[currentKey] = arrayItems
        inArray = false
        arrayItems = []
      }
    }

    const kvMatch = line.match(/^([a-z_]+):\s*(.*)$/)
    if (kvMatch) {
      currentKey = kvMatch[1]
      const val = kvMatch[2].trim()
      if (val === '' || val === '[]') {
        if (val === '[]') { data[currentKey] = []; continue }
        inArray = true
        arrayItems = []
      } else if (val.startsWith('[')) {
        try { data[currentKey] = JSON.parse(val.replace(/'/g, '"')) } catch { data[currentKey] = val }
      } else {
        data[currentKey] = val.replace(/^["']|["']$/g, '')
      }
    }
  }
  if (inArray) { flushObj(); data[currentKey] = arrayItems }

  return { data, content }
}

function normalizeInsightOrigin(value: unknown): InsightOrigin | undefined {
  if (typeof value !== 'string') return undefined
  const origin = value.toLowerCase() as InsightOrigin
  return origin === 'explicit' || origin === 'inferred' || origin === 'mixed' ? origin : undefined
}

export function parseMarkdownToNode(fileName: string, text: string): WikiNode | null {
  const { data: fm, content } = parseFrontmatter(text)
  if (!fm.id && !fm.title) return null

  return {
    id: fm.id || fileName.replace('.md', ''),
    title: fm.title || fileName.replace('.md', ''),
    meta_type: (fm.meta_type || 'insight') as MetaType,
    insight_origin: normalizeInsightOrigin(fm.insight_origin),
    domains: fm.domains || [],
    status: (fm.status || 'seed') as NodeStatus,
    created: String(fm.created || ''),
    updated: String(fm.updated || ''),
    wiki: fm.wiki,
    sources: fm.sources || [],
    relations: fm.relations || [],
    derived_from: fm.derived_from || [],
    splits_into: fm.splits_into || [],
    body_raw: content,
    body_html: DOMPurify.sanitize(markedInstance.parse(content, { async: false }) as string),
    metrics: { in_degree: 0, out_degree: 0 },
    back_edges: [],
  }
}

export function buildWikiDataFromNodes(nodeMap: Map<string, WikiNode>): WikiData {
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
  const sorted = [...nodes].sort((a, b) => (b.metrics.in_degree + b.metrics.out_degree) - (a.metrics.in_degree + a.metrics.out_degree))
  const emergence: Emergence = {
    hubs: sorted.slice(0, 5),
    crossDomainHubs: nodes.filter(n => n.domains.length >= 2 && n.metrics.in_degree >= 2),
    overloadCandidates: nodes.filter(n => n.body_raw.length > 2000 && n.metrics.in_degree >= 3),
    orphans: nodes.filter(n => n.metrics.in_degree === 0 && n.metrics.out_degree === 0),
    recentUpdates: [...nodes].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5),
    openQuestions: nodes.filter(n => n.meta_type === 'question'),
  }

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

  const nodeRecord: Record<string, WikiNode> = {}
  for (const node of nodes) nodeRecord[node.id] = node

  return { nodes, edges, emergence, nodeMap: nodeRecord, domainMap }
}
