'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { WikiNode, MetaType, NodeStatus } from '@/lib/types'
import { MetaTypeChip, META_TYPE_CONFIG } from './NodeCard'

function getSnippet(body: string, query: string, around = 30): string | null {
  const lower = body.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return null
  const start = Math.max(0, idx - around)
  const end = Math.min(body.length, idx + query.length + around)
  let snippet = body.slice(start, end).replace(/\n/g, ' ')
  if (start > 0) snippet = '…' + snippet
  if (end < body.length) snippet = snippet + '…'
  return snippet
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        re.test(part)
          ? <mark key={i} className="bg-amber-200 rounded-sm px-px" style={{ color: 'var(--text)' }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

interface ScoredResult {
  node: WikiNode
  snippet: string | null
  score: number
}

const STATUS_LABELS: Record<NodeStatus, string> = {
  seed: '种子', growing: '成长中', mature: '成熟', 'needs-split': '待拆分', archived: '已归档',
}

export function SearchBox({ nodes }: { nodes: WikiNode[] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<ScoredResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [filterType, setFilterType] = useState<MetaType | ''>('')
  const [filterStatus, setFilterStatus] = useState<NodeStatus | ''>('')
  const listRef = useRef<HTMLDivElement>(null)

  const filteredNodes = useMemo(() => {
    let n = nodes
    if (filterType) n = n.filter(node => node.meta_type === filterType)
    if (filterStatus) n = n.filter(node => node.status === filterStatus)
    return n
  }, [nodes, filterType, filterStatus])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      if (filterType || filterStatus) {
        const items: ScoredResult[] = filteredNodes.slice(0, 100).map(node => ({ node, snippet: null, score: 0 }))
        setTotalCount(filteredNodes.length)
        setResults(items)
      } else {
        setResults([])
        setTotalCount(0)
      }
      setActiveIdx(-1)
      return
    }
    const scored: ScoredResult[] = []

    for (const node of filteredNodes) {
      let score = 0
      let snippet: string | null = null

      const titleLower = node.title.toLowerCase()
      if (titleLower === q) score += 100
      else if (titleLower.startsWith(q)) score += 80
      else if (titleLower.includes(q)) score += 60

      if (node.id.toLowerCase().includes(q)) score += 40

      if (node.domains.some(d => d.toLowerCase().includes(q))) score += 30

      if (node.body_raw.toLowerCase().includes(q)) {
        score += 10
        if (!score || score <= 10) snippet = getSnippet(node.body_raw, query)
      }

      if (score > 0) {
        if (!snippet && score <= 40) snippet = getSnippet(node.body_raw, query)
        scored.push({ node, snippet, score })
      }
    }

    scored.sort((a, b) => b.score - a.score)
    setTotalCount(scored.length)
    setResults(scored.slice(0, 100))
    setActiveIdx(-1)
  }, [query, filteredNodes, filterType, filterStatus])

  const handleSelect = useCallback(() => {
    setQuery('')
    setOpen(false)
    setActiveIdx(-1)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = activeIdx >= 0 ? activeIdx : 0
      const link = listRef.current?.querySelector(`[data-idx="${idx}"]`) as HTMLAnchorElement
      link?.click()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [open, results, activeIdx])

  const hasFilters = filterType || filterStatus

  return (
    <div className="relative w-full max-w-[520px]">
      <input
        type="text"
        placeholder="搜索节点..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-200"
        style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
      />

      {open && (query.trim() || hasFilters) && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <div className="sticky top-0 px-3 py-2 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as MetaType | '')}
                className="text-[11px] px-2 py-0.5 rounded border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="">全部类型</option>
                {(Object.entries(META_TYPE_CONFIG) as [MetaType, typeof META_TYPE_CONFIG[MetaType]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as NodeStatus | '')}
                className="text-[11px] px-2 py-0.5 rounded border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="">全部状态</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {query.trim() && (
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                共 {totalCount} 条结果
              </div>
            )}
          </div>

          {results.map(({ node: n, snippet }, idx) => (
            <Link
              key={n.id}
              href={`/node/${n.id}`}
              data-idx={idx}
              className={`block px-3 py-2.5 transition-colors ${idx === activeIdx ? '' : ''}`}
              style={{
                borderBottom: '1px solid var(--border)',
                background: idx === activeIdx ? 'var(--hover)' : undefined,
              }}
              onClick={handleSelect}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              <div className="flex items-center gap-2">
                <MetaTypeChip type={n.meta_type} />
                <span className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text)' }}>
                  <Highlight text={n.title} query={query} />
                </span>
              </div>
              {snippet && (
                <div className="text-[11px] leading-relaxed mt-1 ml-[calc(1.5rem+8px)]" style={{ color: 'var(--muted)' }}>
                  <Highlight text={snippet} query={query} />
                </div>
              )}
            </Link>
          ))}

          {query.trim() && results.length === 0 && (
            <div className="px-3 py-4 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
              未找到匹配结果
            </div>
          )}
        </div>
      )}
    </div>
  )
}
