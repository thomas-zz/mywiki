'use client'

import { SearchBox } from './SearchBox'
import { DataSourcePicker } from './DataSourcePicker'
import { useWikiData } from '@/lib/WikiDataContext'
import { useWikiDataSources } from '@/lib/WikiDataContext'

export function TopBar() {
  const data = useWikiData()
  const { refreshActive, refreshing, activeSourceId } = useWikiDataSources()

  return (
    <div className="sticky top-0 z-30 backdrop-blur px-4 lg:px-[56px] py-2.5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}>
      <SearchBox nodes={data.nodes} />
      {activeSourceId && (
        <button
          onClick={() => refreshActive()}
          disabled={refreshing}
          title="从数据源刷新"
          className="p-1.5 rounded-md hover:bg-[var(--hover)] transition-colors disabled:opacity-40"
          style={{ color: 'var(--muted)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
        </button>
      )}
      <DataSourcePicker />
    </div>
  )
}
