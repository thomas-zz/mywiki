'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useWikiDataOverride } from '@/lib/WikiDataContext'

function domainToSlugClient(domain: string): string {
  return btoa(unescape(encodeURIComponent(domain))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/graph', label: '全局图谱' },
  { href: '/emergence', label: '涌现 · 自进化' },
  { href: '/all', label: '全部节点' },
]

function NavLink({ href, active, onClick, children }: {
  href: string; active: boolean; onClick?: () => void; children: React.ReactNode
}) {
  const { overrideData, navigateTo } = useWikiDataOverride()

  const className = `block px-2 py-1.5 rounded-[5px] text-[13px] my-0.5 transition-colors hover:!bg-stone-100 ${
    active ? '!bg-amber-200' : ''
  }`

  if (overrideData) {
    return (
      <a
        href={href}
        className={className}
        style={{ borderBottom: 'none', color: 'var(--text)' }}
        onClick={(e) => { e.preventDefault(); navigateTo(href); onClick?.() }}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={href} onClick={onClick} className={className} style={{ borderBottom: 'none', color: 'var(--text)' }}>
      {children}
    </Link>
  )
}

export function Sidebar({ domains }: { domains: { label: string; slug: string; count: number }[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { overrideData, clientPath } = useWikiDataOverride()

  const activePath = overrideData ? clientPath : pathname

  const effectiveDomains = overrideData
    ? Object.keys(overrideData.domainMap).sort().map(d => ({
        label: d,
        slug: domainToSlugClient(d),
        count: overrideData.domainMap[d].length,
      }))
    : domains

  const content = (
    <div className="px-[18px] py-5">
      <NavLink href="/" active={false} onClick={() => setOpen(false)}>
        <h1 className="text-[18px] font-semibold tracking-wide text-gray-900 m-0">myWiki</h1>
      </NavLink>
      <p className="text-[12px] mb-6" style={{ color: 'var(--muted)' }}>个人理解的镜子 · 不是博客</p>

      <div className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>视图</div>
      <nav className="mb-4">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.href}
            href={item.href}
            active={activePath === item.href}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>领域</div>
      <div>
        {effectiveDomains.map(({ label, slug, count }) => {
          const domainPath = `/domain/${slug}`
          return (
            <NavLink
              key={label}
              href={domainPath}
              active={activePath === domainPath}
              onClick={() => setOpen(false)}
            >
              {label} <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{count}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 lg:hidden w-9 h-9 flex items-center justify-center rounded-md bg-white border"
        style={{ borderColor: 'var(--border)' }}
        aria-label="Toggle menu"
      >
        <span className="text-[16px]">{open ? '✕' : '☰'}</span>
      </button>

      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar - desktop always visible, mobile slide-in */}
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
