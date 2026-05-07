'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useWikiData } from '@/lib/WikiDataContext'
import { domainToSlug } from '@/lib/domain'

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/graph', label: '全局图谱' },
  { href: '/emergence', label: '涌现 · 自进化' },
  { href: '/all', label: '全部节点' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const data = useWikiData()

  const domains = Object.keys(data.domainMap).sort().map(d => ({
    label: d,
    slug: domainToSlug(d),
    count: data.domainMap[d].length,
  }))

  const content = (
    <div className="px-[18px] py-5">
      <Link href="/" onClick={() => setOpen(false)} style={{ borderBottom: 'none', color: 'var(--text)' }}>
        <h1 className="text-[18px] font-semibold tracking-wide text-gray-900 m-0">myWiki</h1>
      </Link>
      <p className="text-[12px] mb-6" style={{ color: 'var(--muted)' }}>个人理解的镜子 · 不是博客</p>

      <div className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>视图</div>
      <nav className="mb-4">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`block px-2 py-1.5 rounded-[5px] text-[13px] my-0.5 transition-colors hover:!bg-stone-100 ${
              pathname === item.href ? '!bg-amber-200' : ''
            }`}
            style={{ borderBottom: 'none', color: 'var(--text)' }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>领域</div>
      <div>
        {domains.map(({ label, slug, count }) => {
          const domainPath = `/domain/${slug}`
          return (
            <Link
              key={label}
              href={domainPath}
              onClick={() => setOpen(false)}
              className={`block px-2 py-1.5 rounded-[5px] text-[13px] my-0.5 transition-colors hover:!bg-stone-100 ${
                pathname === domainPath ? '!bg-amber-200' : ''
              }`}
              style={{ borderBottom: 'none', color: 'var(--text)' }}
            >
              {label} <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{count}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 lg:hidden w-9 h-9 flex items-center justify-center rounded-md bg-white border"
        style={{ borderColor: 'var(--border)' }}
        aria-label="Toggle menu"
      >
        <span className="text-[16px]">{open ? '✕' : '☰'}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-[260px] bg-white overflow-y-auto transition-transform lg:sticky lg:translate-x-0 lg:border-r
          ${open ? 'translate-x-0 shadow-lg' : '-translate-x-full'}
        `}
        style={{ borderColor: 'var(--border)' }}
      >
        {content}
      </aside>
    </>
  )
}
