import { buildWikiData } from '@/lib/parser'
import { NodeCard } from '@/components/NodeCard'
import { BackBar } from '@/components/BackBar'

export default async function EmergencePage() {
  const data = await buildWikiData()
  const { emergence } = data

  const sections = [
    { title: '🪐 hub 节点（按入链）', nodes: emergence.hubs, sub: (n: any) => `← ${n.metrics.in_degree} 入链` },
    { title: '🌐 跨域 hub（连接不同领域）', nodes: emergence.crossDomainHubs, sub: (n: any) => n.domains.join(' + ') },
    { title: '❓ 开放问题积压', nodes: emergence.openQuestions, sub: (n: any) => `${n.metrics.in_degree} 入链` },
    { title: '⚠️ 候选拆分（overload signal）', nodes: emergence.overloadCandidates, sub: (n: any) => `正文 ${n.body_raw.length} 字 · ${n.metrics.in_degree} 入链` },
    { title: '🕒 最近更新', nodes: emergence.recentUpdates, sub: (n: any) => n.updated },
    { title: '🏝 孤岛节点（无入无出）', nodes: emergence.orphans, sub: () => '未连接' },
  ]

  return (
    <div>
      <BackBar />
      <h2 className="text-[22px] font-semibold mt-0 mb-2">涌现 · 自进化</h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
        这一页展示 wiki 自身的形状变化。<br />它不是导航——是给你看见自己思考的镜子。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map(s => (
          <div key={s.title} className="bg-white border rounded-[10px] p-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-[13px] font-semibold mb-3">{s.title}</h3>
            {s.nodes.length > 0 ? (
              <div>{s.nodes.map(n => <NodeCard key={n.id} {...n} subtitle={s.sub(n)} />)}</div>
            ) : (
              <p className="text-[13px] italic" style={{ color: 'var(--muted)' }}>—</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
