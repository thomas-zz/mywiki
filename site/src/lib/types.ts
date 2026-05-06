export type MetaType = 'observation' | 'model' | 'decision' | 'question' | 'comparison'
export type NodeStatus = 'seed' | 'growing' | 'mature' | 'needs-split' | 'archived'

export interface WikiSource {
  title: string
  path: string
  date?: string
}

export interface WikiRelation {
  to: string
  type: string
  note?: string
}

export interface BackEdge {
  from: string
  type: string
  note?: string
}

export interface WikiNode {
  id: string
  title: string
  meta_type: MetaType
  domains: string[]
  status: NodeStatus
  created: string
  updated: string
  wiki?: string
  sources: WikiSource[]
  relations: WikiRelation[]
  derived_from: string[]
  splits_into: string[]
  body_raw: string
  body_html: string
  metrics: { in_degree: number; out_degree: number }
  back_edges: BackEdge[]
}

export interface Edge {
  source: string
  target: string
  type: string
  note?: string
}

export interface Emergence {
  hubs: WikiNode[]
  crossDomainHubs: WikiNode[]
  overloadCandidates: WikiNode[]
  orphans: WikiNode[]
  recentUpdates: WikiNode[]
  openQuestions: WikiNode[]
}

export interface WikiData {
  nodes: WikiNode[]
  edges: Edge[]
  emergence: Emergence
  nodeMap: Record<string, WikiNode>
  domainMap: Record<string, WikiNode[]>
}
