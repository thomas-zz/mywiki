'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { WikiData } from '@/lib/types'

const DB_NAME = 'mywiki-cache'
const STORE_NAME = 'data'
const CACHE_KEY = 'override'
const META_KEY = 'meta'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveToCache(data: WikiData, folderName: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.put(data, CACHE_KEY)
  store.put({ folderName, savedAt: Date.now() }, META_KEY)
}

async function loadFromCache(): Promise<{ data: WikiData; folderName: string } | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const dataReq = store.get(CACHE_KEY)
    const metaReq = store.get(META_KEY)
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        if (dataReq.result && metaReq.result) {
          resolve({ data: dataReq.result, folderName: metaReq.result.folderName })
        } else {
          resolve(null)
        }
      }
      tx.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function clearCache(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).clear()
}

interface WikiDataContextType {
  overrideData: WikiData | null
  overrideFolderName: string | null
  setOverrideData: (data: WikiData | null, folderName?: string) => void
  clearOverride: () => void
  cacheLoaded: boolean
}

const WikiDataContext = createContext<WikiDataContextType>({
  overrideData: null,
  overrideFolderName: null,
  setOverrideData: () => {},
  clearOverride: () => {},
  cacheLoaded: false,
})

export function WikiDataProvider({ children }: { children: React.ReactNode }) {
  const [overrideData, setOverrideDataState] = useState<WikiData | null>(null)
  const [overrideFolderName, setFolderName] = useState<string | null>(null)
  const [cacheLoaded, setCacheLoaded] = useState(false)

  useEffect(() => {
    loadFromCache().then((cached) => {
      if (cached) {
        setOverrideDataState(cached.data)
        setFolderName(cached.folderName)
      }
      setCacheLoaded(true)
    })
  }, [])

  const setOverrideData = useCallback((data: WikiData | null, folderName?: string) => {
    setOverrideDataState(data)
    if (data && folderName) {
      setFolderName(folderName)
      saveToCache(data, folderName)
    }
  }, [])

  const clearOverride = useCallback(() => {
    setOverrideDataState(null)
    setFolderName(null)
    clearCache()
  }, [])

  return (
    <WikiDataContext.Provider value={{ overrideData, overrideFolderName, setOverrideData, clearOverride, cacheLoaded }}>
      {children}
    </WikiDataContext.Provider>
  )
}

export function useWikiDataOverride() {
  return useContext(WikiDataContext)
}
