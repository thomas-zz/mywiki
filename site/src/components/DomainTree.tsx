'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { domainToSlug } from '@/lib/domain'
import type { DomainTreeNode } from '@/lib/domainTree'

function TreeItem({ node, depth, onNavigate }: { node: DomainTreeNode; depth: number; onNavigate?: () => void }) {
  const [expanded, setExpanded] = useState(depth === 0)
  const pathname = usePathname()
  const slug = domainToSlug(node.fullPath)
  const domainPath = `/domain/${slug}`
  const hasChildren = node.children.length > 0
  const isActive = pathname === domainPath

  return (
    <div>
      <div className="flex items-center group" style={{ paddingLeft: `${depth * 12}px` }}>
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-4 h-4 flex items-center justify-center text-[10px] shrink-0 rounded hover:bg-[var(--hover)]"
            style={{ color: 'var(--muted)' }}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Link
          href={domainPath}
          onClick={onNavigate}
          className="flex-1 px-1.5 py-1 rounded-[5px] text-[13px] transition-colors truncate"
          style={{
            borderBottom: 'none',
            color: isActive ? 'var(--active-text)' : 'var(--text)',
            background: isActive ? 'var(--active-bg)' : undefined,
          }}
        >
          {node.label}
          <span className="text-[11px] ml-1" style={{ color: 'var(--muted)' }}>{node.totalCount}</span>
        </Link>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map(child => (
            <TreeItem key={child.fullPath} node={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

export function DomainTree({ nodes, onNavigate }: { nodes: DomainTreeNode[]; onNavigate?: () => void }) {
  return (
    <div>
      {nodes.map(node => (
        <TreeItem key={node.fullPath} node={node} depth={0} onNavigate={onNavigate} />
      ))}
    </div>
  )
}
