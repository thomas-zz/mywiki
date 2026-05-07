'use client'

import { useState, useRef, useCallback, useEffect, forwardRef } from 'react'
import { usePathname } from 'next/navigation'
import type { WikiNode } from '@/lib/types'
import { META_TYPE_CONFIG, InsightOriginChip } from './NodeCard'
import { useWikiDataOverride } from '@/lib/WikiDataContext'

interface PopoverData {
  node: WikiNode
  triggerRect: { left: number; right: number; top: number; bottom: number }
  triggerId: string
}

export function HoverPopoverProvider({ nodes, children }: { nodes: WikiNode[]; children: React.ReactNode }) {
  const [popover, setPopover] = useState<PopoverData | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodeMap = useRef<Record<string, WikiNode>>({})
  const popoverRef = useRef<HTMLDivElement>(null)
  const insidePopover = useRef(false)
  const pathname = usePathname()
  const { overrideData } = useWikiDataOverride()

  const allNodes = overrideData?.nodes || nodes
  if (Object.keys(nodeMap.current).length !== allNodes.length) {
    nodeMap.current = {}
    for (const n of allNodes) nodeMap.current[n.id] = n
  }

  useEffect(() => { setPopover(null) }, [pathname])

  const cancelAll = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
    if (switchTimer.current) { clearTimeout(switchTimer.current); switchTimer.current = null }
  }, [])

  const scheduleHide = useCallback(() => {
    cancelAll()
    hideTimer.current = setTimeout(() => {
      if (!insidePopover.current) setPopover(null)
    }, 200)
  }, [cancelAll])

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const popEl = popoverRef.current
    if (popEl && popEl.contains(e.target as Node)) {
      insidePopover.current = true
      cancelAll()
      return
    }
    if (insidePopover.current) return

    const target = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null
    if (!target) return
    const nodeId = target.getAttribute('data-nodeid')!
    if (popover && popover.triggerId === nodeId) { cancelAll(); return }

    const node = nodeMap.current[nodeId]
    if (!node) return
    const rect = target.getBoundingClientRect()

    if (popover) {
      // Popover already showing for another node — delay switch so user can reach popover
      if (switchTimer.current) clearTimeout(switchTimer.current)
      switchTimer.current = setTimeout(() => {
        if (!insidePopover.current) {
          setPopover({ node, triggerRect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, triggerId: nodeId })
        }
      }, 300)
    } else {
      cancelAll()
      setPopover({ node, triggerRect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, triggerId: nodeId })
    }
  }, [popover, cancelAll])

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    const popEl = popoverRef.current
    const related = e.relatedTarget as Node | null
    if (popEl && related && popEl.contains(related)) {
      insidePopover.current = true
      cancelAll()
      return
    }
    const target = (e.target as HTMLElement).closest('[data-nodeid]')
    if (target) scheduleHide()
  }, [cancelAll, scheduleHide])

  const handlePopoverEnter = useCallback(() => {
    insidePopover.current = true
    cancelAll()
  }, [cancelAll])

  const handlePopoverLeave = useCallback(() => {
    insidePopover.current = false
    scheduleHide()
  }, [scheduleHide])

  const handleClose = useCallback(() => {
    insidePopover.current = false
    cancelAll()
    setPopover(null)
  }, [cancelAll])

  return (
    <div onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>
      {children}
      {popover && (
        <Popover
          ref={popoverRef}
          data={popover}
          onMouseEnter={handlePopoverEnter}
          onMouseLeave={handlePopoverLeave}
          onClose={handleClose}
          nodeMap={nodeMap.current}
        />
      )}
    </div>
  )
}

const Popover = forwardRef<HTMLDivElement, {
  data: PopoverData
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClose: () => void
  nodeMap: Record<string, WikiNode>
}>(({ data, onMouseEnter, onMouseLeave, onClose, nodeMap }, ref) => {
  const { node, triggerRect } = data
  const cfg = META_TYPE_CONFIG[node.meta_type]
  const snippet = node.body_raw.replace(/\[\[([a-z0-9-]+)\]\]/g, '$1')
  const { overrideData, clientPath } = useWikiDataOverride()
  const pathname = usePathname()
  const isDetailPage = clientPath.startsWith('/node/') || pathname.startsWith('/node/')

  const pw = 360
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  let left: number
  let top: number
  const maxH = Math.min(vh - 32, 380)

  const spaceRight = vw - triggerRect.right - 12
  const spaceLeft = triggerRect.left - 12
  const canShowHorizontal = spaceRight >= pw || spaceLeft >= pw

  let useBottom = false
  let bottom = 0

  if (isDetailPage && !canShowHorizontal) {
    const triggerCenterX = (triggerRect.left + triggerRect.right) / 2
    left = Math.round(triggerCenterX - pw / 2)
    if (left + pw > vw - 8) left = vw - pw - 8
    if (left < 8) left = 8
    bottom = vh - triggerRect.top + 8
    top = 0
    useBottom = true
  } else {
    const showRight = spaceRight >= pw || spaceRight >= spaceLeft
    left = showRight ? triggerRect.right + 8 : triggerRect.left - pw - 8
    if (left + pw > vw - 8) left = vw - pw - 8
    if (left < 8) left = 8
    top = Math.min(Math.max(triggerRect.top - 20, 8), vh - maxH - 8)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onClose()
    if (overrideData) {
      window.dispatchEvent(new CustomEvent('mywiki:navigate', { detail: { nodeId: node.id } }))
    } else {
      window.location.href = `/node/${node.id}`
    }
  }

  return (
    <div
      ref={ref}
      className="fixed z-[100] w-[360px] max-w-[90vw] bg-white rounded-[10px] shadow-xl p-3.5 flex flex-col"
      style={{
        left,
        ...(useBottom ? { bottom } : { top }),
        maxHeight: maxH,
        border: '1px solid var(--border)',
        animation: 'fadeIn 0.12s ease',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="text-[14px] font-semibold mb-1.5 leading-tight flex items-center gap-1.5">
        <span className="w-[10px] h-[10px] rounded-full inline-block" style={{ background: cfg.color }} />
        {node.title}
      </div>
      <div className="text-[11px] mb-2 flex flex-wrap items-center gap-1.5 flex-shrink-0" style={{ color: 'var(--muted)' }}>
        <span>{cfg.icon} {cfg.label}</span>
        {node.meta_type === 'insight' && <InsightOriginChip origin={node.insight_origin} />}
        <span>· {node.status} · ←{node.metrics.in_degree} / →{node.metrics.out_degree}</span>
        {node.domains.length > 0 && <span>· {node.domains.join(' ')}</span>}
      </div>
      <div className="text-[13px] leading-relaxed overflow-y-auto flex-1 min-h-0" style={{ color: '#334155', overscrollBehavior: 'contain' }}>
        {snippet}
      </div>
      <a
        href="#"
        onClick={handleClick}
        className="block text-[11px] mt-2.5 pt-2 text-center hover:!bg-stone-50 rounded flex-shrink-0"
        style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}
      >
        点击跳转到详情 →
      </a>
    </div>
  )
})
Popover.displayName = 'Popover'
