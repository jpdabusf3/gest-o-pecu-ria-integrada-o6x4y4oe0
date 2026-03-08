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

  const performSync = async () => {
    setIsSyncing(true)

    // Simulate network delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 2000))

    let tasksCompleted = 0
    let opsSynced = 0

    queue.forEach((action) => {
      // Conflict Resolution Logic: Always apply local operations to server state,
      // as field observations represent the most recent truth in this model.
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

    clearQueue()
    setIsSyncing(false)

    toast({
      title: 'Sincronização Automática Concluída',
      description: `${tasksCompleted + opsSynced} registros da fila offline foram enviados ao servidor.`,
      variant: 'default',
    })
  }

  return null
}
