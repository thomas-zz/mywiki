'use client'

import { useState } from 'react'
import { useWikiData, useWikiDataSources } from '@/lib/WikiDataContext'
import { NodeCard, META_TYPE_CONFIG } from '@/components/NodeCard'
import { PageSkeleton } from '@/components/Skeleton'
import type { MetaType } from '@/lib/types'

type ViewMode = 'overview' | 'focus' | 'questions'

const VIEW_MODES: { key: ViewMode; label: string; desc: string }[] = [
  { key: 'overview', label: '全览', desc: '所有动态，当前知识全貌' },
  { key: 'focus',    label: '聚焦', desc: '只看 hub 与跨域核心节点' },
  { key: 'questions', label: '探索', desc: '未解问题与正在生长的节点' },
]

export function HomeView() {
  const data = useWikiData()
  const { refreshing } = useWikiDataSources()
  const { emergence } = data
  const [mode, setMode] = useState<ViewMode>('overview')

  const growing = data.nodes.filter(n => n.status === 'seed' || n.status === 'growing')

  const allSections = {
    overview: [
      { title: '🕒 最近更新', nodes: emergence.recentUpdates, sub: (n: any) => `更新于 ${n.updated}` },
      { title: '🌱 正在生长', nodes: growing.slice(0, 6), sub: (n: any) => n.status === 'seed' ? '种子' : '成长中' },
      { title: '🪐 核心 hub', nodes: emergence.hubs, sub: (n: any) => `← ${n.metrics.in_degree} 入链` },
      { title: '🌐 跨领域节点', nodes: emergence.crossDomainHubs, sub: (n: any) => n.domains.join(' · ') },
      { title: '❓ 开放问题', nodes: emergence.openQuestions, sub: (n: any) => n.body_raw.slice(0, 60).replace(/\n/g, '') },
    ],
    focus: [
      { title: '🪐 核心 hub（最多被引用）', nodes: emergence.hubs, sub: (n: any) => `← ${n.metrics.in_degree} 入链 · ${n.metrics.out_degree} 出链` },
      { title: '🌐 跨领域节点', nodes: emergence.crossDomainHubs, sub: (n: any) => n.domains.join(' · ') },
    ],
    questions: [
      { title: '❓ 开放问题', nodes: emergence.openQuestions, sub: (n: any) => n.body_raw.slice(0, 80).replace(/\n/g, ' ') },
      { title: '🌱 正在生长', nodes: growing.slice(0, 8), sub: (n: any) => n.status === 'seed' ? '🌰 种子' : '🌿 成长中' },
    ],
  }

  const sections = allSections[mode]

  if (data.nodes.length === 0 && refreshing) return <PageSkeleton />

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[22px] font-semibold mt-0 mb-1">欢迎回来</h2>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
            共 {data.nodes.length} 个节点 · {emergence.openQuestions.length} 个开放问题 · {growing.length} 个成长中
          </p>
        </div>

        {/* Persona 视角切换 */}
        <div className="flex items-center gap-1 rounded-lg p-0.5 shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {VIEW_MODES.map(vm => (
            <button
              key={vm.key}
              onClick={() => setMode(vm.key)}
              title={vm.desc}
              className="px-3 py-1 rounded-md text-[12px] font-medium transition-all"
              style={{
                color: mode === vm.key ? 'var(--active-text)' : 'var(--muted)',
                background: mode === vm.key ? 'var(--active-bg)' : 'transparent',
              }}
            >
              {vm.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[12px] mb-6" style={{ color: 'var(--muted)' }}>
        {(Object.entries(META_TYPE_CONFIG) as [MetaType, typeof META_TYPE_CONFIG[MetaType]][]).map(([key, cfg]) => (
          <span key={key} className="inline-flex items-center gap-1">
            <span className="w-2.25 h-2.25 rounded-full inline-block" style={{ background: cfg.color }} />
            {cfg.icon} {cfg.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map(section => (
          section.nodes.length > 0 && (
            <div key={section.title} className="border rounded-[10px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text)' }}>{section.title}</h3>
              <div>
                {section.nodes.map(node => (
                  <NodeCard key={node.id} {...node} subtitle={section.sub(node)} />
                ))}
              </div>
            </div>
          )
        ))}
        {sections.every(s => s.nodes.length === 0) && (
          <div className="col-span-2 py-12 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
            此视角暂无内容
          </div>
        )}
      </div>
    </div>
  )
}
