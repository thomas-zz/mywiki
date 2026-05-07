import Link from 'next/link'
import type { MetaType, NodeStatus } from '@/lib/types'

const META_TYPE_CONFIG: Record<MetaType, { label: string; icon: string; color: string; chipBg: string }> = {
  observation: { label: '事实', icon: '👁', color: '#94a3b8', chipBg: 'background:#94a3b8' },
  insight: { label: '洞见', icon: '💡', color: '#6366f1', chipBg: 'background:#6366f1' },
  decision: { label: '主张', icon: '🎯', color: '#f59e0b', chipBg: 'background:#f59e0b' },
  question: { label: '疑问', icon: '❓', color: '#ef4444', chipBg: 'background:#ef4444' },
  comparison: { label: '辨析', icon: '⚖️', color: '#10b981', chipBg: 'background:#10b981' },
}

const STATUS_CONFIG: Record<NodeStatus, { label: string; cls: string }> = {
  seed: { label: '种子', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  growing: { label: '成长中', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  mature: { label: '成熟', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  'needs-split': { label: '待拆分', cls: 'bg-orange-50 text-orange-800 border-orange-200' },
  archived: { label: '已归档', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export { META_TYPE_CONFIG }

export function MetaTypeChip({ type }: { type: MetaType }) {
  const cfg = META_TYPE_CONFIG[type]
  return (
    <span className="inline-block px-1.5 py-0.5 rounded-full text-[11px] text-white leading-tight" style={{ background: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: NodeStatus }) {
  const cfg = STATUS_CONFIG[status]
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] border ${cfg.cls}`}>{cfg.label}</span>
}

export function NodeCard({ id, title, meta_type, status, domains, subtitle }: {
  id: string; title: string; meta_type: MetaType; status: NodeStatus; domains: string[]; subtitle?: string
}) {
  return (
    <Link href={`/node/${id}`} data-nodeid={id} className="block py-2 border-b border-gray-100 last:border-0 hover:bg-stone-50 transition-colors -mx-2 px-2 rounded">
      <div className="flex items-start gap-1.5">
        <span className="text-[13px] font-medium text-gray-900 hover:underline flex-1 min-w-0">{title}</span>
        <span className="flex items-center gap-1 flex-shrink-0">
          <MetaTypeChip type={meta_type} />
          <StatusBadge status={status} />
        </span>
      </div>
      {subtitle && <div className="text-[11px] text-gray-400 mt-0.5">{subtitle}</div>}
      {!subtitle && domains.length > 0 && (
        <div className="text-[11px] text-gray-400 mt-0.5">{domains.join(' · ')}</div>
      )}
    </Link>
  )
}
