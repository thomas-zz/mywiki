import { buildWikiData } from '@/lib/parser'
import { GlobalGraph } from '@/components/GlobalGraph'
import { META_TYPE_CONFIG } from '@/components/NodeCard'
import type { MetaType } from '@/lib/types'

export default async function GraphPage() {
  const data = await buildWikiData()

  return (
    <div className="-mx-4 lg:-mx-[56px] -my-6 lg:-my-8 relative">
      <div className="absolute top-3 right-3 z-10 bg-white border rounded-lg px-3 py-2 text-[12px]" style={{ borderColor: 'var(--border)' }}>
        <div className="font-semibold text-[11px] mb-1.5">元类型</div>
        {(Object.entries(META_TYPE_CONFIG) as [MetaType, typeof META_TYPE_CONFIG[MetaType]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 my-1">
            <span className="w-[10px] h-[10px] rounded-full" style={{ background: cfg.color }} />
            <span>{cfg.icon} {cfg.label}</span>
          </div>
        ))}
      </div>
      <GlobalGraph nodes={data.nodes} edges={data.edges} />
    </div>
  )
}
