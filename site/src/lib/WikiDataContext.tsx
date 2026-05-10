'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { WikiData } from '@/lib/types'

const DB_NAME = 'mywiki-cache'
const DB_VERSION = 3
const SOURCES_STORE = 'sources'
const CONFIG_STORE = 'config'

export interface SourceConfig {
  owner: string
  repo: string
  branch: string
  path: string
}

export interface SourceMeta {
  id: string
  label: string
  type: 'github' | 'local'
  savedAt: number
  config?: SourceConfig
}

interface SourceRecord extends SourceMeta {
  data: WikiData
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(SOURCES_STORE)) {
        db.createObjectStore(SOURCES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE)
      }
      if (db.objectStoreNames.contains('data')) {
        db.deleteObjectStore('data')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbGetAllSourceMetas(): Promise<SourceMeta[]> {
  const db = await openDB()
  const tx = db.transaction(SOURCES_STORE, 'readonly')
  const req = tx.objectStore(SOURCES_STORE).getAll()
  return new Promise(resolve => {
    req.onsuccess = () => {
      const records: SourceRecord[] = req.result || []
      resolve(records.map(({ id, label, type, savedAt, config }) => ({ id, label, type, savedAt, config })))
    }
    req.onerror = () => resolve([])
  })
}

async function dbLoadSource(id: string): Promise<SourceRecord | null> {
  const db = await openDB()
  const tx = db.transaction(SOURCES_STORE, 'readonly')
  const req = tx.objectStore(SOURCES_STORE).get(id)
  return new Promise(resolve => {
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => resolve(null)
  })
}

async function dbSaveSource(record: SourceRecord): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(SOURCES_STORE, 'readwrite')
  tx.objectStore(SOURCES_STORE).put(record)
}

async function dbRemoveSource(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(SOURCES_STORE, 'readwrite')
  tx.objectStore(SOURCES_STORE).delete(id)
}

async function dbGetActiveId(): Promise<string | null> {
  const db = await openDB()
  const tx = db.transaction(CONFIG_STORE, 'readonly')
  const req = tx.objectStore(CONFIG_STORE).get('activeSourceId')
  return new Promise(resolve => {
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => resolve(null)
  })
}

async function dbSetActiveId(id: string | null): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(CONFIG_STORE, 'readwrite')
  if (id) {
    tx.objectStore(CONFIG_STORE).put(id, 'activeSourceId')
  } else {
    tx.objectStore(CONFIG_STORE).delete('activeSourceId')
  }
}

interface WikiDataContextType {
  serverData: WikiData | null
  activeData: WikiData | null
  activeSourceId: string | null
  sources: SourceMeta[]
  addSource: (data: WikiData, label: string, type: 'github' | 'local', config?: SourceConfig) => Promise<string>
  switchSource: (id: string) => Promise<void>
  removeSource: (id: string) => Promise<void>
  refreshActive: () => Promise<void>
  ready: boolean
  refreshing: boolean
}

const WikiDataContext = createContext<WikiDataContextType>({
  serverData: null,
  activeData: null,
  activeSourceId: null,
  sources: [],
  addSource: async () => '',
  switchSource: async () => {},
  removeSource: async () => {},
  refreshActive: async () => {},
  ready: false,
  refreshing: false,
})

function makeSourceId(label: string, type: string): string {
  return `${type}:${label}`
}

async function fetchGitHubSource(config: SourceConfig, token: string | null): Promise<{ name: string; content: string }[] | null> {
  const { owner, repo, branch, path } = config
  const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3.raw' }
  if (token) headers['Authorization'] = `token ${token}`

  const listHeaders: Record<string, string> = {}
  if (token) listHeaders['Authorization'] = `token ${token}`

  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    const res = await fetch(apiUrl, { headers: listHeaders })
    if (!res.ok) return null

    const listing: any[] = await res.json()
    const mdFiles = listing.filter((f: any) => f.type === 'file' && f.name.endsWith('.md'))
    if (mdFiles.length === 0) return null

    const files: { name: string; content: string }[] = []
    const batchSize = 5
    for (let i = 0; i < mdFiles.length; i += batchSize) {
      const batch = mdFiles.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async (f: any) => {
          const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${f.path}?ref=${branch}`
          const r = await fetch(fileUrl, { headers })
          if (!r.ok) return null
          return { name: f.name, content: await r.text() }
        })
      )
      for (const r of results) { if (r) files.push(r) }
    }
    return files.length > 0 ? files : null
  } catch {
    return null
  }
}

export function WikiDataProvider({ serverData, children }: { serverData: WikiData; children: React.ReactNode }) {
  const [activeData, setActiveData] = useState<WikiData | null>(null)
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [sources, setSources] = useState<SourceMeta[]>([])
  const [ready, setReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const refreshFromConfig = useCallback(async (record: SourceRecord) => {
    if (record.type !== 'github' || !record.config) return
    setRefreshing(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('mywiki-gh-token') : null
    const files = await fetchGitHubSource(record.config, token)
    if (files) {
      const { parseMarkdownToNode, buildWikiDataFromNodes } = await import('@/lib/clientParser')
      const nodeMap = new Map()
      for (const file of files) {
        const node = parseMarkdownToNode(file.name, file.content)
        if (node) nodeMap.set(node.id, node)
      }
      if (nodeMap.size > 0) {
        const data = buildWikiDataFromNodes(nodeMap)
        setActiveData(data)
        // Update cache
        const updated: SourceRecord = { ...record, data, savedAt: Date.now() }
        await dbSaveSource(updated)
      }
    }
    setRefreshing(false)
  }, [])

  useEffect(() => {
    (async () => {
      const [metas, savedId] = await Promise.all([dbGetAllSourceMetas(), dbGetActiveId()])
      setSources(metas.sort((a, b) => b.savedAt - a.savedAt))
      if (savedId) {
        const record = await dbLoadSource(savedId)
        if (record) {
          setActiveData(record.data)
          setActiveSourceId(savedId)
          // Auto-refresh from GitHub in background
          if (record.type === 'github' && record.config) {
            refreshFromConfig(record)
          }
        }
      }
      setReady(true)
    })()
  }, [refreshFromConfig])

  const addSource = useCallback(async (data: WikiData, label: string, type: 'github' | 'local', config?: SourceConfig) => {
    const id = makeSourceId(label, type)
    const record: SourceRecord = { id, label, type, data, savedAt: Date.now(), config }
    await dbSaveSource(record)
    await dbSetActiveId(id)
    setActiveData(data)
    setActiveSourceId(id)
    const metas = await dbGetAllSourceMetas()
    setSources(metas.sort((a, b) => b.savedAt - a.savedAt))
    return id
  }, [])

  const switchSource = useCallback(async (id: string) => {
    const record = await dbLoadSource(id)
    if (record) {
      setActiveData(record.data)
      setActiveSourceId(id)
      await dbSetActiveId(id)
      // Refresh if GitHub source
      if (record.type === 'github' && record.config) {
        refreshFromConfig(record)
      }
    }
  }, [refreshFromConfig])

  const removeSource = useCallback(async (id: string) => {
    await dbRemoveSource(id)
    const metas = await dbGetAllSourceMetas()
    setSources(metas.sort((a, b) => b.savedAt - a.savedAt))
    if (activeSourceId === id) {
      setActiveData(null)
      setActiveSourceId(null)
      await dbSetActiveId(null)
    }
  }, [activeSourceId])

  const refreshActive = useCallback(async () => {
    if (!activeSourceId) return
    const record = await dbLoadSource(activeSourceId)
    if (record && record.type === 'github' && record.config) {
      await refreshFromConfig(record)
    }
  }, [activeSourceId, refreshFromConfig])

  return (
    <WikiDataContext.Provider value={{ serverData, activeData, activeSourceId, sources, addSource, switchSource, removeSource, refreshActive, ready, refreshing }}>
      {children}
    </WikiDataContext.Provider>
  )
}

export function useWikiData(): WikiData {
  const { activeData, serverData } = useContext(WikiDataContext)
  return activeData ?? serverData!
}

export function useWikiDataSources() {
  return useContext(WikiDataContext)
}
