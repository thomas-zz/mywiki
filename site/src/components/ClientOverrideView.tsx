'use client'

import { useEffect, useCallback } from 'react'
import { useWikiDataOverride } from '@/lib/WikiDataContext'
import { NodeCard, META_TYPE_CONFIG, MetaTypeChip, StatusBadge, InsightOriginChip } from './NodeCard'
import { RelationPanel } from './RelationPanel'
import { LocalGraph } from './LocalGraph'
import { GlobalGraph } from './GlobalGraph'
import type { MetaType, WikiNode, NodeStatus, WikiData } from '@/lib/types'

function slugToDomainClient(slug: string): string {
  const base64 = slug.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(escape(atob(base64)))
}

export function ClientOverrideView({ children }: { children: React.ReactNode }) {
  const { overrideData, cacheLoaded, clientPath, navigateTo } = useWikiDataOverride()

  useEffect(() => {
    const handler = (e: Event) => navigateTo(`/node/${(e as CustomEvent).detail.nodeId}`)
    window.addEventListener('mywiki:navigate', handler)
    return () => window.removeEventListener('mywiki:navigate', handler)
  }, [navigateTo])

  const interceptClick = useCallback((e: React.MouseEvent) => {
    if (!overrideData) return
    const link = (e.target as HTMLElement).closest('[data-nodeid]')
    if (link) {
      e.preventDefault()
      e.stopPropagation()
      navigateTo(`/node/${link.getAttribute('data-nodeid')!}`)
    }
  }, [overrideData, navigateTo])

  if (!overrideData) return <>{children}</>
  if (!cacheLoaded) return <div className="text-[13px] p-8" style={{ color: 'var(--muted)' }}>加载缓存...</div>

  const view = getViewForPathname(clientPath, overrideData, navigateTo)

  return (
    <div onClickCapture={interceptClick}>
      {view}
    </div>
  )
}

function getViewForPathname(pathname: string, data: WikiData, navigateTo: (path: string) => void) {
  if (pathname === '/graph') {
    return <OverrideGraphView data={data} />
  }
  if (pathname === '/emergence') {
    return <OverrideEmergenceView data={data} />
  }
  if (pathname === '/all') {
    return <OverrideAllNodesView data={data} />
  }
  if (pathname.startsWith('/node/')) {
    const nodeId = pathname.replace('/node/', '')
    const node = data.nodeMap[nodeId]
    if (node) return <NodeDetailView node={node} onBack={() => window.history.back()} onNavigate={(id) => navigateTo(`/node/${id}`)} />
  }
  if (pathname.startsWith('/domain/')) {
    const slug = pathname.replace('/domain/', '')
    return <OverrideDomainView data={data} slug={slug} />
  }
  return <OverrideHomeView />
}

function OverrideGraphView({ data }: { data: WikiData }) {
  return (
    <div className="-mx-4 lg:-mx-[56px] -my-6 lg:-my-8 relative">
      <div className="absolute top-3 right-3 z-10 bg-white border rounded-lg px-3 py-2 text-[12px]" style={{ borderColor: 'var(--border)' }}>
        <div className="font-semibold text-[11px] mb-1.5">元类型</div>
        {(Object.entries(META_TYPE_CONFIG) as [MetaType, typeof META_TYPE_CONFIG[MetaType]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 my-1">
            <span className="w-[10px] h-[10px] rounded-full" style={{ background: cfg.color }} />
            <span>{cfg.icon} {cfg.label}</span>
          </div>
        ))}
      </div>
      <GlobalGraph nodes={data.nodes} edges={data.edges} />
    </div>
  )
}

function OverrideEmergenceView({ data }: { data: WikiData }) {
  const { emergence } = data
  const sections = [
    { title: '🪐 hub 节点（按入链）', nodes: emergence.hubs, sub: (n: WikiNode) => `← ${n.metrics.in_degree} 入链` },
    { title: '🌐 跨域 hub（连接不同领域）', nodes: emergence.crossDomainHubs, sub: (n: WikiNode) => n.domains.join(' + ') },
    { title: '❓ 开放问题积压', nodes: emergence.openQuestions, sub: (n: WikiNode) => `${n.metrics.in_degree} 入链` },
    { title: '⚠️ 候选拆分（overload signal）', nodes: emergence.overloadCandidates, sub: (n: WikiNode) => `正文 ${n.body_raw.length} 字 · ${n.metrics.in_degree} 入链` },
    { title: '🕒 最近更新', nodes: emergence.recentUpdates, sub: (n: WikiNode) => n.updated },
    { title: '🏝 孤岛节点（无入无出）', nodes: emergence.orphans, sub: () => '未连接' },
  ]

  return (
    <div>
      <h2 className="text-[22px] font-semibold mt-0 mb-2">涌现 · 自进化</h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
        这一页展示 wiki 自身的形状变化。<br />它不是导航——是给你看见自己思考的镜子。
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map(s => (
          <div key={s.title} className="bg-white border rounded-[10px] p-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-[13px] font-semibold mb-3">{s.title}</h3>
            {s.nodes.length > 0 ? (
              <div>{s.nodes.map(n => <NodeCard key={n.id} {...n} subtitle={s.sub(n)} />)}</div>
            ) : (
              <p className="text-[13px] italic" style={{ color: 'var(--muted)' }}>—</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function OverrideAllNodesView({ data }: { data: WikiData }) {
  const { nodes } = data
  const byMeta: Partial<Record<MetaType, WikiNode[]>> = {}
  const byStatus: Partial<Record<NodeStatus, WikiNode[]>> = {}
  for (const node of nodes) {
    if (!byMeta[node.meta_type]) byMeta[node.meta_type] = []
    byMeta[node.meta_type]!.push(node)
    if (!byStatus[node.status]) byStatus[node.status] = []
    byStatus[node.status]!.push(node)
  }

  return (
    <div>
      <h2 className="text-[22px] font-semibold mt-0 mb-2">全部节点</h2>
      <div className="flex flex-wrap gap-2 text-[12px] mb-6" style={{ color: 'var(--muted)' }}>
        {(Object.entries(META_TYPE_CONFIG) as [MetaType, typeof META_TYPE_CONFIG[MetaType]][]).map(([key, cfg]) => (
          <span key={key} className="inline-flex items-center gap-1">
            <span className="w-[9px] h-[9px] rounded-full inline-block" style={{ background: cfg.color }} />
            {cfg.icon} {cfg.label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-[14px] font-semibold mb-4 text-gray-700">按元类型</h3>
          {(Object.entries(byMeta) as [MetaType, WikiNode[]][]).map(([type, nodes]) => (
            <div key={type} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <MetaTypeChip type={type} />
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}>({nodes.length})</span>
              </div>
              <div className="ml-1">
                {nodes.map(n => (
                  <div key={n.id} className="py-1 text-[13px]">
                    <a href="#" data-nodeid={n.id} className="wiki-link" style={{ borderBottom: 'none' }}>{n.title}</a>
                    {' '}<StatusBadge status={n.status} />
                    {n.meta_type === 'insight' && <span className="ml-1"><InsightOriginChip origin={n.insight_origin} /></span>}
                    <span className="text-[11px] ml-1.5" style={{ color: 'var(--muted)' }}>{n.domains.join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-[14px] font-semibold mb-4 text-gray-700">按状态</h3>
          {(Object.entries(byStatus) as [NodeStatus, WikiNode[]][]).map(([status, nodes]) => (
            <div key={status} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={status} />
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}>({nodes.length})</span>
              </div>
              <div className="ml-1">
                {nodes.map(n => (
                  <div key={n.id} className="py-1 text-[13px]">
                    <a href="#" data-nodeid={n.id} className="wiki-link" style={{ borderBottom: 'none' }}>{n.title}</a>
                    {' '}<MetaTypeChip type={n.meta_type} />
                    {n.meta_type === 'insight' && <span className="ml-1"><InsightOriginChip origin={n.insight_origin} /></span>}
                    <span className="text-[11px] ml-1.5" style={{ color: 'var(--muted)' }}>{n.domains.join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OverrideDomainView({ data, slug }: { data: WikiData; slug: string }) {
  const domain = slugToDomainClient(slug)
  const nodes = data.domainMap[domain]
  if (!nodes) return <div className="text-[13px]" style={{ color: 'var(--muted)' }}>未找到领域: {slug}</div>

  return (
    <div>
      <h2 className="text-[22px] font-semibold mt-0 mb-2">{domain}</h2>
      <p className="text-gray-500 mb-6">{nodes.length} 个节点</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {nodes.map(n => <NodeCard key={n.id} {...n} />)}
      </div>
    </div>
  )
}

function OverrideHomeView() {
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

  const bodyHtml = node.body_html
    .replace(/\[\[([a-z0-9-]+)\]\]/g, (_, linkId) => {
      const target = overrideData.nodeMap[linkId]
      return target ? `<a href="#" data-nodeid="${linkId}" class="wiki-link">${target.title}</a>` : `[[${linkId}]]`
    })

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
          {node.meta_type === 'insight' && <InsightOriginChip origin={node.insight_origin} />}
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

      <div className="wiki-body text-gray-800 mb-8" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

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
