'use client'

import { useState, useCallback, useEffect } from 'react'
import type { WikiNode, WikiData } from '@/lib/types'
import { parseMarkdownToNode, buildWikiDataFromNodes } from '@/lib/clientParser'

function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string; path: string } | null {
  // https://github.com/owner/repo/tree/branch/path/to/folder
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)\/?(.*)?)?/)
  if (!match) return null
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3] || 'main',
    path: match[4] || '',
  }
}

interface DataSourcePickerProps {
  onDataLoaded: (data: WikiData, sourceName: string) => void
}

const GH_TOKEN_KEY = 'mywiki-gh-token'

export function DataSourcePicker({ onDataLoaded }: DataSourcePickerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState<string | null>(null)
  const [stats, setStats] = useState<{ total: number; parsed: number; failed: string[] } | null>(null)
  const [progress, setProgress] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [ghToken, setGhToken] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(GH_TOKEN_KEY)
    if (saved) setGhToken(saved)
  }, [])

  const saveToken = (token: string) => {
    setGhToken(token)
    if (token) localStorage.setItem(GH_TOKEN_KEY, token)
    else localStorage.removeItem(GH_TOKEN_KEY)
  }

  const processFiles = useCallback((files: { name: string; content: string }[], label: string) => {
    const nodeMap = new Map<string, WikiNode>()
    const failedFiles: string[] = []

    for (const file of files) {
      const node = parseMarkdownToNode(file.name, file.content)
      if (node) {
        nodeMap.set(node.id, node)
      } else {
        failedFiles.push(`${file.name}（缺少 id 和 title）`)
      }
    }

    if (nodeMap.size === 0) {
      setError(`未找到有效节点。扫描了 ${files.length} 个 .md 文件${failedFiles.length ? `，${failedFiles.length} 个解析失败` : ''}`)
      setLoading(false)
      setProgress('')
      return
    }

    setProgress('构建关系图谱...')
    const data = buildWikiDataFromNodes(nodeMap)
    onDataLoaded(data, label)
    setStats({ total: files.length, parsed: nodeMap.size, failed: failedFiles })
    setSourceName(label)
    setLoading(false)
    setProgress('')
  }, [onDataLoaded])

  const pickFolder = useCallback(async () => {
    try {
      // @ts-expect-error File System Access API
      const dirHandle = await window.showDirectoryPicker()
      setLoading(true)
      setError(null)
      setStats(null)
      setProgress('扫描文件...')

      let nodesDir: FileSystemDirectoryHandle
      try {
        nodesDir = await dirHandle.getDirectoryHandle('nodes')
      } catch {
        nodesDir = dirHandle
      }

      const files: { name: string; content: string }[] = []
      for await (const entry of (nodesDir as any).values()) {
        if (entry.kind !== 'file' || !entry.name.endsWith('.md')) continue
        const file = await entry.getFile()
        files.push({ name: entry.name, content: await file.text() })
        setProgress(`读取文件... (${files.length})`)
      }

      processFiles(files, `📂 ${dirHandle.name}`)
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setError(e.message || '读取失败')
      setLoading(false)
    }
  }, [processFiles])

  const loadFromGitHub = useCallback(async (url: string) => {
    const parsed = parseGitHubUrl(url.trim())
    if (!parsed) {
      setError('无效的 GitHub URL，格式: github.com/owner/repo/tree/branch/path')
      return
    }

    setLoading(true)
    setError(null)
    setStats(null)
    setShowInput(false)

    const { owner, repo, branch, path } = parsed
    const label = `${owner}/${repo}${path ? '/' + path : ''}`

    try {
      // Try nodes/ subdirectory first, then the path itself
      let nodesPath = path ? `${path}/nodes` : 'nodes'
      setProgress('获取文件列表...')

      let apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${nodesPath}?ref=${branch}`
      const headers: Record<string, string> = {}
      if (ghToken) headers['Authorization'] = `token ${ghToken}`
      let res = await fetch(apiUrl, { headers })

      if (!res.ok && path) {
        nodesPath = path
        apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${nodesPath}?ref=${branch}`
        res = await fetch(apiUrl, { headers })
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `GitHub API 返回 ${res.status}`)
      }

      const listing: any[] = await res.json()
      const mdFiles = listing.filter((f: any) => f.type === 'file' && f.name.endsWith('.md'))

      if (mdFiles.length === 0) {
        throw new Error(`${nodesPath}/ 下没有 .md 文件`)
      }

      const files: { name: string; content: string }[] = []
      const batchSize = 5
      for (let i = 0; i < mdFiles.length; i += batchSize) {
        const batch = mdFiles.slice(i, i + batchSize)
        setProgress(`下载文件... (${files.length}/${mdFiles.length})`)
        const results = await Promise.all(
          batch.map(async (f: any) => {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.path}`
            const r = await fetch(rawUrl, ghToken ? { headers: { 'Authorization': `token ${ghToken}` } } : {})
            if (!r.ok) throw new Error(`下载 ${f.name} 失败`)
            return { name: f.name, content: await r.text() }
          })
        )
        files.push(...results)
      }

      processFiles(files, `🔗 ${label}`)
    } catch (e: any) {
      setError(e.message || '加载失败')
      setLoading(false)
      setProgress('')
    }
  }, [processFiles, ghToken])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && githubUrl.trim()) {
      loadFromGitHub(githubUrl)
    }
    if (e.key === 'Escape') {
      setShowInput(false)
      setGithubUrl('')
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      <button
        onClick={pickFolder}
        disabled={loading}
        className="px-3 py-1.5 text-[13px] rounded-md border transition-colors hover:bg-stone-50 whitespace-nowrap"
        style={{ borderColor: 'var(--border)' }}
      >
        📂 本地文件夹
      </button>

      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          disabled={loading}
          className="px-3 py-1.5 text-[13px] rounded-md border transition-colors hover:bg-stone-50 whitespace-nowrap"
          style={{ borderColor: 'var(--border)' }}
        >
          🔗 GitHub 仓库
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="github.com/owner/repo/tree/main/path"
            value={githubUrl}
            onChange={e => setGithubUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="px-2.5 py-1.5 text-[13px] rounded-md border w-[320px] focus:outline-none focus:ring-2 focus:ring-amber-200"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          />
          <input
            type="password"
            placeholder="Token（私有仓库）"
            value={ghToken}
            onChange={e => saveToken(e.target.value)}
            className="px-2.5 py-1.5 text-[13px] rounded-md border w-[140px] focus:outline-none focus:ring-2 focus:ring-amber-200"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          />
          <button
            onClick={() => githubUrl.trim() && loadFromGitHub(githubUrl)}
            disabled={!githubUrl.trim() || loading}
            className="px-2.5 py-1.5 text-[13px] rounded-md border transition-colors hover:bg-stone-50 whitespace-nowrap disabled:opacity-40"
            style={{ borderColor: 'var(--border)' }}
          >
            加载
          </button>
          <button
            onClick={() => { setShowInput(false); setGithubUrl('') }}
            className="px-1.5 py-1.5 text-[13px] text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {loading && progress && <span className="text-[12px] text-blue-600 animate-pulse">{progress}</span>}
      {!loading && sourceName && stats && (
        <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
          {sourceName} · {stats.parsed} 个节点
          {stats.failed.length > 0 && <span className="text-amber-600"> · {stats.failed.length} 个失败</span>}
        </span>
      )}
      {error && <span className="text-[12px] text-red-500">{error}</span>}
    </div>
  )
}
