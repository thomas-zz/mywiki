'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiNode, Edge } from '@/lib/types'
import { useWikiDataOverride } from '@/lib/WikiDataContext'

const META_TYPE_COLORS: Record<string, string> = {
  observation: '#10b981',
  insight: '#3b82f6',
  decision: '#8b5cf6',
  question: '#f59e0b',
  comparison: '#f43f5e',
}

export function LocalGraph({ centerId, nodes, edges }: {
  centerId: string; nodes: WikiNode[]; edges: Edge[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { overrideData, navigateTo } = useWikiDataOverride()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current) return

    let cy: any = null

    import('cytoscape').then(({ default: cytoscape }) => {
      if (!containerRef.current) return

      // BFS: find all nodes reachable from center (any direction), track distance
      const neighborIds = new Set<string>()
      const distanceMap = new Map<string, number>()
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
        for (const neighbor of (adjacency.get(current) || [])) {
          if (!neighborIds.has(neighbor)) {
            neighborIds.add(neighbor)
            distanceMap.set(neighbor, dist + 1)
            queue.push([neighbor, dist + 1])
          }
        }
      }

      // Also include edges between neighbors (not just center↔neighbor)
      const localNodes = nodes.filter(n => neighborIds.has(n.id))
      const localEdges = edges.filter(e => neighborIds.has(e.source) && neighborIds.has(e.target))

      const cyNodes = localNodes.map(n => {
        const degree = localEdges.filter(e => e.source === n.id || e.target === n.id).length
        return {
          data: {
            id: n.id,
            label: n.title,
            isCenter: n.id === centerId,
            metaType: n.meta_type,
            degree,
            dist: distanceMap.get(n.id) || 0,
          },
        }
      })

      const cyEdges = localEdges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          label: e.type,
          isOutgoing: e.source === centerId,
          isIncoming: e.target === centerId,
        },
      }))

      const neighborCount = neighborIds.size

      cy = cytoscape({
        container: containerRef.current,
        elements: [...cyNodes, ...cyEdges],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': (ele: any) => META_TYPE_COLORS[ele.data('metaType')] || '#6b7280',
              'background-opacity': (ele: any) => Math.max(0.4, 0.9 - ele.data('dist') * 0.15),
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
              'text-valign': 'bottom' as any,
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
          idealEdgeLength: () => neighborCount <= 6 ? 140 : neighborCount <= 15 ? 100 : 80,
          nodeOverlap: 20,
          padding: 40,
          randomize: false,
          componentSpacing: 60,
          nodeRepulsion: () => neighborCount <= 6 ? 12000 : neighborCount <= 15 ? 8000 : 5000,
          edgeElasticity: () => 80,
          gravity: neighborCount <= 6 ? 0.3 : 0.5,
          numIter: 800,
        } as any,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        minZoom: 0.3,
        maxZoom: 3,
      })

      // Hover effects
      cy.on('tap', 'node', (evt: any) => {
        const nodeId = evt.target.id()
        if (nodeId !== centerId) {
          const path = `/node/${nodeId}`
          if (overrideData) {
            navigateTo(path)
          } else {
            router.push(path)
          }
        }
      })

      cy.on('mouseover', 'node', (evt: any) => {
        const node = evt.target
        node.style({
          'border-color': META_TYPE_COLORS[node.data('metaType')] || '#1d4ed8',
          'border-width': node.data('isCenter') ? 3 : 2.5,
          'border-opacity': 1,
        })
        node.connectedEdges().style({ 'opacity': 1, 'width': 2.5 })
        containerRef.current!.style.cursor = node.data('isCenter') ? 'default' : 'pointer'
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
    })

    return () => { cy?.destroy() }
  }, [mounted, centerId, nodes, edges, router, overrideData, navigateTo])

  return <div ref={containerRef} className="w-full h-[500px] rounded-xl border border-gray-100 bg-stone-50/50" />
}
