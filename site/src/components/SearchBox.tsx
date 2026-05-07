'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { WikiNode } from '@/lib/types'
import { MetaTypeChip } from './NodeCard'
import { useWikiDataOverride } from '@/lib/WikiDataContext'

export function SearchBox({ nodes }: { nodes: WikiNode[] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { overrideData, navigateTo } = useWikiDataOverride()

  const searchNodes = overrideData ? overrideData.nodes : nodes

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return searchNodes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.id.includes(q) ||
      n.domains.some(d => d.toLowerCase().includes(q)) ||
      n.body_raw.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [query, searchNodes])

  const handleSelect = (nodeId: string) => {
    setQuery('')
    setOpen(false)
    if (overrideData) {
      navigateTo(`/node/${nodeId}`)
    }
  }

  return (
    <div className="relative max-w-[400px]">
      <input
        type="text"
        placeholder="搜索节点..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full px-2.5 py-[7px] rounded-md text-[13px] focus:outline-none"
        style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto" style={{ border: '1px solid var(--border)' }}>
          {results.map(n => overrideData ? (
            <a
              key={n.id}
              href={`/node/${n.id}`}
              className="flex items-center gap-2 px-3 py-2 hover:!bg-stone-50 border-b last:border-0 text-[13px]"
              style={{ borderColor: 'var(--border)', borderBottom: 'none' }}
              onClick={(e) => { e.preventDefault(); handleSelect(n.id) }}
            >
              <MetaTypeChip type={n.meta_type} />
              <span className="text-gray-900">{n.title}</span>
            </a>
          ) : (
            <Link
              key={n.id}
              href={`/node/${n.id}`}
              className="flex items-center gap-2 px-3 py-2 hover:!bg-stone-50 border-b last:border-0 text-[13px]"
              style={{ borderColor: 'var(--border)', borderBottom: 'none' }}
              onClick={() => handleSelect(n.id)}
            >
              <MetaTypeChip type={n.meta_type} />
              <span className="text-gray-900">{n.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
