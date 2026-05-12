'use client'

import { useWikiData } from '@/lib/WikiDataContext'
import { MetaTypeChip, StatusBadge, InsightOriginChip } from '@/components/NodeCard'
import { RelationPanel } from '@/components/RelationPanel'
import { WikiGraph } from '@/components/WikiGraph'
import { BackBar } from '@/components/BackBar'
import { domainToSlug } from '@/lib/domain'
import Link from 'next/link'

export function NodeDetailView({ nodeId }: { nodeId: string }) {
  const data = useWikiData()
  const node = data.nodeMap[nodeId]

  if (!node) {
    return <div className="text-[13px] p-8" style={{ color: 'var(--muted)' }}>节点不存在: {nodeId}</div>
  }

  const bodyHtml = node.body_html.replace(
    /\[\[([a-z0-9-]+)\]\]/g,
    (_, linkId) => {
      const target = data.nodeMap[linkId]
      if (!target) return `[[${linkId}]]`
      return `<a href="/node/${linkId}" data-nodeid="${linkId}" class="wiki-link">${target.title}</a>`
    }
  )

  return (
    <div>
      <BackBar />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MetaTypeChip type={node.meta_type} />
          {node.meta_type === 'insight' && <InsightOriginChip origin={node.insight_origin} />}
          <StatusBadge status={node.status} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>入链 {node.metrics.in_degree} · 出链 {node.metrics.out_degree}</span>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>{node.title}</h1>
        <div className="flex flex-wrap gap-2 mb-2">
          {node.domains.map(d => (
            <Link key={d} href={`/domain/${domainToSlug(d)}`} className="text-sm text-blue-600 hover:underline">{d}</Link>
          ))}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          创建 {node.created} · 更新 {node.updated}
          {node.wiki && <span> · {node.wiki}</span>}
        </div>
      </div>

      <div className="wiki-body mb-8" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      {node.sources.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>来源</h2>
          <ul className="space-y-1">
            {node.sources.map((s, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--muted)' }}>
                {s.title} {s.date && <span style={{ color: 'var(--muted)' }}>({s.date})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(node.relations.length > 0 || node.back_edges.length > 0) && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>关系</h2>
          <RelationPanel relations={node.relations} backEdges={node.back_edges} nodeMap={data.nodeMap} />
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>局部图谱</h2>
        <WikiGraph centerId={node.id} nodes={data.nodes} edges={data.edges} mode="local" interactive />
      </div>
    </div>
  )
}
