'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { WikiNode } from '@/lib/types'
import { parseMarkdownToNode, buildWikiDataFromNodes } from '@/lib/clientParser'
import { useWikiDataSources } from '@/lib/WikiDataContext'

function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string; path: string } | null {
  const cleaned = url.replace(/^https?:\/\//, '')
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+)\/?(.*)?)?$/)
  if (!match) return null
  return { owner: match[1], repo: match[2], branch: match[3] || '', path: match[4] || '' }
}

interface GHEntry {
  name: string
  path: string
  type: 'file' | 'dir'
}

const GH_TOKEN_KEY = 'mywiki-gh-token'

export function DataSourcePicker() {
  const { sources, activeSourceId, addSource, switchSource, removeSource, refreshing } = useWikiDataSources()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'list' | 'add'>('list')
  const [tab, setTab] = useState<'github' | 'local'>('github')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [ghToken, setGhToken] = useState('')
  const [showTokenHelp, setShowTokenHelp] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const [browseEntries, setBrowseEntries] = useState<GHEntry[]>([])
  const [browsePath, setBrowsePath] = useState<string[]>([])
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; branch: string } | null>(null)
  const [browseLoading, setBrowseLoading] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(GH_TOKEN_KEY)
    if (saved) setGhToken(saved)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })

  const saveToken = (token: string) => {
    setGhToken(token)
    if (token) localStorage.setItem(GH_TOKEN_KEY, token)
    else localStorage.removeItem(GH_TOKEN_KEY)
  }

  const getHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {}
    if (ghToken) h['Authorization'] = `token ${ghToken}`
    return h
  }, [ghToken])

  const closeModal = () => {
    setOpen(false)
    setError(null)
    setBrowsing(false)
    setBrowseEntries([])
    setBrowsePath([])
    setRepoInfo(null)
    setShowTokenHelp(false)
    setProgress('')
    setView('list')
  }

  const processFiles = useCallback(async (files: { name: string; content: string }[], label: string, type: 'github' | 'local', config?: { owner: string; repo: string; branch: string; path: string }) => {
    const nodeMap = new Map<string, WikiNode>()
    const failedFiles: string[] = []
    for (const file of files) {
      const node = parseMarkdownToNode(file.name, file.content)
      if (node) nodeMap.set(node.id, node)
      else failedFiles.push(file.name)
    }
    if (nodeMap.size === 0) {
      setError(`未找到有效节点（${files.length} 个 .md 文件）`)
      setLoading(false)
      setProgress('')
      return
    }
    const data = buildWikiDataFromNodes(nodeMap)
    await addSource(data, label, type, config)
    setLoading(false)
    setProgress('')
    closeModal()
  }, [addSource])

  const pickFolder = useCallback(async () => {
    try {
      // @ts-expect-error File System Access API
      const dirHandle = await window.showDirectoryPicker()
      setLoading(true)
      setError(null)
      setProgress('扫描文件...')
      let nodesDir: FileSystemDirectoryHandle
      try { nodesDir = await dirHandle.getDirectoryHandle('nodes') } catch { nodesDir = dirHandle }
      const files: { name: string; content: string }[] = []
      for await (const entry of (nodesDir as any).values()) {
        if (entry.kind !== 'file' || !entry.name.endsWith('.md')) continue
        const file = await entry.getFile()
        files.push({ name: entry.name, content: await file.text() })
        setProgress(`读取文件... (${files.length})`)
      }
      await processFiles(files, dirHandle.name, 'local')
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setError(e.message || '读取失败')
      setLoading(false)
    }
  }, [processFiles])

  const fetchDir = useCallback(async (owner: string, repo: string, branch: string, dirPath: string) => {
    setBrowseLoading(true)
    setError(null)
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`
      const res = await fetch(apiUrl, { headers: getHeaders() })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 401 || res.status === 403) throw new Error('无权访问，请设置 GitHub Token')
        throw new Error(errData.message || `GitHub API 返回 ${res.status}`)
      }
      const listing: any[] = await res.json()
      const entries: GHEntry[] = listing
        .filter((f: any) => f.type === 'dir' || (f.type === 'file' && f.name.endsWith('.md')))
        .map((f: any) => ({ name: f.name, path: f.path, type: f.type }))
        .sort((a: GHEntry, b: GHEntry) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      setBrowseEntries(entries)
    } catch (e: any) {
      setError(e.message || '获取目录失败')
    } finally {
      setBrowseLoading(false)
    }
  }, [getHeaders])

  const loadCurrentDir = useCallback(async (owner: string, repo: string, branch: string, dirPath: string) => {
    setLoading(true)
    setError(null)
    const label = `${owner}/${repo}${dirPath ? '/' + dirPath : ''}`
    try {
      setProgress('获取文件列表...')
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`
      const res = await fetch(apiUrl, { headers: getHeaders() })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `GitHub API 返回 ${res.status}`)
      }
      const listing: any[] = await res.json()
      const mdFiles = listing.filter((f: any) => f.type === 'file' && f.name.endsWith('.md'))
      if (mdFiles.length === 0) throw new Error('该目录下没有 .md 文件')

      const files: { name: string; content: string }[] = []
      const batchSize = 5
      for (let i = 0; i < mdFiles.length; i += batchSize) {
        const batch = mdFiles.slice(i, i + batchSize)
        setProgress(`下载文件... (${files.length}/${mdFiles.length})`)
        const results = await Promise.all(
          batch.map(async (f: any) => {
            const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${f.path}?ref=${branch}`
            const r = await fetch(fileUrl, { headers: { ...getHeaders(), 'Accept': 'application/vnd.github.v3.raw' } })
            if (!r.ok) throw new Error(`下载 ${f.name} 失败 (${r.status})`)
            return { name: f.name, content: await r.text() }
          })
        )
        files.push(...results)
      }
      await processFiles(files, label, 'github', { owner, repo, branch, path: dirPath })
    } catch (e: any) {
      setError(e.message || '加载失败')
      setLoading(false)
      setProgress('')
    }
  }, [processFiles, getHeaders])

  const connectRepo = useCallback(async (url: string) => {
    const parsed = parseGitHubUrl(url.trim())
    if (!parsed) { setError('无效的 GitHub URL，格式: github.com/owner/repo'); return }
    const { owner, repo, branch, path } = parsed
    const resolvedBranch = branch || 'main'
    setRepoInfo({ owner, repo, branch: resolvedBranch })
    setBrowsing(true)
    const pathParts = path ? path.split('/').filter(Boolean) : []
    setBrowsePath(pathParts)
    await fetchDir(owner, repo, resolvedBranch, pathParts.join('/'))
  }, [fetchDir])

  const navigateToDir = async (dirName: string) => {
    if (!repoInfo) return
    const newPath = [...browsePath, dirName]
    setBrowsePath(newPath)
    await fetchDir(repoInfo.owner, repoInfo.repo, repoInfo.branch, newPath.join('/'))
  }

  const navigateToBreadcrumb = async (index: number) => {
    if (!repoInfo) return
    const newPath = browsePath.slice(0, index)
    setBrowsePath(newPath)
    await fetchDir(repoInfo.owner, repoInfo.repo, repoInfo.branch, newPath.join('/'))
  }

  const mdCountInView = browseEntries.filter(e => e.type === 'file').length
  const dirCountInView = browseEntries.filter(e => e.type === 'dir').length

  const activeSource = sources.find(s => s.id === activeSourceId)

  function formatTime(ts: number) {
    const d = new Date(ts)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 text-[13px] rounded-md border transition-all hover:bg-stone-50 hover:shadow-sm whitespace-nowrap flex items-center gap-1.5"
          style={{ borderColor: 'var(--border)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {activeSource ? activeSource.label : '选择数据源'}
          {refreshing && (
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
          )}
        </button>
      </div>

      {open && createPortal(
        <div
          ref={backdropRef}
          onClick={e => { if (e.target === backdropRef.current) closeModal() }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[85vh] flex flex-col overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[15px] font-semibold">
                {view === 'list' ? '数据源' : '添加数据源'}
              </h2>
              <div className="flex items-center gap-1">
                {view === 'add' && (
                  <button
                    onClick={() => { setView('list'); setError(null); setBrowsing(false); setBrowseEntries([]); setBrowsePath([]); setRepoInfo(null) }}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-stone-100 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                  </button>
                )}
                <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-stone-100 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* ===== SOURCE LIST VIEW ===== */}
              {view === 'list' && (
                <div>
                  {sources.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <p className="text-[13px] text-gray-500 mb-1">暂无数据源</p>
                      <p className="text-[12px] text-gray-400 mb-4">当前展示的是内置示例数据</p>
                      <button
                        onClick={() => setView('add')}
                        className="px-4 py-2 text-[13px] font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                      >
                        添加数据源
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {sources.map(s => (
                          <div
                            key={s.id}
                            onClick={() => { switchSource(s.id); closeModal() }}
                            className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-colors group cursor-pointer ${
                              s.id === activeSourceId ? 'bg-amber-50' : 'hover:bg-stone-50'
                            }`}
                          >
                            {/* Icon */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              s.id === activeSourceId ? 'bg-amber-100' : 'bg-stone-100'
                            }`}>
                              {s.type === 'github' ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill={s.id === activeSourceId ? '#d97706' : '#78716c'}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.id === activeSourceId ? '#d97706' : '#78716c'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                </svg>
                              )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className={`text-[13px] truncate ${s.id === activeSourceId ? 'font-medium text-amber-800' : 'text-gray-700'}`}>
                                {s.label}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {formatTime(s.savedAt)}
                              </div>
                            </div>
                            {/* Active indicator */}
                            {s.id === activeSourceId && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-700 font-medium shrink-0">当前</span>
                            )}
                            {/* Delete */}
                            <button
                              onClick={e => { e.stopPropagation(); removeSource(s.id) }}
                              className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              title="删除"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Add button */}
                      <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button
                          onClick={() => setView('add')}
                          className="w-full py-2 text-[13px] text-gray-500 hover:text-gray-700 rounded-lg border border-dashed hover:border-gray-400 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          添加数据源
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== ADD SOURCE VIEW ===== */}
              {view === 'add' && (
                <div>
                  {/* Tabs */}
                  <div className="flex border-b px-5" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => { setTab('github'); setError(null); setBrowsing(false); setBrowseEntries([]); setBrowsePath([]); setRepoInfo(null) }}
                      className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                        tab === 'github' ? 'border-amber-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                        GitHub 仓库
                      </span>
                    </button>
                    <button
                      onClick={() => { setTab('local'); setError(null) }}
                      className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                        tab === 'local' ? 'border-amber-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        本地文件夹
                      </span>
                    </button>
                  </div>

                  <div className="px-5 py-4">
                    {tab === 'github' && !browsing && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[12px] font-medium text-gray-500 mb-1.5">仓库地址</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="github.com/owner/repo"
                              value={githubUrl}
                              onChange={e => setGithubUrl(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && githubUrl.trim()) connectRepo(githubUrl) }}
                              autoFocus
                              className="flex-1 px-3 py-2 text-[13px] rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-shadow"
                              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                            />
                            <button
                              onClick={() => githubUrl.trim() && connectRepo(githubUrl)}
                              disabled={!githubUrl.trim() || browseLoading}
                              className="px-4 py-2 text-[13px] font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                              连接
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <label className="text-[12px] font-medium text-gray-500">访问令牌</label>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 text-gray-400">可选</span>
                            <button onClick={() => setShowTokenHelp(!showTokenHelp)} className="text-[11px] text-amber-600 hover:text-amber-700 underline underline-offset-2">如何获取？</button>
                          </div>
                          <input
                            type="password"
                            placeholder="ghp_xxxxxxxxxxxx"
                            value={ghToken}
                            onChange={e => saveToken(e.target.value)}
                            className="w-full px-3 py-2 text-[13px] rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-shadow"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                          />
                        </div>
                        {showTokenHelp && (
                          <div className="rounded-lg p-3 text-[12px] leading-relaxed bg-amber-50 border border-amber-200">
                            <div className="font-medium text-amber-800 mb-1">获取 GitHub Personal Access Token</div>
                            <ol className="list-decimal pl-4 space-y-0.5 text-amber-700">
                              <li>前往 <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:!bg-transparent">github.com/settings/tokens</a> → Generate new token</li>
                              <li>Repository access 选择要访问的仓库</li>
                              <li>Permissions → Contents → <strong>Read-only</strong></li>
                              <li>生成后复制粘贴到上方输入框</li>
                            </ol>
                            <div className="mt-1.5 text-amber-600 flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                              Token 仅保存在浏览器本地，不会上传服务器
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Directory browser */}
                    {tab === 'github' && browsing && repoInfo && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1 text-[12px] flex-wrap">
                          <button onClick={() => { setBrowsing(false); setBrowseEntries([]); setBrowsePath([]); setRepoInfo(null) }} className="text-gray-400 hover:text-gray-600" title="返回输入">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                          </button>
                          <button onClick={() => navigateToBreadcrumb(0)} className="text-amber-600 hover:text-amber-700 font-medium">{repoInfo.owner}/{repoInfo.repo}</button>
                          {browsePath.map((seg, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <span className="text-gray-300">/</span>
                              <button onClick={() => navigateToBreadcrumb(i + 1)} className={`hover:text-amber-700 ${i === browsePath.length - 1 ? 'text-gray-900 font-medium' : 'text-amber-600'}`}>{seg}</button>
                            </span>
                          ))}
                        </div>

                        {mdCountInView > 0 && (
                          <button
                            onClick={() => loadCurrentDir(repoInfo.owner, repoInfo.repo, repoInfo.branch, browsePath.join('/'))}
                            disabled={loading}
                            className="w-full py-2.5 text-[13px] font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                          >
                            加载此目录（{mdCountInView} 个 .md 文件）
                          </button>
                        )}

                        {browseLoading ? (
                          <div className="flex items-center justify-center py-8 text-[12px] text-gray-400 gap-2">
                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                            加载目录...
                          </div>
                        ) : (
                          <div className="rounded-lg border overflow-hidden max-h-[280px] overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                            {browseEntries.length === 0 && <div className="px-3 py-6 text-center text-[12px] text-gray-400">此目录为空</div>}
                            {browseEntries.map(entry => (
                              entry.type === 'dir' ? (
                                <button key={entry.path} onClick={() => navigateToDir(entry.name)} className="w-full text-left px-3 py-2 text-[13px] hover:bg-amber-50 flex items-center gap-2 border-b last:border-b-0 transition-colors group" style={{ borderColor: 'var(--border)' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                                  <span className="group-hover:text-amber-700 flex-1">{entry.name}</span>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
                                </button>
                              ) : (
                                <div key={entry.path} className="px-3 py-2 text-[13px] flex items-center gap-2 border-b last:border-b-0 text-gray-400" style={{ borderColor: 'var(--border)' }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                  <span className="flex-1">{entry.name}</span>
                                </div>
                              )
                            ))}
                          </div>
                        )}

                        {dirCountInView > 0 && mdCountInView === 0 && !browseLoading && browseEntries.length > 0 && (
                          <p className="text-[11px] text-center" style={{ color: 'var(--muted)' }}>当前目录无 .md 文件，请进入子目录</p>
                        )}
                      </div>
                    )}

                    {tab === 'local' && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                        </div>
                        <p className="text-[13px] text-gray-500 mb-4 text-center">
                          选择本地 Wiki 文件夹<br />
                          <span className="text-[12px] text-gray-400">自动识别 nodes/ 子目录中的 .md 文件</span>
                        </p>
                        <button onClick={pickFolder} disabled={loading} className="px-5 py-2.5 text-[13px] font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 transition-colors">
                          选择文件夹
                        </button>
                      </div>
                    )}

                    {loading && progress && (
                      <div className="mt-3 flex items-center gap-2 text-[12px] text-blue-600">
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                        {progress}
                      </div>
                    )}

                    {error && (
                      <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-600">{error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
