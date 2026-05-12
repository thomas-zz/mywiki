import Link from 'next/link'
import type { WikiRelation, BackEdge, WikiNode } from '@/lib/types'
import { MetaTypeChip, StatusBadge, InsightOriginChip } from './NodeCard'

function RelationTypeChip({ type, direction }: { type: string; direction: 'out' | 'in' }) {
  const color = direction === 'out' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
  return <span className={`inline-block px-2 py-0.5 rounded border text-xs ${color}`}>{type}</span>
}

export function RelationPanel({ relations, backEdges, nodeMap }: {
  relations: WikiRelation[]; backEdges: BackEdge[]; nodeMap: Record<string, WikiNode>
}) {
  return (
    <div className="space-y-6">
      {relations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>↗ 我指向</h3>
          <div className="space-y-2">
            {relations.map((rel, i) => {
              const target = nodeMap[rel.to]
              if (!target) return null
              return (
                <Link key={i} href={`/node/${rel.to}`} data-nodeid={rel.to} className="flex items-center gap-2 p-2 rounded hover:bg-[var(--hover)] transition-colors">
                  <RelationTypeChip type={rel.type} direction="out" />
                  <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{target.title}</span>
                  <MetaTypeChip type={target.meta_type} />
                  {target.meta_type === 'insight' && <InsightOriginChip origin={target.insight_origin} />}
                  <StatusBadge status={target.status} />
                  {rel.note && <span className="text-xs text-gray-400 italic ml-auto">{rel.note}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}
      {backEdges.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>↩ 指向我</h3>
          <div className="space-y-2">
            {backEdges.map((edge, i) => {
              const source = nodeMap[edge.from]
              if (!source) return null
              return (
                <Link key={i} href={`/node/${edge.from}`} data-nodeid={edge.from} className="flex items-center gap-2 p-2 rounded hover:bg-[var(--hover)] transition-colors">
                  <RelationTypeChip type={edge.type} direction="in" />
                  <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{source.title}</span>
                  <MetaTypeChip type={source.meta_type} />
                  {source.meta_type === 'insight' && <InsightOriginChip origin={source.insight_origin} />}
                  <StatusBadge status={source.status} />
                  {edge.note && <span className="text-xs text-gray-400 italic ml-auto">{edge.note}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
