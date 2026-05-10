import { DomainView } from '@/components/views/DomainView'

export default async function DomainPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  return <DomainView slug={tag} />
}
