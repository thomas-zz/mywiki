'use client'

import { useMemo } from 'react'
import { useWikiData } from '@/lib/WikiDataContext'
import { NodeCard } from '@/components/NodeCard'
import { BackBar } from '@/components/BackBar'
import Link from 'next/link'
import type { WikiNode } from '@/lib/types'

function findRelatedInsights(question: WikiNode, allNodes: WikiNode[]): WikiNode[] {
  const qWords = new Set(question.title.split(/\s+/).filter(w => w.length > 1))
  const qDomains = new Set(question.domains)
  return allNodes
    .filter(n => n.meta_type === 'insight' && n.id !== question.id)
    .map(n => {
      let score = 0
      for (const d of n.domains) if (qDomains.has(d)) score += 3
      for (const w of n.title.split(/\s+/)) if (qWords.has(w)) score += 1
      return { node: n, score }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.node)
}

function suggestSplitTopics(node: WikiNode): string[] {
  const headings = node.body_raw.match(/^#{2,3}\s+.+$/gm)
  if (!headings || headings.length < 2) return []
  return headings.map(h => h.replace(/^#{2,3}\s+/, '').trim())
}

function findRelatedCandidates(orphan: WikiNode, allNodes: WikiNode[]): WikiNode[] {
  const words = new Set(orphan.title.split(/\s+/).filter(w => w.length > 1))
  const domains = new Set(orphan.domains)
  return allNodes
    .filter(n => n.id !== orphan.id && n.metrics.in_degree > 0)
    .map(n => {
      let score = 0
      for (const d of n.domains) if (domains.has(d)) score += 2
      for (const w of n.title.split(/\s+/)) if (words.has(w)) score += 1
      return { node: n, score }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(r => r.node)
}

export function EmergenceView() {
  const data = useWikiData()
  const { emergence } = data

  const enrichedQuestions = useMemo(() =>
    emergence.openQuestions.map(q => ({
      node: q,
      relatedInsights: findRelatedInsights(q, data.nodes),
    })),
  [emergence.openQuestions, data.nodes])

  const enrichedOverload = useMemo(() =>
    emergence.overloadCandidates.map(n => ({
      node: n,
      splitTopics: suggestSplitTopics(n),
    })),
  [emergence.overloadCandidates])

  const enrichedOrphans = useMemo(() =>
    emergence.orphans.map(n => ({
      node: n,
      candidates: findRelatedCandidates(n, data.nodes),
    })),
  [emergence.orphans, data.nodes])

  return (
    <div>
      <BackBar />
      <h2 className="text-[22px] font-semibold mt-0 mb-2">涌现 · 自进化</h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
        这一页展示 wiki 自身的形状变化。<br />它不是导航——是给你看见自己思考的镜子。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-[10px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-[13px] font-semibold mb-3">🪐 hub 节点（按入链）</h3>
          {emergence.hubs.length > 0
            ? <div>{emergence.hubs.map(n => <NodeCard key={n.id} {...n} subtitle={`← ${n.metrics.in_degree} 入链`} />)}</div>
            : <p className="text-[13px] italic" style={{ color: 'var(--muted)' }}>—</p>}
        </div>

        <div className="border rounded-[10px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-[13px] font-semibold mb-3">🌐 跨域 hub（连接不同领域）</h3>
          {emergence.crossDomainHubs.length > 0
            ? <div>{emergence.crossDomainHubs.map(n => <NodeCard key={n.id} {...n} subtitle={n.domains.join(' + ')} />)}</div>
            : <p className="text-[13px] italic" style={{ color: 'var(--muted)' }}>—</p>}
        </div>

        <div className="border rounded-[10px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-[13px] font-semibold mb-3">❓ 开放问题</h3>
          {enrichedQuestions.length > 0 ? (
            <div>
              {enrichedQuestions.map(({ node: q, relatedInsights }) => (
                <div key={q.id}>
                  <NodeCard {...q} subtitle={`${q.metrics.in_degree} 入链`} />
                  {relatedInsights.length > 0 && (
                    <div className="ml-6 mb-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                      💡 相关洞见：{relatedInsights.map(i => (
                        <Link key={i.id} href={`/node/${i.id}`} className="mr-2 underline" style={{ color: 'var(--accent)' }}>{i.title}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="text-[13px] italic" style={{ color: 'var(--muted)' }}>—</p>}
        </div>

        <div className="border rounded-[10px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-[13px] font-semibold mb-3">⚠️ 候选拆分</h3>
          {enrichedOverload.length > 0 ? (
            <div>
              {enrichedOverload.map(({ node: n, splitTopics }) => (
                <div key={n.id}>
                  <NodeCard {...n} subtitle={`正文 ${n.body_raw.length} 字 · ${n.metrics.in_degree} 入链`} />
                  {splitTopics.length > 0 && (
                    <div className="ml-6 mb-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                      ✂️ 可拆分为：{splitTopics.map((t, i) => <span key={i} className="mr-2 px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)' }}>{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="text-[13px] italic" style={{ color: 'var(--muted)' }}>—</p>}
        </div>

        <div className="border rounded-[10px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-[13px] font-semibold mb-3">🕒 最近更新</h3>
          {emergence.recentUpdates.length > 0
            ? <div>{emergence.recentUpdates.map(n => <NodeCard key={n.id} {...n} subtitle={n.updated} />)}</div>
            : <p className="text-[13px] italic" style={{ color: 'var(--muted)' }}>—</p>}
        </div>

        <div className="border rounded-[10px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-[13px] font-semibold mb-3">🏝 孤岛节点</h3>
          {enrichedOrphans.length > 0 ? (
            <div>
              {enrichedOrphans.map(({ node: n, candidates }) => (
                <div key={n.id}>
                  <NodeCard {...n} subtitle="未连接" />
                  {candidates.length > 0 && (
                    <div className="ml-6 mb-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                      🔗 可能相关：{candidates.map(c => (
                        <Link key={c.id} href={`/node/${c.id}`} className="mr-2 underline" style={{ color: 'var(--accent)' }}>{c.title}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="text-[13px] italic" style={{ color: 'var(--muted)' }}>—</p>}
        </div>
      </div>
    </div>
  )
}
