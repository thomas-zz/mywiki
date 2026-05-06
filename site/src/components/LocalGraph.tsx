'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiNode, Edge } from '@/lib/types'

const META_TYPE_COLORS: Record<string, string> = {
  observation: '#10b981',
  model: '#3b82f6',
  decision: '#8b5cf6',
  question: '#f59e0b',
  comparison: '#f43f5e',
}

export function LocalGraph({ centerId, nodes, edges }: {
  centerId: string; nodes: WikiNode[]; edges: Edge[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current) return

    let cy: any = null

    import('cytoscape').then(({ default: cytoscape }) => {
      if (!containerRef.current) return

      const neighborIds = new Set<string>()
      neighborIds.add(centerId)
      for (const e of edges) {
        if (e.source === centerId) neighborIds.add(e.target)
        if (e.target === centerId) neighborIds.add(e.source)
      }

      const cyNodes = nodes
        .filter(n => neighborIds.has(n.id))
        .map(n => ({
          data: {
            id: n.id,
            label: n.title,
            isCenter: n.id === centerId,
            metaType: n.meta_type,
          },
        }))

      const cyEdges = edges
        .filter(e => neighborIds.has(e.source) && neighborIds.has(e.target))
        .map((e, i) => ({
          data: {
            id: `e${i}`,
            source: e.source,
            target: e.target,
            label: e.type,
            isOutgoing: e.source === centerId,
          },
        }))

      cy = cytoscape({
        container: containerRef.current,
        elements: [...cyNodes, ...cyEdges],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': (ele: any) => META_TYPE_COLORS[ele.data('metaType')] || '#6b7280',
              'label': 'data(label)',
              'font-size': '11px',
              'text-wrap': 'wrap' as any,
              'text-max-width': '100px',
              'text-valign': 'bottom' as any,
              'text-margin-y': 8,
              'width': 36,
              'height': 36,
              'border-width': 2,
              'border-color': '#e5e7eb',
              'color': '#374151',
            },
          },
          {
            selector: 'node[?isCenter]',
            style: {
              'width': 80,
              'height': 80,
              'font-size': '13px',
              'font-weight': 'bold' as any,
              'border-width': 3,
              'border-color': '#3b82f6',
              'text-valign': 'center' as any,
              'text-halign': 'center' as any,
              'text-margin-y': 0,
              'color': '#ffffff',
            },
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#93c5fd',
              'target-arrow-color': '#93c5fd',
              'target-arrow-shape': 'triangle' as any,
              'curve-style': 'bezier' as any,
              'label': 'data(label)',
              'font-size': '9px',
              'text-rotation': 'autorotate' as any,
              'text-background-color': '#ffffff',
              'text-background-opacity': 0.9,
              'text-background-padding': 3 as any,
              'color': '#6b7280',
            },
          },
          {
            selector: 'edge[!isOutgoing]',
            style: {
              'line-color': '#fbbf24',
              'target-arrow-color': '#fbbf24',
            },
          },
        ] as any,
        layout: {
          name: 'concentric',
          concentric: (node: any) => node.data('isCenter') ? 100 : 1,
          levelWidth: () => 1,
          minNodeSpacing: Math.max(80, 700 / Math.max(neighborIds.size, 1)),
          padding: 80,
        } as any,
        userZoomingEnabled: true,
        userPanningEnabled: true,
      })

      cy.on('tap', 'node', (evt: any) => {
        const nodeId = evt.target.id()
        if (nodeId !== centerId) {
          router.push(`/node/${nodeId}`)
        }
      })

      cy.on('mouseover', 'node', (evt: any) => {
        evt.target.style('border-color', '#1d4ed8')
        containerRef.current!.style.cursor = 'pointer'
      })

      cy.on('mouseout', 'node', (evt: any) => {
        const isCenter = evt.target.data('isCenter')
        evt.target.style('border-color', isCenter ? '#3b82f6' : '#e5e7eb')
        containerRef.current!.style.cursor = 'default'
      })
    })

    return () => { cy?.destroy() }
  }, [mounted, centerId, nodes, edges, router])

  return <div ref={containerRef} className="w-full h-[400px] rounded-lg border border-gray-200 bg-gray-50" />
}
