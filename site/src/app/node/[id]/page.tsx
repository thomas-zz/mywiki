import { NodeDetailView } from '@/components/views/NodeDetailView'

export default async function NodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <NodeDetailView nodeId={id} />
}
