'use client'

import { useState, useMemo } from 'react'
import { useWikiData } from '@/lib/WikiDataContext'
import { NodeCard } from '@/components/NodeCard'

type SortField = 'updated' | 'created'

export function TimelineView() {
  const data = useWikiData()
  const [sortBy, setSortBy] = useState<SortField>('updated')

  const grouped = useMemo(() => {
    const sorted = [...data.nodes].sort((a, b) => {
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
  }, [data.nodes, sortBy])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[22px] font-semibold m-0">时间线</h2>
        <div className="flex items-center gap-2 text-[13px]">
          <button
            onClick={() => setSortBy('updated')}
            className={`px-2.5 py-1 rounded-md border transition-colors ${sortBy === 'updated' ? '!bg-amber-100 border-amber-300' : 'hover:bg-stone-50'}`}
            style={{ borderColor: sortBy === 'updated' ? undefined : 'var(--border)' }}
          >
            按更新
          </button>
          <button
            onClick={() => setSortBy('created')}
            className={`px-2.5 py-1 rounded-md border transition-colors ${sortBy === 'created' ? '!bg-amber-100 border-amber-300' : 'hover:bg-stone-50'}`}
            style={{ borderColor: sortBy === 'created' ? undefined : 'var(--border)' }}
          >
            按创建
          </button>
        </div>
      </div>

      <div className="relative pl-6">
        <div className="absolute left-[9px] top-0 bottom-0 w-px bg-gray-200" />

        {grouped.map(group => (
          <div key={group.date} className="mb-6 relative">
            <div className="absolute left-[-15px] top-[6px] w-[12px] h-[12px] rounded-full bg-amber-400 border-2 border-white shadow-sm" />
            <div className="text-[13px] font-medium text-gray-500 mb-2">{group.date}</div>
            <div className="bg-white border rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
              {group.nodes.map(node => (
                <NodeCard
                  key={node.id}
                  {...node}
                  subtitle={sortBy === 'updated' ? `创建于 ${node.created}` : `更新于 ${node.updated}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
