import { buildWikiData } from '@/lib/parser'
import { NodeDetailView } from '@/components/views/NodeDetailView'

export async function generateStaticParams() {
  const data = await buildWikiData()
  return data.nodes.map(n => ({ id: n.id }))
}

export default async function NodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <NodeDetailView nodeId={id} />
}
