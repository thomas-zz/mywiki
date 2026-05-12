'use client'

import { useWikiData } from '@/lib/WikiDataContext'
import { META_TYPE_CONFIG, MetaTypeChip, StatusBadge, InsightOriginChip } from '@/components/NodeCard'
import { BackBar } from '@/components/BackBar'
import type { MetaType, NodeStatus } from '@/lib/types'
import Link from 'next/link'

export function AllNodesView() {
  const data = useWikiData()

  const byMeta: Partial<Record<MetaType, typeof data.nodes>> = {}
  const byStatus: Partial<Record<NodeStatus, typeof data.nodes>> = {}
  for (const node of data.nodes) {
    if (!byMeta[node.meta_type]) byMeta[node.meta_type] = []
    byMeta[node.meta_type]!.push(node)
    if (!byStatus[node.status]) byStatus[node.status] = []
    byStatus[node.status]!.push(node)
  }

  return (
    <div>
      <BackBar />
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
          <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>按元类型</h3>
          {(Object.entries(byMeta) as [MetaType, typeof data.nodes][]).map(([type, nodes]) => (
            <div key={type} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <MetaTypeChip type={type} />
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}>({nodes.length})</span>
              </div>
              <div className="ml-1">
                {nodes.map(n => (
                  <div key={n.id} className="py-1 text-[13px]">
                    <Link href={`/node/${n.id}`} style={{ borderBottom: 'none' }}>{n.title}</Link>
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
          <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>按状态</h3>
          {(Object.entries(byStatus) as [NodeStatus, typeof data.nodes][]).map(([status, nodes]) => (
            <div key={status} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={status} />
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}>({nodes.length})</span>
              </div>
              <div className="ml-1">
                {nodes.map(n => (
                  <div key={n.id} className="py-1 text-[13px]">
                    <Link href={`/node/${n.id}`} style={{ borderBottom: 'none' }}>{n.title}</Link>
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
