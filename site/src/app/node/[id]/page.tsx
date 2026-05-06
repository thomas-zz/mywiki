import { buildWikiData } from '@/lib/parser'
import { MetaTypeChip, StatusBadge } from '@/components/NodeCard'
import { RelationPanel } from '@/components/RelationPanel'
import { LocalGraph } from '@/components/LocalGraph'
import { BackBar } from '@/components/BackBar'
import { domainToSlug } from '@/lib/domain'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const data = await buildWikiData()
  return data.nodes.map(n => ({ id: n.id }))
}

export default async function NodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await buildWikiData()
  const node = data.nodeMap[id]
  if (!node) notFound()

  const bodyHtml = node.body_html.replace(
    /\[\[([a-z0-9-]+)\]\]/g,
    (_, linkId) => {
      const target = data.nodeMap[linkId]
      if (!target) return `[[${linkId}]]`
      return `<a href="/node/${linkId}">${target.title}</a>`
    }
  )

  return (
    <div>
      <BackBar />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MetaTypeChip type={node.meta_type} />
          <StatusBadge status={node.status} />
          <span className="text-xs text-gray-400">入链 {node.metrics.in_degree} · 出链 {node.metrics.out_degree}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{node.title}</h1>
        <div className="flex flex-wrap gap-2 mb-2">
          {node.domains.map(d => (
            <Link key={d} href={`/domain/${domainToSlug(d)}`} className="text-sm text-blue-600 hover:underline">{d}</Link>
          ))}
        </div>
        <div className="text-xs text-gray-400">
          创建 {node.created} · 更新 {node.updated}
          {node.wiki && <span> · {node.wiki}</span>}
        </div>
      </div>

      <div className="wiki-body text-gray-800 mb-8" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      {node.sources.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">来源</h2>
          <ul className="space-y-1">
            {node.sources.map((s, i) => (
              <li key={i} className="text-sm text-gray-600">
                {s.title} {s.date && <span className="text-gray-400">({s.date})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(node.relations.length > 0 || node.back_edges.length > 0) && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">关系</h2>
          <RelationPanel relations={node.relations} backEdges={node.back_edges} nodeMap={data.nodeMap} />
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">局部图谱</h2>
        <LocalGraph centerId={node.id} nodes={data.nodes} edges={data.edges} />
      </div>
    </div>
  )
}
