'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const initial = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(initial as 'light' | 'dark')
  }, [])

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
  }

  return (
    <button
      onClick={toggle}
      className="mt-4 px-2 py-1.5 rounded-[5px] text-[13px] w-full text-left transition-colors"
      style={{ color: 'var(--muted)' }}
      title={theme === 'light' ? '切换深色模式' : '切换浅色模式'}
    >
      {theme === 'light' ? '☽ 深色模式' : '☀ 浅色模式'}
    </button>
  )
}
