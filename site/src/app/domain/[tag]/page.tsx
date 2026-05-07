import { buildWikiData } from '@/lib/parser'
import { DomainView } from '@/components/views/DomainView'
import { domainToSlug } from '@/lib/domain'

export async function generateStaticParams() {
  const data = await buildWikiData()
  return Object.keys(data.domainMap).map(d => ({ tag: domainToSlug(d) }))
}

export default async function DomainPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  return <DomainView slug={tag} />
}
