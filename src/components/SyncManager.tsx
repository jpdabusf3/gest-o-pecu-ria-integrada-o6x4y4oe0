import { useEffect } from 'react'
import { useOffline } from '@/contexts/OfflineContext'
import { useTasks } from '@/contexts/TaskContext'
import { useAppNotifications } from '@/contexts/NotificationContext'
import { useToast } from '@/hooks/use-toast'

export function SyncManager() {
  const { isOnline, queue, clearQueue, isSyncing, setIsSyncing } = useOffline()
  const { completeTaskOnServer } = useTasks()
  const { addNotification } = useAppNotifications()
  const { toast } = useToast()

  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      performSync()
    }
  }, [isOnline, queue, isSyncing])

  useEffect(() => {
    // Listen for Background Sync events completed by the Service Worker
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        const items = event.data.items || []
        let tasksCompleted = 0
        let opsSynced = 0

        items.forEach((action: any) => {
          if (action.type === 'COMPLETE_TASK') {
            completeTaskOnServer(action.payload.taskId)
            tasksCompleted++
          } else if (action.type === 'FIELD_OPERATION') {
            addNotification({
              title: 'Operação de Campo Sincronizada',
              message: `Ação de "${action.payload.operationType}" registrada por ${action.payload.operator} no alvo ${action.payload.lote}.`,
              type: 'task',
            })
            opsSynced++
          }
        })

        toast({
          title: 'Data Synced',
          description: `Sincronização em background concluída (${tasksCompleted + opsSynced} registros).`,
          variant: 'default',
        })

        // Clear React state, as DB is already cleared by SW
        clearQueue()
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [completeTaskOnServer, addNotification, toast, clearQueue])

  const performSync = async () => {
    setIsSyncing(true)

    // Simulate network delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 2000))

    let tasksCompleted = 0
    let opsSynced = 0

    queue.forEach((action) => {
      if (action.type === 'COMPLETE_TASK') {
        completeTaskOnServer(action.payload.taskId)
        tasksCompleted++
      } else if (action.type === 'FIELD_OPERATION') {
        addNotification({
          title: 'Operação de Campo Sincronizada',
          message: `Ação de "${action.payload.operationType}" registrada por ${action.payload.operator} no alvo ${action.payload.lote}.`,
          type: 'task',
        })
        opsSynced++
      }
    })

    await clearQueue()
    setIsSyncing(false)

    toast({
      title: 'Data Synced',
      description: `${tasksCompleted + opsSynced} registros da fila offline foram enviados ao servidor.`,
      variant: 'default',
    })
  }

  return null
}
