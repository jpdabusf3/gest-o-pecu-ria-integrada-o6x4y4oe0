import { useState, useEffect } from 'react'

export interface SyncAction {
  id: string
  type: string
  payload: any
  timestamp: number
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [simulatedOffline, setSimulatedOffline] = useState(false)
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
    const newAction = { ...action, id: crypto.randomUUID(), timestamp: Date.now() }
    const newQueue = [...queue, newAction]
    setQueue(newQueue)
    localStorage.setItem('gpi_sync_queue', JSON.stringify(newQueue))
    return newAction
  }

  const syncAll = () => {
    if (!actualOnline) return false

    // In a real application, this would iterate and POST to the backend
    // For this demonstration, we just clear the queue
    setQueue([])
    localStorage.removeItem('gpi_sync_queue')
    return true
  }

  const toggleSimulateOffline = () => setSimulatedOffline(!simulatedOffline)

  return { isOnline: actualOnline, queue, addAction, syncAll, toggleSimulateOffline }
}
