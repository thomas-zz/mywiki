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

export function GlobalGraph({ nodes, edges }: { nodes: WikiNode[]; edges: Edge[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current) return
    let cy: any = null

    import('cytoscape').then(({ default: cytoscape }) => {
      if (!containerRef.current) return

      cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map(n => ({
            data: { id: n.id, label: n.title, metaType: n.meta_type, degree: n.metrics.in_degree + n.metrics.out_degree },
          })),
          ...edges.map((e, i) => ({
            data: { id: `e${i}`, source: e.source, target: e.target, label: e.type },
          })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': (ele: any) => META_TYPE_COLORS[ele.data('metaType')] || '#6b7280',
              'label': 'data(label)',
              'font-size': '10px',
              'text-wrap': 'wrap' as any,
              'text-max-width': '80px',
              'text-valign': 'bottom' as any,
              'text-margin-y': 6,
              'width': (ele: any) => Math.max(24, 16 + ele.data('degree') * 6),
              'height': (ele: any) => Math.max(24, 16 + ele.data('degree') * 6),
              'border-width': 2,
              'border-color': '#e5e7eb',
              'color': '#374151',
            },
          },
          {
            selector: 'edge',
            style: {
              'width': 1.5,
              'line-color': '#d1d5db',
              'target-arrow-color': '#d1d5db',
              'target-arrow-shape': 'triangle' as any,
              'curve-style': 'bezier' as any,
              'opacity': 0.6,
            },
          },
        ] as any,
        layout: {
          name: 'cose',
          idealEdgeLength: () => 150,
          nodeOverlap: 20,
          padding: 60,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: () => 8000,
          edgeElasticity: () => 100,
        } as any,
      })

      cy.on('tap', 'node', (evt: any) => {
        router.push(`/node/${evt.target.id()}`)
      })

      cy.on('mouseover', 'node', (evt: any) => {
        evt.target.style('border-color', '#1d4ed8')
        containerRef.current!.style.cursor = 'pointer'
      })

      cy.on('mouseout', 'node', (evt: any) => {
        evt.target.style('border-color', '#e5e7eb')
        containerRef.current!.style.cursor = 'default'
      })
    })

    return () => { cy?.destroy() }
  }, [mounted, nodes, edges, router])

  return <div ref={containerRef} className="w-full h-[calc(100vh-80px)]" />
}
