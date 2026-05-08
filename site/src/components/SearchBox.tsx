'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { WikiNode } from '@/lib/types'
import { MetaTypeChip } from './NodeCard'

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
          ? <mark key={i} className="bg-amber-200 text-gray-900 rounded-sm px-px">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

interface SearchResult {
  node: WikiNode
  snippet: string | null
}

export function SearchBox({ nodes }: { nodes: WikiNode[] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setTotalCount(0); return }
    const q = query.toLowerCase()
    const matched = nodes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.id.includes(q) ||
      n.domains.some(d => d.toLowerCase().includes(q)) ||
      n.body_raw.toLowerCase().includes(q)
    )

    setTotalCount(matched.length)
    setResults(matched.slice(0, 200).map(node => {
      const titleMatch = node.title.toLowerCase().includes(q)
      const snippet = titleMatch ? null : getSnippet(node.body_raw, query)
      return { node, snippet }
    }))
  }, [query, nodes])

  const handleSelect = () => {
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative w-full max-w-[520px]">
      <input
        type="text"
        placeholder="搜索节点..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full px-3 py-2 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-200"
        style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
      />
      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          style={{ border: '1px solid var(--border)' }}
        >
          <div className="sticky top-0 bg-white px-3 py-1.5 text-[11px] border-b" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
            共 {totalCount > 200 ? '200+' : totalCount} 条结果
          </div>
          {results.map(({ node: n, snippet }) => (
            <Link
              key={n.id}
              href={`/node/${n.id}`}
              className="block px-3 py-2.5 hover:bg-stone-50 transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
              onClick={handleSelect}
            >
              <div className="flex items-center gap-2">
                <MetaTypeChip type={n.meta_type} />
                <span className="text-[13px] font-medium text-gray-900 leading-snug">
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
        </div>
      )}
    </div>
  )
}
