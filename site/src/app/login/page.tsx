'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError(data.error || '密码错误')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-[360px]">
        <div className="text-center mb-8">
          <h1 className="text-[24px] font-semibold tracking-wide mb-1">myWiki</h1>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>请输入密码以继续</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--border)' }}>
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码"
              autoFocus
              className="w-full px-4 py-3 text-[14px] rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-shadow"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full py-2.5 text-[14px] font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '验证中...' : '进入'}
          </button>
        </form>

        <p className="text-center mt-4 text-[11px]" style={{ color: 'var(--muted)' }}>
          密码有效期 7 天
        </p>
      </div>
    </div>
  )
}
