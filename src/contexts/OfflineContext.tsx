import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type SyncAction = {
  id: string
  type: 'COMPLETE_TASK' | 'FIELD_OPERATION' | 'REGISTER_PESAGEM' | 'UPDATE_ATIVIDADE_STATUS'
  payload: any
  timestamp: number
}

const DB_NAME = 'gpi-db'
const STORE_NAME = 'sync-queue'

function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveToDB(action: SyncAction) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(action)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadFromDB() {
  const db = await openDB()
  return new Promise<SyncAction[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function clearDB() {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

interface OfflineContextType {
  isOnline: boolean
  simulatedOffline: boolean
  toggleSimulatedOffline: () => void
  queue: SyncAction[]
  addAction: (action: Omit<SyncAction, 'id' | 'timestamp'>) => Promise<void>
  clearQueue: () => Promise<void>
  isSyncing: boolean
  setIsSyncing: (val: boolean) => void
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [simulatedOffline, setSimulatedOffline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [queue, setQueue] = useState<SyncAction[]>([])

  const actualOnline = isOnline && !simulatedOffline

  useEffect(() => {
    loadFromDB()
      .then(setQueue)
      .catch(() => setQueue([]))
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        const remaining = await loadFromDB()
        setQueue(remaining)
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [])

  const addAction = async (action: Omit<SyncAction, 'id' | 'timestamp'>) => {
    const newAction = { ...action, id: crypto.randomUUID(), timestamp: Date.now() } as SyncAction
    await saveToDB(newAction)
    const newQueue = await loadFromDB()
    setQueue(newQueue)

    // Register Background Sync for offline recovery
    if ('serviceWorker' in navigator && 'SyncManager' in window && !actualOnline) {
      try {
        const reg = await navigator.serviceWorker.ready
        await (reg as any).sync.register('sync-farm-data')
      } catch (e) {
        console.log('Background Sync could not be registered!', e)
      }
    }
  }

  const clearQueue = async () => {
    await clearDB()
    setQueue([])
  }

  const toggleSimulatedOffline = () => setSimulatedOffline((prev) => !prev)

  return (
    <OfflineContext.Provider
      value={{
        isOnline: actualOnline,
        simulatedOffline,
        toggleSimulatedOffline,
        queue,
        addAction,
        clearQueue,
        isSyncing,
        setIsSyncing,
      }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  const context = useContext(OfflineContext)
  if (!context) throw new Error('useOffline must be used within OfflineProvider')
  return context
}
