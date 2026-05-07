'use client'

import { SearchBox } from './SearchBox'
import { FolderPicker } from './FolderPicker'
import { useWikiDataOverride } from '@/lib/WikiDataContext'
import type { WikiNode, WikiData } from '@/lib/types'

export function TopBar({ nodes }: { nodes: WikiNode[] }) {
  const { overrideData, overrideFolderName, setOverrideData, clearOverride } = useWikiDataOverride()

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur px-4 lg:px-[56px] py-2.5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <SearchBox nodes={overrideData?.nodes || nodes} />
      <FolderPicker onDataLoaded={(data: WikiData, folderName: string) => setOverrideData(data, folderName)} />
      {overrideData && (
        <button
          onClick={clearOverride}
          className="px-2 py-1 text-[12px] rounded border hover:bg-red-50 text-red-500 whitespace-nowrap flex-shrink-0"
          style={{ borderColor: '#fca5a5' }}
        >
          ✕ 清除
        </button>
      )}
    </div>
  )
}
