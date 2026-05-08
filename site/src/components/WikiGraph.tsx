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

const MAX_BFS_DEPTH = 3

interface WikiGraphProps {
  nodes: WikiNode[]
  edges: Edge[]
  mode: 'local' | 'global'
  centerId?: string
}

export function WikiGraph({ nodes, edges, mode, centerId }: WikiGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

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

        while (queue.length > 0) {
          const [current, dist] = queue.shift()!
          if (dist >= MAX_BFS_DEPTH) continue
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
        displayNodes = nodes
        displayEdges = edges
      }

      const cyNodes = displayNodes.map(n => {
        const degree = displayEdges.filter(e => e.source === n.id || e.target === n.id).length
        return {
          data: {
            id: n.id,
            label: n.title,
            isCenter: mode === 'local' && n.id === centerId,
            metaType: n.meta_type,
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
              'background-color': (ele: any) => META_TYPE_COLORS[ele.data('metaType')] || '#6b7280',
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
              'border-color': (ele: any) => META_TYPE_COLORS[ele.data('metaType')] || '#3b82f6',
              'border-opacity': 0.5,
              'text-margin-y': 8,
              'color': '#1f2937',
              'shadow-blur': 12,
              'shadow-color': (ele: any) => META_TYPE_COLORS[ele.data('metaType')] || '#3b82f6',
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

      cy.on('tap', 'node', (evt: any) => {
        const nodeId = evt.target.id()
        if (mode === 'local' && nodeId === centerId) return
        router.push(`/node/${nodeId}`)
      })

      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      if (!isTouchDevice) {
        cy.on('mouseover', 'node', (evt: any) => {
          const node = evt.target
          node.style({
            'border-color': META_TYPE_COLORS[node.data('metaType')] || '#1d4ed8',
            'border-width': node.data('isCenter') ? 3 : 2.5,
            'border-opacity': 1,
          })
          node.connectedEdges().style({ 'opacity': 1, 'width': 2.5 })
          containerRef.current!.style.cursor = (mode === 'local' && node.data('isCenter')) ? 'default' : 'pointer'
        })

        cy.on('mouseout', 'node', (evt: any) => {
          const node = evt.target
          const isCenter = node.data('isCenter')
          node.style({
            'border-color': isCenter ? (META_TYPE_COLORS[node.data('metaType')] || '#3b82f6') : '#e5e7eb',
            'border-width': isCenter ? 2.5 : 1.5,
            'border-opacity': isCenter ? 0.5 : 1,
          })
          node.connectedEdges().forEach((edge: any) => {
            const isDirectEdge = edge.data('isOutgoing') || edge.data('isIncoming')
            edge.style({ 'opacity': isDirectEdge ? 0.7 : 0.5, 'width': 1.5 })
          })
          containerRef.current!.style.cursor = 'default'
        })
      }
    })

    return () => { cy?.destroy() }
  }, [mounted, nodes, edges, mode, centerId, router])

  const heightClass = mode === 'local'
    ? 'h-75 md:h-125'
    : 'h-[calc(100vh-200px)] md:h-[calc(100vh-80px)]'

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-xl border border-gray-100 bg-stone-50/50`}
    />
  )
}
