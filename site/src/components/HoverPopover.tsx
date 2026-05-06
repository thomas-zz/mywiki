'use client'

import { useState, useRef, useCallback } from 'react'
import type { WikiNode } from '@/lib/types'
import { META_TYPE_CONFIG } from './NodeCard'

interface PopoverData {
  node: WikiNode
  x: number
  y: number
}

export function HoverPopoverProvider({ nodes, children }: { nodes: WikiNode[]; children: React.ReactNode }) {
  const [popover, setPopover] = useState<PopoverData | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodeMap = useRef<Record<string, WikiNode>>({})

  if (Object.keys(nodeMap.current).length === 0) {
    for (const n of nodes) nodeMap.current[n.id] = n
  }

  const show = useCallback((nodeId: string, x: number, y: number) => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
    const node = nodeMap.current[nodeId]
    if (node) setPopover({ node, x, y })
  }, [])

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setPopover(null), 120)
  }, [])

  return (
    <div
      onMouseOver={(e) => {
        const target = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null
        if (target) {
          const rect = target.getBoundingClientRect()
          show(target.getAttribute('data-nodeid')!, rect.left + rect.width / 2, rect.top)
        }
      }}
      onMouseOut={(e) => {
        const target = (e.target as HTMLElement).closest('[data-nodeid]')
        if (target) hide()
      }}
    >
      {children}
      {popover && <Popover data={popover} />}
    </div>
  )
}

function Popover({ data }: { data: PopoverData }) {
  const { node, x, y } = data
  const cfg = META_TYPE_CONFIG[node.meta_type]
  const snippet = node.body_raw.replace(/\[\[([a-z0-9-]+)\]\]/g, '$1').slice(0, 280)

  const pw = 360
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const px = Math.min(Math.max(x - pw / 2, 8), vw - pw - 8)
  const py = y - 220 > 8 ? y - 12 : y + 24
  const above = y - 220 > 8

  return (
    <div
      className="fixed z-[100] w-[360px] max-w-[90vw] bg-white rounded-[10px] shadow-xl p-3.5 pointer-events-none"
      style={{
        left: px,
        top: above ? undefined : py,
        bottom: above ? `calc(100vh - ${y - 12}px)` : undefined,
        border: '1px solid var(--border)',
        animation: 'fadeIn 0.12s ease',
      }}
    >
      <div className="text-[14px] font-semibold mb-1.5 leading-tight flex items-center gap-1.5">
        <span className="w-[10px] h-[10px] rounded-full inline-block" style={{ background: cfg.color }} />
        {node.title}
      </div>
      <div className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>
        {cfg.icon} {cfg.label} · {node.status} · ←{node.metrics.in_degree} / →{node.metrics.out_degree}
        {node.domains.length > 0 && ` · ${node.domains.join(' ')}`}
      </div>
      <div className="text-[13px] leading-relaxed max-h-[140px] overflow-hidden relative" style={{ color: '#334155' }}>
        {snippet}{snippet.length >= 280 && '…'}
        <div className="absolute bottom-0 left-0 right-0 h-[30px]" style={{ background: 'linear-gradient(transparent, white)' }} />
      </div>
      <div className="text-[11px] mt-2.5 pt-2" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
        点击跳转到详情
      </div>
    </div>
  )
}
