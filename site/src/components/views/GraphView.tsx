'use client'

import { useState, useMemo } from 'react'
import { useWikiData } from '@/lib/WikiDataContext'
import { WikiGraph } from '@/components/WikiGraph'
import { META_TYPE_CONFIG } from '@/components/NodeCard'
import type { MetaType, WikiNode } from '@/lib/types'

const DOMAIN_PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#ef4444', '#22d3ee',
]

interface PieSlice { color: string; count: number; label: string }

function MiniPieChart({ slices }: { slices: PieSlice[] }) {
  const [hovered, setHovered] = useState<PieSlice | null>(null)
  const total = slices.reduce((s, x) => s + x.count, 0)
  if (total === 0) return null

  const SIZE = 96
  const R = 40
  const CX = 48
  const CY = 48
  const HOLE = 22

  const nonEmpty = slices.filter(s => s.count > 0)
  const isSingle = nonEmpty.length === 1

  let cumAngle = -Math.PI / 2
  const paths: { d: string; slice: PieSlice; pct: number }[] = []

  if (!isSingle) {
    for (const sl of slices) {
      if (sl.count === 0) continue
      const angle = (sl.count / total) * 2 * Math.PI
      const x1 = CX + R * Math.cos(cumAngle)
      const y1 = CY + R * Math.sin(cumAngle)
      const x2 = CX + R * Math.cos(cumAngle + angle)
      const y2 = CY + R * Math.sin(cumAngle + angle)
      const largeArc = angle > Math.PI ? 1 : 0
      paths.push({
        d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        slice: sl,
        pct: Math.round((sl.count / total) * 100),
      })
      cumAngle += angle
    }
  }

  const pct = hovered ? Math.round((hovered.count / total) * 100) : null

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="font-semibold text-[10px] mb-2" style={{ color: 'var(--muted)' }}>分布</div>
      <svg
        width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ display: 'block', margin: '0 auto', cursor: 'default' }}
      >
        {isSingle ? (
          <circle
            cx={CX} cy={CY} r={R}
            fill={nonEmpty[0].color} opacity={0.85}
            onMouseEnter={() => setHovered(nonEmpty[0])}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}
          />
        ) : (
          paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill={p.slice.color}
              opacity={hovered && hovered !== p.slice ? 0.35 : 0.85}
              style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
              onMouseEnter={() => setHovered(p.slice)}
              onMouseLeave={() => setHovered(null)}
            />
          ))
        )}
        <circle cx={CX} cy={CY} r={HOLE} fill="var(--surface)" />
        <text
          x={CX} y={pct !== null ? CY + 2 : CY + 4}
          textAnchor="middle" fontSize="11" fontFamily="sans-serif"
          fill={hovered ? hovered.color : 'var(--muted)'}
          style={{ transition: 'fill 0.12s' }}
        >
          {hovered ? hovered.count : total}
        </text>
        <text
          x={CX} y={CY + 15}
          textAnchor="middle" fontSize="9" fontFamily="sans-serif"
          fill="var(--muted)"
          opacity={pct !== null ? 1 : 0}
          style={{ transition: 'opacity 0.12s' }}
        >
          {pct !== null ? `${pct}%` : '00%'}
        </text>
      </svg>
    </div>
  )
}

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

  const visibleNodes: WikiNode[] = useMemo(() => {
    if (colorBy === 'metaType') {
      return data.nodes.filter(n => visibleTypes.has(n.meta_type))
    }
    return data.nodes
  }, [data.nodes, colorBy, visibleTypes])

  // 各分类计数，O(n) 计算，供图例和饼图使用
  const countByMetaType = useMemo(() => {
    const map: Partial<Record<MetaType, number>> = {}
    for (const n of visibleNodes) map[n.meta_type] = (map[n.meta_type] || 0) + 1
    return map
  }, [visibleNodes])

  const countByDomain = useMemo(() => {
    const map: Record<string, number> = {}
    for (const n of visibleNodes) {
      for (const d of n.domains) {
        const root = d.split('/')[0]
        map[root] = (map[root] || 0) + 1
      }
    }
    return map
  }, [visibleNodes])

  const pieSlices = useMemo(() => {
    if (colorBy === 'metaType') {
      return (Object.entries(META_TYPE_CONFIG) as [MetaType, typeof META_TYPE_CONFIG[MetaType]][]).map(([key, cfg]) => ({
        color: cfg.color,
        label: cfg.label,
        count: countByMetaType[key] ?? 0,
      }))
    } else {
      return rootDomains.map((d, i) => ({
        color: DOMAIN_PALETTE[i % DOMAIN_PALETTE.length],
        label: d,
        count: countByDomain[d] ?? 0,
      }))
    }
  }, [colorBy, countByMetaType, countByDomain, rootDomains])

  return (
    <div className="-mx-4 lg:-mx-14 -my-6 lg:-my-8 relative">
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
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                <span style={{ color: 'var(--text)' }}>{cfg.icon} {cfg.label}</span>
                <span className="ml-auto pl-2 tabular-nums" style={{ color: 'var(--muted)' }}>
                  {countByMetaType[key] ?? 0}
                </span>
              </label>
            ))}
          </>
        ) : (
          <>
            <div className="font-semibold text-[11px] mb-1.5" style={{ color: 'var(--muted)' }}>领域</div>
            {rootDomains.map((d, i) => (
              <div key={d} className="flex items-center gap-1.5 my-1">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DOMAIN_PALETTE[i % DOMAIN_PALETTE.length] }} />
                <span style={{ color: 'var(--text)' }}>{d}</span>
                <span className="ml-auto pl-2 tabular-nums" style={{ color: 'var(--muted)' }}>
                  {countByDomain[d] ?? 0}
                </span>
              </div>
            ))}
          </>
        )}

        <MiniPieChart slices={pieSlices} />
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
