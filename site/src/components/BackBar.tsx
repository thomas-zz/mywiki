import Link from 'next/link'

export function BackBar({ title }: { title?: string }) {
  return (
    <div className="mb-6">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
        ← 返回首页
      </Link>
      {title && <h1 className="text-2xl font-bold text-gray-900 mt-2">{title}</h1>}
    </div>
  )
}
