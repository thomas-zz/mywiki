import { buildWikiData } from '@/lib/parser'
import { NodeCard } from '@/components/NodeCard'
import { BackBar } from '@/components/BackBar'
import { domainToSlug, slugToDomain } from '@/lib/domain'
import { notFound } from 'next/navigation'

export const dynamicParams = false

export async function generateStaticParams() {
  const data = await buildWikiData()
  return Object.keys(data.domainMap).map(d => ({ tag: domainToSlug(d) }))
}

export default async function DomainPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const domain = slugToDomain(tag)
  const data = await buildWikiData()
  const nodes = data.domainMap[domain]
  if (!nodes) notFound()

  return (
    <div>
      <BackBar title={domain} />
      <p className="text-gray-500 mb-6">{nodes.length} 个节点</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {nodes.map(n => <NodeCard key={n.id} {...n} />)}
      </div>
    </div>
  )
}
