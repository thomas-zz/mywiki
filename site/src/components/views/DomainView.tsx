'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useWikiData } from '@/lib/WikiDataContext'
import { NodeCard } from '@/components/NodeCard'
import { BackBar } from '@/components/BackBar'
import { slugToDomain, domainToSlug } from '@/lib/domain'

export function DomainView({ slug }: { slug: string }) {
  const data = useWikiData()
  const domain = slugToDomain(slug)
  const nodes = data.domainMap[domain]

  const childDomains = useMemo(() => {
    const prefix = domain.startsWith('#') ? domain.slice(1) : domain
    const depth = prefix.split('/').length
    const children: { label: string; fullPath: string; count: number }[] = []
    for (const key of Object.keys(data.domainMap)) {
      const stripped = key.startsWith('#') ? key.slice(1) : key
      if (stripped.startsWith(prefix + '/') && stripped.split('/').length === depth + 1) {
        children.push({ label: stripped.split('/').pop()!, fullPath: key, count: data.domainMap[key].length })
      }
    }
    return children.sort((a, b) => a.label.localeCompare(b.label))
  }, [data.domainMap, domain])

  if (!nodes) {
    return <div className="text-[13px]" style={{ color: 'var(--muted)' }}>未找到领域: {slug}</div>
  }

  const directNodes = nodes.filter(n => n.domains.includes(domain))
  const inheritedOnly = nodes.filter(n => !n.domains.includes(domain))

  return (
    <div>
      <BackBar title={domain} />
      <p className="mb-4" style={{ color: 'var(--muted)' }}>{nodes.length} 个节点</p>

      {childDomains.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {childDomains.map(c => (
            <Link
              key={c.fullPath}
              href={`/domain/${domainToSlug(c.fullPath)}`}
              className="px-3 py-1.5 rounded-full text-[13px] transition-colors"
              style={{ background: 'var(--tag-bg)', color: 'var(--text)', borderBottom: 'none' }}
            >
              {c.label} <span style={{ color: 'var(--muted)' }}>{c.count}</span>
            </Link>
          ))}
        </div>
      )}

      {directNodes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {directNodes.map(n => <NodeCard key={n.id} {...n} />)}
        </div>
      )}

      {inheritedOnly.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-widest mt-6 mb-3" style={{ color: 'var(--muted)' }}>来自子领域</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inheritedOnly.map(n => <NodeCard key={n.id} {...n} />)}
          </div>
        </>
      )}
    </div>
  )
}
