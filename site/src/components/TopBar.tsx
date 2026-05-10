'use client'

import { SearchBox } from './SearchBox'
import { DataSourcePicker } from './DataSourcePicker'
import { useWikiData } from '@/lib/WikiDataContext'

export function TopBar() {
  const data = useWikiData()

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur px-4 lg:px-[56px] py-2.5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <SearchBox nodes={data.nodes} />
      <DataSourcePicker />
    </div>
  )
}
