'use client'

import { useState, useCallback } from 'react'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
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

function parseFrontmatter(text: string): { data: Record<string, any>; content: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { data: {}, content: text }
  const yaml = match[1]
  const content = match[2]
  const data: Record<string, any> = {}
  const lines = yaml.split('\n')

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

export function FolderPicker({ onDataLoaded }: { onDataLoaded: (data: WikiData, folderName: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [stats, setStats] = useState<{ total: number; parsed: number; failed: string[] } | null>(null)
  const [progress, setProgress] = useState('')

  const pickFolderFromHandle = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
    setLoading(true)
    setError(null)
    setStats(null)
    setFolderName(dirHandle.name)
    setProgress('扫描文件...')

    let nodesDir: FileSystemDirectoryHandle | null = null
    try {
      nodesDir = await dirHandle.getDirectoryHandle('nodes')
    } catch {
      nodesDir = dirHandle
    }

    const nodeMap = new Map<string, WikiNode>()
    const failedFiles: string[] = []
    let fileCount = 0

    for await (const entry of (nodesDir as any).values()) {
      if (entry.kind !== 'file' || !entry.name.endsWith('.md')) continue
      fileCount++
      setProgress(`解析 ${entry.name}...（${nodeMap.size + failedFiles.length}/${fileCount}）`)
      try {
        const file = await entry.getFile()
        const text = await file.text()
        const { data: fm, content } = parseFrontmatter(text)

        if (!fm.id && !fm.title) {
          failedFiles.push(`${entry.name}（缺少 id 和 title）`)
          continue
        }

        const node: WikiNode = {
          id: fm.id || entry.name.replace('.md', ''),
          title: fm.title || entry.name.replace('.md', ''),
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
          body_html: markedInstance.parse(content, { async: false }) as string,
          metrics: { in_degree: 0, out_degree: 0 },
          back_edges: [],
        }
        nodeMap.set(node.id, node)
      } catch (e: any) {
        failedFiles.push(`${entry.name}（${e.message || '解析错误'}）`)
      }
    }

    if (nodeMap.size === 0) {
      setError(`未找到有效节点。扫描了 ${fileCount} 个 .md 文件${failedFiles.length ? `，${failedFiles.length} 个解析失败` : ''}`)
      setLoading(false)
      setProgress('')
      return
    }

    setProgress('构建关系图谱...')

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
      }
    }

    const nodeRecord: Record<string, WikiNode> = {}
    for (const node of nodes) nodeRecord[node.id] = node

    onDataLoaded({ nodes, edges, emergence, nodeMap: nodeRecord, domainMap }, dirHandle.name)
    setStats({ total: fileCount, parsed: nodeMap.size, failed: failedFiles })
    setLoading(false)
    setProgress('')
  }, [onDataLoaded])

  const pickFolder = useCallback(async () => {
    try {
      // @ts-expect-error File System Access API
      const dirHandle = await window.showDirectoryPicker()
      pickFolderFromHandle(dirHandle)
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setError(e.message || '读取失败')
    }
  }, [pickFolderFromHandle])

  return (
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={pickFolder}
        disabled={loading}
        className="px-3 py-1.5 text-[13px] rounded-md border transition-colors hover:bg-stone-50 whitespace-nowrap"
        style={{ borderColor: 'var(--border)' }}
      >
        {loading ? '📂 解析中...' : '📂 选择文件夹'}
      </button>
      {loading && progress && <span className="text-[12px] text-blue-600 animate-pulse">{progress}</span>}
      {!loading && folderName && stats && (
        <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
          {folderName}/ · {stats.parsed} 个节点
          {stats.failed.length > 0 && <span className="text-amber-600"> · {stats.failed.length} 个失败</span>}
        </span>
      )}
      {error && <span className="text-[12px] text-red-500">{error}</span>}
    </div>
  )
}
