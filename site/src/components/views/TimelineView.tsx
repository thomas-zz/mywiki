'use client'

import { useState, useMemo } from 'react'
import { useWikiData } from '@/lib/WikiDataContext'
import { NodeCard, StatusBadge } from '@/components/NodeCard'
import Link from 'next/link'
import type { NodeStatus, WikiNode } from '@/lib/types'

type SortField = 'updated' | 'created'

const STATUS_OPTIONS: { value: NodeStatus; label: string }[] = [
  { value: 'seed', label: '种子' },
  { value: 'growing', label: '成长中' },
  { value: 'mature', label: '成熟' },
  { value: 'needs-split', label: '待拆分' },
  { value: 'archived', label: '已归档' },
]

export function TimelineView() {
  const data = useWikiData()
  const [sortBy, setSortBy] = useState<SortField>('updated')
  const [statusFilter, setStatusFilter] = useState<Set<NodeStatus>>(new Set())

  const toggleStatus = (s: NodeStatus) => {
    setStatusFilter(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const evolutionMap = useMemo(() => {
    const map = new Map<string, { derivedFrom: WikiNode[]; splitsInto: WikiNode[] }>()
    for (const node of data.nodes) {
      const entry = { derivedFrom: [] as WikiNode[], splitsInto: [] as WikiNode[] }
      for (const id of node.derived_from) {
        const src = data.nodeMap[id]
        if (src) entry.derivedFrom.push(src)
      }
      for (const id of node.splits_into) {
        const tgt = data.nodeMap[id]
        if (tgt) entry.splitsInto.push(tgt)
      }
      if (entry.derivedFrom.length || entry.splitsInto.length) map.set(node.id, entry)
    }
    return map
  }, [data.nodes, data.nodeMap])

  const grouped = useMemo(() => {
    let filtered = data.nodes
    if (statusFilter.size > 0) filtered = filtered.filter(n => statusFilter.has(n.status))

    const sorted = [...filtered].sort((a, b) => {
      const aVal = sortBy === 'updated' ? a.updated : a.created
      const bVal = sortBy === 'updated' ? b.updated : b.created
      return bVal.localeCompare(aVal)
    })

    const groups: { date: string; nodes: typeof sorted }[] = []
    for (const node of sorted) {
      const date = sortBy === 'updated' ? node.updated : node.created
      const last = groups[groups.length - 1]
      if (last && last.date === date) {
        last.nodes.push(node)
      } else {
        groups.push({ date, nodes: [node] })
      }
    }
    return groups
  }, [data.nodes, sortBy, statusFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[22px] font-semibold m-0">时间线</h2>
        <div className="flex items-center gap-2 text-[13px]">
          <button
            onClick={() => setSortBy('updated')}
            className={`px-2.5 py-1 rounded-md border transition-colors ${sortBy === 'updated' ? '' : 'hover:bg-[var(--hover)]'}`}
            style={{
              borderColor: sortBy === 'updated' ? 'var(--active-bg)' : 'var(--border)',
              background: sortBy === 'updated' ? 'var(--active-bg)' : undefined,
              color: sortBy === 'updated' ? 'var(--active-text)' : 'var(--text)',
            }}
          >
            按更新
          </button>
          <button
            onClick={() => setSortBy('created')}
            className={`px-2.5 py-1 rounded-md border transition-colors ${sortBy === 'created' ? '' : 'hover:bg-[var(--hover)]'}`}
            style={{
              borderColor: sortBy === 'created' ? 'var(--active-bg)' : 'var(--border)',
              background: sortBy === 'created' ? 'var(--active-bg)' : undefined,
              color: sortBy === 'created' ? 'var(--active-text)' : 'var(--text)',
            }}
          >
            按创建
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => toggleStatus(s.value)}
            className="px-2 py-0.5 rounded-full text-[11px] border transition-colors"
            style={{
              borderColor: statusFilter.has(s.value) ? 'var(--active-bg)' : 'var(--border)',
              background: statusFilter.has(s.value) ? 'var(--active-bg)' : undefined,
              color: statusFilter.has(s.value) ? 'var(--active-text)' : 'var(--text)',
            }}
          >
            {s.label}
          </button>
        ))}
        {statusFilter.size > 0 && (
          <button
            onClick={() => setStatusFilter(new Set())}
            className="px-2 py-0.5 rounded-full text-[11px]"
            style={{ color: 'var(--muted)' }}
          >
            清除筛选
          </button>
        )}
      </div>

      <div className="relative pl-6">
        <div className="absolute left-[9px] top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />

        {grouped.map(group => (
          <div key={group.date} className="mb-6 relative">
            <div className="absolute left-[-15px] top-[6px] w-[12px] h-[12px] rounded-full bg-amber-400 border-2 shadow-sm" style={{ borderColor: 'var(--surface)' }} />
            <div className="text-[13px] font-medium mb-2" style={{ color: 'var(--muted)' }}>{group.date}</div>
            <div className="border rounded-lg p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              {group.nodes.map(node => {
                const evo = evolutionMap.get(node.id)
                return (
                  <div key={node.id}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <NodeCard
                          {...node}
                          subtitle={sortBy === 'updated' ? `创建于 ${node.created}` : `更新于 ${node.updated}`}
                        />
                      </div>
                      <StatusBadge status={node.status} />
                    </div>
                    {evo && (
                      <div className="ml-6 mb-1 text-[11px] flex flex-wrap gap-x-3" style={{ color: 'var(--muted)' }}>
                        {evo.derivedFrom.map(src => (
                          <span key={src.id}>↑ 演化自 <Link href={`/node/${src.id}`} className="underline" style={{ color: 'var(--accent)' }}>{src.title}</Link></span>
                        ))}
                        {evo.splitsInto.map(tgt => (
                          <span key={tgt.id}>↓ 拆分为 <Link href={`/node/${tgt.id}`} className="underline" style={{ color: 'var(--accent)' }}>{tgt.title}</Link></span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
