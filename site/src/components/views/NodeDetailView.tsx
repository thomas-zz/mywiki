'use client'

import { useMemo } from 'react'
import { useWikiData } from '@/lib/WikiDataContext'
import { MetaTypeChip, StatusBadge, InsightOriginChip } from '@/components/NodeCard'
import { RelationPanel } from '@/components/RelationPanel'
import { WikiGraph } from '@/components/WikiGraph'
import { BackBar } from '@/components/BackBar'
import { domainToSlug } from '@/lib/domain'
import Link from 'next/link'
import type { WikiNode } from '@/lib/types'

// 延伸路径：基于 prerequisite 关系构建学习链
function LearningPathPanel({ node, nodeMap }: { node: WikiNode; nodeMap: Record<string, WikiNode> }) {
  // 前置知识：当前节点把哪些节点列为 prerequisite（出边，relations）
  const prereqs = node.relations
    .filter(r => r.type === 'prerequisite')
    .map(r => nodeMap[r.to])
    .filter(Boolean)

  // 延伸阅读：哪些节点把当前节点列为 prerequisite（入边，back_edges）
  const next = node.back_edges
    .filter(e => e.type === 'prerequisite')
    .map(e => nodeMap[e.from])
    .filter(Boolean)

  if (prereqs.length === 0 && next.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>延伸路径</h2>
      <div className="rounded-[10px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {prereqs.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--muted)' }}>↑ 前置知识</div>
            <div className="flex flex-wrap gap-2">
              {prereqs.map(n => (
                <Link key={n.id} href={`/node/${n.id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] transition-colors hover:opacity-80"
                  style={{ background: 'var(--hover)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  <span className="text-[10px]">📖</span> {n.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {prereqs.length > 0 && next.length > 0 && (
          <div className="text-center text-[11px] my-2" style={{ color: 'var(--muted)' }}>
            ↓ 当前节点 · {node.title}
          </div>
        )}

        {next.length > 0 && (
          <div>
            <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--muted)' }}>↓ 延伸阅读</div>
            <div className="flex flex-wrap gap-2">
              {next.map(n => (
                <Link key={n.id} href={`/node/${n.id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] transition-colors hover:opacity-80"
                  style={{ background: 'var(--hover)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  <span className="text-[10px]">🔗</span> {n.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 影响扩散：如果此节点变更，哪些下游节点会受影响
function ImpactPanel({ node, nodeMap }: { node: WikiNode; nodeMap: Record<string, WikiNode> }) {
  const impacted = useMemo(() => {
    const groups: Record<string, WikiNode[]> = {}
    for (const edge of node.back_edges) {
      const src = nodeMap[edge.from]
      if (!src) continue
      const type = edge.type || 'related'
      if (!groups[type]) groups[type] = []
      groups[type].push(src)
    }
    return groups
  }, [node.back_edges, nodeMap])

  if (node.back_edges.length === 0) return null

  const total = Object.values(impacted).reduce((s, arr) => s + arr.length, 0)
  if (total === 0) return null

  const REL_LABELS: Record<string, string> = {
    prerequisite: '依赖此为前置',
    implements: '实现了此主张',
    extends: '在此基础上扩展',
    'instance-of': '是此概念的实例',
    contradicts: '与此矛盾',
    contrasts: '与此对比',
    'evolves-from': '从此演化而来',
    related: '相关引用',
  }

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--muted)' }}>影响范围</h2>
      <p className="text-[11px] mb-3" style={{ color: 'var(--muted)' }}>
      若此节点内容变更，以下 {total} 个节点可能受影响
      </p>
      <div className="space-y-3">
        {Object.entries(impacted).map(([type, nodes]) => (
          <div key={type}>
            <div className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
              {REL_LABELS[type] || type} ({nodes.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {nodes.map(n => (
                <Link key={n.id} href={`/node/${n.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors hover:opacity-80"
                  style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  {n.title}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
      const safeTitle = target.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      return `<a href="/node/${linkId}" data-nodeid="${linkId}" class="wiki-link">${safeTitle}</a>`
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

      <LearningPathPanel node={node} nodeMap={data.nodeMap} />

      <ImpactPanel node={node} nodeMap={data.nodeMap} />

      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>局部图谱</h2>
        <WikiGraph centerId={node.id} nodes={data.nodes} edges={data.edges} mode="local" interactive />
      </div>
    </div>
  )
}
