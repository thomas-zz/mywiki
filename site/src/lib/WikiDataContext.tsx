'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { WikiData } from '@/lib/types'

const DB_NAME = 'mywiki-cache'
const DB_VERSION = 2
const SOURCES_STORE = 'sources'
const CONFIG_STORE = 'config'

export interface SourceMeta {
  id: string
  label: string
  type: 'github' | 'local'
  savedAt: number
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
      // Clean up old store
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
  const store = tx.objectStore(SOURCES_STORE)
  const req = store.getAll()
  return new Promise(resolve => {
    req.onsuccess = () => {
      const records: SourceRecord[] = req.result || []
      resolve(records.map(({ id, label, type, savedAt }) => ({ id, label, type, savedAt })))
    }
    req.onerror = () => resolve([])
  })
}

async function dbLoadSource(id: string): Promise<WikiData | null> {
  const db = await openDB()
  const tx = db.transaction(SOURCES_STORE, 'readonly')
  const req = tx.objectStore(SOURCES_STORE).get(id)
  return new Promise(resolve => {
    req.onsuccess = () => resolve(req.result?.data ?? null)
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
  addSource: (data: WikiData, label: string, type: 'github' | 'local') => Promise<string>
  switchSource: (id: string) => Promise<void>
  removeSource: (id: string) => Promise<void>
  ready: boolean
}

const WikiDataContext = createContext<WikiDataContextType>({
  serverData: null,
  activeData: null,
  activeSourceId: null,
  sources: [],
  addSource: async () => '',
  switchSource: async () => {},
  removeSource: async () => {},
  ready: false,
})

function makeSourceId(label: string, type: string): string {
  return `${type}:${label}`
}

export function WikiDataProvider({ serverData, children }: { serverData: WikiData; children: React.ReactNode }) {
  const [activeData, setActiveData] = useState<WikiData | null>(null)
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [sources, setSources] = useState<SourceMeta[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    (async () => {
      const [metas, savedId] = await Promise.all([dbGetAllSourceMetas(), dbGetActiveId()])
      setSources(metas.sort((a, b) => b.savedAt - a.savedAt))
      if (savedId) {
        const data = await dbLoadSource(savedId)
        if (data) {
          setActiveData(data)
          setActiveSourceId(savedId)
        }
      }
      setReady(true)
    })()
  }, [])

  const addSource = useCallback(async (data: WikiData, label: string, type: 'github' | 'local') => {
    const id = makeSourceId(label, type)
    const record: SourceRecord = { id, label, type, data, savedAt: Date.now() }
    await dbSaveSource(record)
    await dbSetActiveId(id)
    setActiveData(data)
    setActiveSourceId(id)
    const metas = await dbGetAllSourceMetas()
    setSources(metas.sort((a, b) => b.savedAt - a.savedAt))
    return id
  }, [])

  const switchSource = useCallback(async (id: string) => {
    const data = await dbLoadSource(id)
    if (data) {
      setActiveData(data)
      setActiveSourceId(id)
      await dbSetActiveId(id)
    }
  }, [])

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

  return (
    <WikiDataContext.Provider value={{ serverData, activeData, activeSourceId, sources, addSource, switchSource, removeSource, ready }}>
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
