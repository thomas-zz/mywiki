'use client'

import { useState, useMemo } from 'react'
import { useWikiData } from '@/lib/WikiDataContext'
import { WikiGraph } from '@/components/WikiGraph'
import { META_TYPE_CONFIG } from '@/components/NodeCard'
import type { MetaType } from '@/lib/types'

const DOMAIN_PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#ef4444', '#22d3ee',
]

export function GraphView() {
  const data = useWikiData()
  const [colorBy, setColorBy] = useState<'metaType' | 'domain'>('metaType')
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())

  const visibleTypes = useMemo(() => {
    const all = new Set(Object.keys(META_TYPE_CONFIG))
    for (const t of hiddenTypes) all.delete(t)
    return all
  }, [hiddenTypes])

  const toggleType = (type: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const rootDomains = useMemo(() => {
    const set = new Set<string>()
    for (const n of data.nodes) {
      for (const d of n.domains) {
        set.add(d.split('/')[0])
      }
    }
    return Array.from(set).sort()
  }, [data.nodes])

  return (
    <div className="-mx-4 lg:-mx-[56px] -my-6 lg:-my-8 relative">
      <div className="absolute top-3 right-3 z-10 rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setColorBy('metaType')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${colorBy === 'metaType' ? 'font-medium' : ''}`}
            style={{ color: colorBy === 'metaType' ? 'var(--active-text)' : 'var(--text)', background: colorBy === 'metaType' ? 'var(--active-bg)' : undefined }}
          >
            按类型
          </button>
          <button
            onClick={() => setColorBy('domain')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${colorBy === 'domain' ? 'font-medium' : ''}`}
            style={{ color: colorBy === 'domain' ? 'var(--active-text)' : 'var(--text)', background: colorBy === 'domain' ? 'var(--active-bg)' : undefined }}
          >
            按领域
          </button>
        </div>

        {colorBy === 'metaType' ? (
          <>
            <div className="font-semibold text-[11px] mb-1.5" style={{ color: 'var(--muted)' }}>元类型</div>
            {(Object.entries(META_TYPE_CONFIG) as [MetaType, typeof META_TYPE_CONFIG[MetaType]][]).map(([key, cfg]) => (
              <label key={key} className="flex items-center gap-1.5 my-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hiddenTypes.has(key)}
                  onChange={() => toggleType(key)}
                  className="w-3 h-3 rounded"
                />
                <span className="w-[10px] h-[10px] rounded-full" style={{ background: cfg.color }} />
                <span style={{ color: 'var(--text)' }}>{cfg.icon} {cfg.label}</span>
              </label>
            ))}
          </>
        ) : (
          <>
            <div className="font-semibold text-[11px] mb-1.5" style={{ color: 'var(--muted)' }}>领域</div>
            {rootDomains.map((d, i) => (
              <div key={d} className="flex items-center gap-1.5 my-1">
                <span className="w-[10px] h-[10px] rounded-full" style={{ background: DOMAIN_PALETTE[i % DOMAIN_PALETTE.length] }} />
                <span style={{ color: 'var(--text)' }}>{d}</span>
              </div>
            ))}
          </>
        )}
      </div>
      <WikiGraph
        nodes={data.nodes}
        edges={data.edges}
        mode="global"
        colorBy={colorBy}
        visibleTypes={colorBy === 'metaType' ? visibleTypes : undefined}
      />
    </div>
  )
}
