'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useWikiData } from '@/lib/WikiDataContext'
import { buildDomainTree } from '@/lib/domainTree'
import { DomainTree } from '@/components/DomainTree'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/timeline', label: '时间线' },
  { href: '/graph', label: '全局图谱' },
  { href: '/emergence', label: '涌现 · 自进化' },
  { href: '/all', label: '全部节点' },
  { href: '/changelog', label: '更新日志' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const data = useWikiData()

  const domainTree = useMemo(() => buildDomainTree(data.domainMap), [data.domainMap])

  const content = (
    <div className="px-[18px] py-5 flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Link href="/" onClick={() => setOpen(false)} style={{ borderBottom: 'none', color: 'var(--text)' }}>
          <h1 className="text-[18px] font-semibold tracking-wide m-0" style={{ color: 'var(--text)' }}>myWiki</h1>
        </Link>

        <div className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>视图</div>
        <nav className="mb-4">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-2 py-1.5 rounded-[5px] text-[13px] my-0.5 transition-colors"
                style={{
                  borderBottom: 'none',
                  color: isActive ? 'var(--active-text)' : 'var(--text)',
                  background: isActive ? 'var(--active-bg)' : undefined,
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>领域</div>
        <DomainTree nodes={domainTree} onNavigate={() => setOpen(false)} />
      </div>
      <div className="shrink-0 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <ThemeToggle />
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 lg:hidden w-9 h-9 flex items-center justify-center rounded-md border"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        aria-label="Toggle menu"
      >
        <span className="text-[16px]">{open ? '✕' : '☰'}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-[260px] overflow-y-auto transition-transform lg:sticky lg:translate-x-0 lg:border-r
          ${open ? 'translate-x-0 shadow-lg' : '-translate-x-full'}
        `}
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {content}
      </aside>
    </>
  )
}
