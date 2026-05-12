'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiNode, Edge } from '@/lib/types'

const META_TYPE_COLORS: Record<string, string> = {
  observation: '#10b981',
  insight: '#3b82f6',
  decision: '#8b5cf6',
  question: '#f59e0b',
  comparison: '#f43f5e',
}

const DOMAIN_PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#ef4444', '#22d3ee',
]

const MAX_BFS_DEPTH = 3

interface WikiGraphProps {
  nodes: WikiNode[]
  edges: Edge[]
  mode: 'local' | 'global'
  centerId?: string
  colorBy?: 'metaType' | 'domain'
  visibleTypes?: Set<string>
  interactive?: boolean
}

function buildDomainColorMap(nodes: WikiNode[]): Record<string, string> {
  const domainSet = new Set<string>()
  for (const n of nodes) {
    if (n.domains.length > 0) {
      const root = n.domains[0].split('/')[0]
      domainSet.add(root)
    }
  }
  const sorted = Array.from(domainSet).sort()
  const map: Record<string, string> = {}
  sorted.forEach((d, i) => { map[d] = DOMAIN_PALETTE[i % DOMAIN_PALETTE.length] })
  return map
}

function getNodeColor(node: WikiNode, colorBy: string, domainColors: Record<string, string>): string {
  if (colorBy === 'domain' && node.domains.length > 0) {
    const root = node.domains[0].split('/')[0]
    return domainColors[root] || '#6b7280'
  }
  return META_TYPE_COLORS[node.meta_type] || '#6b7280'
}

export function WikiGraph({ nodes, edges, mode, centerId, colorBy = 'metaType', visibleTypes, interactive = false }: WikiGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current) return
    let cy: any = null

    import('cytoscape').then(({ default: cytoscape }) => {
      if (!containerRef.current) return

      let displayNodes: WikiNode[]
      let displayEdges: Edge[]
      let distanceMap = new Map<string, number>()

      if (mode === 'local' && centerId) {
        const neighborIds = new Set<string>()
        const queue: [string, number][] = [[centerId, 0]]
        neighborIds.add(centerId)
        distanceMap.set(centerId, 0)

        const adjacency = new Map<string, string[]>()
        for (const e of edges) {
          if (!adjacency.has(e.source)) adjacency.set(e.source, [])
          if (!adjacency.has(e.target)) adjacency.set(e.target, [])
          adjacency.get(e.source)!.push(e.target)
          adjacency.get(e.target)!.push(e.source)
        }

        const maxDepth = interactive && expanded ? MAX_BFS_DEPTH : 1
        while (queue.length > 0) {
          const [current, dist] = queue.shift()!
          if (dist >= maxDepth) continue
          for (const neighbor of (adjacency.get(current) || [])) {
            if (!neighborIds.has(neighbor)) {
              neighborIds.add(neighbor)
              distanceMap.set(neighbor, dist + 1)
              queue.push([neighbor, dist + 1])
            }
          }
        }

        displayNodes = nodes.filter(n => neighborIds.has(n.id))
        displayEdges = edges.filter(e => neighborIds.has(e.source) && neighborIds.has(e.target))
      } else {
        displayNodes = visibleTypes
          ? nodes.filter(n => visibleTypes.has(n.meta_type))
          : nodes
        displayEdges = edges.filter(e => {
          if (!visibleTypes) return true
          const srcNode = nodes.find(n => n.id === e.source)
          const tgtNode = nodes.find(n => n.id === e.target)
          return srcNode && tgtNode && visibleTypes.has(srcNode.meta_type) && visibleTypes.has(tgtNode.meta_type)
        })
      }

      const domainColors = colorBy === 'domain' ? buildDomainColorMap(displayNodes) : {}

      const cyNodes = displayNodes.map(n => {
        const degree = displayEdges.filter(e => e.source === n.id || e.target === n.id).length
        return {
          data: {
            id: n.id,
            label: n.title,
            isCenter: mode === 'local' && n.id === centerId,
            metaType: n.meta_type,
            nodeColor: getNodeColor(n, colorBy, domainColors),
            degree,
            dist: distanceMap.get(n.id) || 0,
          },
        }
      })

      const cyEdges = displayEdges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          label: e.type,
          isOutgoing: mode === 'local' && e.source === centerId,
          isIncoming: mode === 'local' && e.target === centerId,
        },
      }))

      const nodeCount = cyNodes.length

      cy = cytoscape({
        container: containerRef.current,
        elements: [...cyNodes, ...cyEdges],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(nodeColor)',
              'background-opacity': (ele: any) => mode === 'local' ? Math.max(0.4, 0.9 - ele.data('dist') * 0.15) : 0.85,
              'label': 'data(label)',
              'font-size': '10px',
              'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              'text-wrap': 'wrap' as any,
              'text-max-width': '90px',
              'text-valign': 'bottom' as any,
              'text-margin-y': 6,
              'width': (ele: any) => Math.max(20, 14 + ele.data('degree') * 5),
              'height': (ele: any) => Math.max(20, 14 + ele.data('degree') * 5),
              'border-width': 1.5,
              'border-color': '#e5e7eb',
              'color': '#4b5563',
              'text-background-color': '#ffffff',
              'text-background-opacity': 0.7,
              'text-background-padding': 2 as any,
              'text-background-shape': 'roundrectangle' as any,
            },
          },
          {
            selector: 'node[?isCenter]',
            style: {
              'width': (ele: any) => Math.max(44, 30 + ele.data('degree') * 4),
              'height': (ele: any) => Math.max(44, 30 + ele.data('degree') * 4),
              'background-opacity': 1,
              'font-size': '12px',
              'font-weight': 'bold' as any,
              'border-width': 2.5,
              'border-color': 'data(nodeColor)',
              'border-opacity': 0.5,
              'text-margin-y': 8,
              'color': '#1f2937',
              'shadow-blur': 12,
              'shadow-color': 'data(nodeColor)',
              'shadow-opacity': 0.2,
              'shadow-offset-x': 0,
              'shadow-offset-y': 0,
            },
          },
          {
            selector: 'edge',
            style: {
              'width': 1.5,
              'line-color': '#d1d5db',
              'target-arrow-color': '#d1d5db',
              'target-arrow-shape': 'triangle' as any,
              'arrow-scale': 0.8,
              'curve-style': 'bezier' as any,
              'opacity': 0.5,
            },
          },
          {
            selector: 'edge[?isOutgoing]',
            style: {
              'line-color': '#93c5fd',
              'target-arrow-color': '#93c5fd',
              'opacity': 0.7,
            },
          },
          {
            selector: 'edge[?isIncoming]',
            style: {
              'line-color': '#fbbf24',
              'target-arrow-color': '#fbbf24',
              'opacity': 0.7,
            },
          },
        ] as any,
        layout: {
          name: 'cose',
          idealEdgeLength: () => nodeCount <= 6 ? 140 : nodeCount <= 15 ? 120 : 100,
          nodeOverlap: 20,
          padding: mode === 'local' ? 40 : 60,
          randomize: false,
          componentSpacing: mode === 'local' ? 60 : 100,
          nodeRepulsion: () => nodeCount <= 6 ? 12000 : nodeCount <= 15 ? 8000 : 5000,
          edgeElasticity: () => 80,
          gravity: nodeCount <= 6 ? 0.3 : 0.5,
          numIter: 800,
        } as any,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        minZoom: 0.3,
        maxZoom: 3,
      })

      if (interactive && mode === 'local') {
        cy.on('tap', 'node', (evt: any) => {
          const nodeId = evt.target.id()
          if (nodeId === centerId) return
          router.push(`/node/${nodeId}`)
        })
      } else {
        cy.on('tap', 'node', (evt: any) => {
          const nodeId = evt.target.id()
          if (mode === 'local' && nodeId === centerId) return
          router.push(`/node/${nodeId}`)
        })
      }

      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      if (!isTouchDevice && mode === 'global') {
        cy.on('mouseover', 'node', (evt: any) => {
          const node = evt.target
          const neighborhood = node.neighborhood().add(node)
          cy.elements().not(neighborhood).style({ opacity: 0.1 })
          neighborhood.style({ opacity: 1 })
          node.connectedEdges().style({ opacity: 1, width: 2.5 })
          node.style({
            'border-color': node.data('nodeColor'),
            'border-width': 3,
            'border-opacity': 1,
          })
          containerRef.current!.style.cursor = 'pointer'
        })

        cy.on('mouseout', 'node', () => {
          cy.elements().removeStyle('opacity')
          cy.edges().removeStyle('width')
          cy.nodes().forEach((n: any) => {
            n.removeStyle('border-color border-width border-opacity')
          })
          containerRef.current!.style.cursor = 'default'
        })
      } else if (!isTouchDevice && mode === 'local') {
        cy.on('mouseover', 'node', (evt: any) => {
          const node = evt.target
          node.style({
            'border-color': node.data('nodeColor'),
            'border-width': node.data('isCenter') ? 3 : 2.5,
            'border-opacity': 1,
          })
          node.connectedEdges().style({ opacity: 1, width: 2.5 })
          containerRef.current!.style.cursor = (mode === 'local' && node.data('isCenter')) ? 'default' : 'pointer'
        })

        cy.on('mouseout', 'node', (evt: any) => {
          const node = evt.target
          const isCenter = node.data('isCenter')
          node.style({
            'border-color': isCenter ? node.data('nodeColor') : '#e5e7eb',
            'border-width': isCenter ? 2.5 : 1.5,
            'border-opacity': isCenter ? 0.5 : 1,
          })
          node.connectedEdges().forEach((edge: any) => {
            const isDirectEdge = edge.data('isOutgoing') || edge.data('isIncoming')
            edge.style({ opacity: isDirectEdge ? 0.7 : 0.5, width: 1.5 })
          })
          containerRef.current!.style.cursor = 'default'
        })
      }
    })

    return () => { cy?.destroy() }
  }, [mounted, nodes, edges, mode, centerId, colorBy, visibleTypes, interactive, expanded, router])

  const heightClass = mode === 'local'
    ? 'h-75 md:h-125'
    : 'h-[calc(100vh-200px)] md:h-[calc(100vh-80px)]'

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`w-full ${heightClass} rounded-xl`}
        style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
      />
      {interactive && mode === 'local' && (
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1 text-[11px] rounded-md transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            {expanded ? '收起' : '展开更多'}
          </button>
        </div>
      )}
    </div>
  )
}
