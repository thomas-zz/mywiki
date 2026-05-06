import { buildWikiData } from '@/lib/parser'
import { NodeCard } from '@/components/NodeCard'
import { META_TYPE_CONFIG } from '@/components/NodeCard'
import type { MetaType } from '@/lib/types'

export default async function HomePage() {
  const data = await buildWikiData()
  const { emergence } = data

  const growing = data.nodes.filter(n => n.status === 'seed' || n.status === 'growing')

  const sections = [
    { title: '🕒 最近更新', nodes: emergence.recentUpdates, sub: (n: any) => `更新于 ${n.updated}` },
    { title: '🌱 正在生长', nodes: growing.slice(0, 6), sub: (n: any) => n.status === 'seed' ? '种子' : '成长中' },
    { title: '🪐 入口 hub（最多被引用）', nodes: emergence.hubs, sub: (n: any) => `← ${n.metrics.in_degree} 入链` },
    { title: '🌐 跨领域节点', nodes: emergence.crossDomainHubs, sub: (n: any) => n.domains.join(' · ') },
    { title: '❓ 开放问题', nodes: emergence.openQuestions, sub: (n: any) => n.body_raw.slice(0, 60).replace(/\n/g, '') },
  ]

  return (
    <div>
      <h2 className="text-[22px] font-semibold mt-0 mb-2">欢迎回来</h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
        共 {data.nodes.length} 个节点。这里展示当前你脑中的形状——hub、跨域连接、悬而未决的问题。
      </p>

      <div className="flex flex-wrap gap-2 text-[12px] mb-8" style={{ color: 'var(--muted)' }}>
        {(Object.entries(META_TYPE_CONFIG) as [MetaType, typeof META_TYPE_CONFIG[MetaType]][]).map(([key, cfg]) => (
          <span key={key} className="inline-flex items-center gap-1">
            <span className="w-[9px] h-[9px] rounded-full inline-block" style={{ background: cfg.color }} />
            {cfg.icon} {cfg.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map(section => (
          section.nodes.length > 0 && (
            <div key={section.title} className="bg-white border rounded-[10px] p-5" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-[13px] font-semibold mb-3 text-gray-800">{section.title}</h3>
              <div>
                {section.nodes.map(node => (
                  <NodeCard key={node.id} {...node} subtitle={section.sub(node)} />
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
