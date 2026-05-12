import Link from 'next/link'

export function BackBar({ title }: { title?: string }) {
  return (
    <div className="mb-6">
      <Link href="/" className="text-sm transition-colors" style={{ color: 'var(--muted)' }}>
        ← 返回首页
      </Link>
      {title && <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--text)' }}>{title}</h1>}
    </div>
  )
}
