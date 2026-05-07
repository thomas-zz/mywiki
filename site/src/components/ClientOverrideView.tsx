'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWikiDataOverride } from '@/lib/WikiDataContext'
import { NodeCard, META_TYPE_CONFIG, MetaTypeChip, StatusBadge } from './NodeCard'
import { RelationPanel } from './RelationPanel'
import { LocalGraph } from './LocalGraph'
import type { MetaType, WikiNode } from '@/lib/types'

export function ClientOverrideView({ children }: { children: React.ReactNode }) {
  const { overrideData, cacheLoaded } = useWikiDataOverride()
  const [viewNodeId, setViewNodeId] = useState<string | null>(null)

  const navigate = useCallback((nodeId: string) => setViewNodeId(nodeId), [])

  useEffect(() => {
    const handler = (e: Event) => navigate((e as CustomEvent).detail.nodeId)
    window.addEventListener('mywiki:navigate', handler)
    return () => window.removeEventListener('mywiki:navigate', handler)
  }, [navigate])

  const interceptClick = useCallback((e: React.MouseEvent) => {
    if (!overrideData) return
    const link = (e.target as HTMLElement).closest('[data-nodeid]')
    if (link) {
      e.preventDefault()
      e.stopPropagation()
      navigate(link.getAttribute('data-nodeid')!)
    }
  }, [overrideData, navigate])

  if (!overrideData) return <>{children}</>
  if (!cacheLoaded) return <div className="text-[13px] p-8" style={{ color: 'var(--muted)' }}>加载缓存...</div>

  if (viewNodeId) {
    const node = overrideData.nodeMap[viewNodeId]
    if (node) return (
      <div onClickCapture={interceptClick}>
        <NodeDetailView node={node} onBack={() => setViewNodeId(null)} onNavigate={navigate} />
      </div>
    )
  }

  return (
    <div onClickCapture={interceptClick}>
      <OverrideHomeView onNavigate={navigate} />
    </div>
  )
}

function OverrideHomeView({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { overrideData } = useWikiDataOverride()
  if (!overrideData) return null
  const { nodes, emergence, domainMap } = overrideData
  const growing = nodes.filter(n => n.status === 'seed' || n.status === 'growing')

  const sections = [
    { title: '🕒 最近更新', nodes: emergence.recentUpdates, sub: (n: WikiNode) => `更新于 ${n.updated}` },
    { title: '🌱 正在生长', nodes: growing.slice(0, 8), sub: (n: WikiNode) => n.status === 'seed' ? '种子' : '成长中' },
    { title: '🪐 入口 hub', nodes: emergence.hubs, sub: (n: WikiNode) => `← ${n.metrics.in_degree} 入链` },
    { title: '🌐 跨领域', nodes: emergence.crossDomainHubs, sub: (n: WikiNode) => n.domains.join(' · ') },
    { title: '❓ 开放问题', nodes: emergence.openQuestions, sub: (n: WikiNode) => n.body_raw.slice(0, 60).replace(/\n/g, '') },
  ]

  return (
    <div>
      <div className="mb-4 p-3 rounded-lg text-[13px]" style={{ background: 'var(--tag-bg)', border: '1px solid var(--border)' }}>
        📂 已加载本地文件夹 · {nodes.length} 个节点 · {Object.keys(domainMap).length} 个领域
      </div>

      <h2 className="text-[22px] font-semibold mt-0 mb-2">文件夹分析</h2>

      <div className="flex flex-wrap gap-2 text-[12px] mb-6" style={{ color: 'var(--muted)' }}>
        {(Object.entries(META_TYPE_CONFIG) as [MetaType, typeof META_TYPE_CONFIG[MetaType]][]).map(([key, cfg]) => (
          <span key={key} className="inline-flex items-center gap-1">
            <span className="w-[9px] h-[9px] rounded-full inline-block" style={{ background: cfg.color }} />
            {cfg.icon} {cfg.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map(section => (
          section.nodes.length > 0 && (
            <div key={section.title} className="bg-white border rounded-[10px] p-5" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-[13px] font-semibold mb-3 text-gray-800">{section.title}</h3>
              <div>{section.nodes.map(node => <NodeCard key={node.id} {...node} subtitle={section.sub(node)} />)}</div>
            </div>
          )
        ))}
      </div>

      {emergence.orphans.length > 0 && (
        <div className="mt-6 bg-white border rounded-[10px] p-5" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-[13px] font-semibold mb-3">🏝 孤岛节点</h3>
          <div>{emergence.orphans.map(n => <NodeCard key={n.id} {...n} subtitle="未连接" />)}</div>
        </div>
      )}

      <div className="mt-6 bg-white border rounded-[10px] p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-[13px] font-semibold mb-3">全部节点（{nodes.length}）</h3>
        <div>{nodes.map(n => <NodeCard key={n.id} {...n} />)}</div>
      </div>
    </div>
  )
}

function NodeDetailView({ node, onBack, onNavigate }: { node: WikiNode; onBack: () => void; onNavigate: (id: string) => void }) {
  const { overrideData } = useWikiDataOverride()
  if (!overrideData) return null

  const bodyHtml = node.body_raw
    .replace(/\[\[([a-z0-9-]+)\]\]/g, (_, linkId) => {
      const target = overrideData.nodeMap[linkId]
      return target ? `<a href="#" data-nodeid="${linkId}" class="wiki-link">${target.title}</a>` : `[[${linkId}]]`
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')

  const handleClick = (e: React.MouseEvent) => {
    const link = (e.target as HTMLElement).closest('[data-nodeid]')
    if (link) { e.preventDefault(); onNavigate(link.getAttribute('data-nodeid')!) }
  }

  return (
    <div onClick={handleClick}>
      <div className="mb-4">
        <button onClick={(e) => { e.stopPropagation(); onBack() }} className="text-[13px] px-2.5 py-1 rounded-md border hover:bg-stone-50" style={{ borderColor: 'var(--border)' }}>
          ← 返回
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <MetaTypeChip type={node.meta_type} />
          <StatusBadge status={node.status} />
          <span className="text-[12px]" style={{ color: 'var(--muted)' }}>入链 {node.metrics.in_degree} · 出链 {node.metrics.out_degree}</span>
        </div>
        <h1 className="text-[24px] font-bold text-gray-900 mb-2">{node.title}</h1>
        <div className="flex flex-wrap gap-2 mb-1">
          {node.domains.map(d => <span key={d} className="text-[13px] text-blue-600">{d}</span>)}
        </div>
        <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
          创建 {node.created} · 更新 {node.updated}
          {node.wiki && <span> · {node.wiki}</span>}
        </div>
      </div>

      <div className="wiki-body text-gray-800 mb-8" dangerouslySetInnerHTML={{ __html: `<p>${bodyHtml}</p>` }} />

      {(node.relations.length > 0 || node.back_edges.length > 0) && (
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--muted)' }}>关系</h2>
          <RelationPanel relations={node.relations} backEdges={node.back_edges} nodeMap={overrideData.nodeMap} />
        </div>
      )}

      <div>
        <h2 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--muted)' }}>局部图谱</h2>
        <LocalGraph centerId={node.id} nodes={overrideData.nodes} edges={overrideData.edges} />
      </div>
    </div>
  )
}
