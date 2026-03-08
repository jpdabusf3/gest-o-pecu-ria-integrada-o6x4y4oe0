import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type SyncAction = {
  id: string
  type: 'COMPLETE_TASK' | 'FIELD_OPERATION'
  payload: any
  timestamp: number
}

interface OfflineContextType {
  isOnline: boolean
  simulatedOffline: boolean
  toggleSimulatedOffline: () => void
  queue: SyncAction[]
  addAction: (action: Omit<SyncAction, 'id' | 'timestamp'>) => void
  clearQueue: () => void
  isSyncing: boolean
  setIsSyncing: (val: boolean) => void
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [simulatedOffline, setSimulatedOffline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const [queue, setQueue] = useState<SyncAction[]>(() => {
    try {
      const stored = localStorage.getItem('gpi_sync_queue')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const actualOnline = isOnline && !simulatedOffline

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const addAction = (action: Omit<SyncAction, 'id' | 'timestamp'>) => {
    const newAction = { ...action, id: crypto.randomUUID(), timestamp: Date.now() } as SyncAction
    const newQueue = [...queue, newAction]
    setQueue(newQueue)
    localStorage.setItem('gpi_sync_queue', JSON.stringify(newQueue))
  }

  const clearQueue = () => {
    setQueue([])
    localStorage.removeItem('gpi_sync_queue')
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
