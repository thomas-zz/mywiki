'use client'

import { useWikiData } from '@/lib/WikiDataContext'
import { NodeCard } from '@/components/NodeCard'
import { BackBar } from '@/components/BackBar'
import { slugToDomain } from '@/lib/domain'

export function DomainView({ slug }: { slug: string }) {
  const data = useWikiData()
  const domain = slugToDomain(slug)
  const nodes = data.domainMap[domain]

  if (!nodes) {
    return <div className="text-[13px]" style={{ color: 'var(--muted)' }}>未找到领域: {slug}</div>
  }

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
