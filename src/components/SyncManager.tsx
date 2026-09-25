import { useEffect } from 'react'
import { useOffline } from '@/contexts/OfflineContext'
import { useTasks } from '@/contexts/TaskContext'
import { useAppNotifications } from '@/contexts/NotificationContext'
import { useToast } from '@/hooks/use-toast'
import { createPesagem } from '@/services/pesagens'
import { updateAtividade } from '@/services/atividades'

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
        let pesagensSynced = 0

        for (const action of items) {
          if (action.type === 'COMPLETE_TASK') {
            completeTaskOnServer(action.payload.taskId)
            if (action.payload.atividadeId) {
              try {
                await updateAtividade(action.payload.atividadeId, {
                  status: 'concluida',
                  concluido_em: new Date().toISOString(),
                  concluido_por: action.payload.operator,
                } as any)
              } catch (err) {
                console.warn('Erro ao atualizar atividade no banco:', err)
              }
            }
            tasksCompleted++
          } else if (action.type === 'REGISTER_PESAGEM') {
            try {
              await createPesagem(action.payload)
              pesagensSynced++
            } catch (err) {
              console.error('Erro ao sincronizar pesagem da fila SW:', err)
            }
          } else if (action.type === 'FIELD_OPERATION') {
            addNotification({
              title: 'Operação de Campo Sincronizada',
              message: `Ação de "${action.payload.operationType}" registrada por ${action.payload.operator} no alvo ${action.payload.lote}.`,
              type: 'task',
            })
            opsSynced++
          }
        }

        toast({
          title: 'Dados Sincronizados',
          description: `Sincronização em background concluída (${tasksCompleted + opsSynced + pesagensSynced} registros).`,
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

    let tasksCompleted = 0
    let opsSynced = 0
    let pesagensSynced = 0

    for (const action of queue) {
      if (action.type === 'COMPLETE_TASK') {
        completeTaskOnServer(action.payload.taskId)
        if (action.payload.atividadeId) {
          try {
            await updateAtividade(action.payload.atividadeId, {
              status: 'concluida',
              concluido_em: new Date().toISOString(),
              concluido_por: action.payload.operator,
            } as any)
          } catch (err) {
            console.warn('Erro ao atualizar status da atividade:', err)
          }
        }
        tasksCompleted++
      } else if (action.type === 'REGISTER_PESAGEM') {
        try {
          await createPesagem(action.payload)
          pesagensSynced++
          addNotification({
            title: 'Pesagem Sincronizada',
            message: `Pesagem de ${action.payload.peso_medio_kg} kg salva no lote com cálculo de GMD atualizado.`,
            type: 'task',
          })
        } catch (err) {
          console.error('Erro ao sincronizar pesagem offline:', err)
        }
      } else if (action.type === 'FIELD_OPERATION') {
        addNotification({
          title: 'Operação de Campo Sincronizada',
          message: `Ação de "${action.payload.operationType}" registrada por ${action.payload.operator} no alvo ${action.payload.lote}.`,
          type: 'task',
        })
        opsSynced++
      }
    }

    await clearQueue()
    setIsSyncing(false)

    toast({
      title: 'Sincronização Concluída',
      description: `${tasksCompleted + opsSynced + pesagensSynced} registros da fila offline foram processados no banco de dados.`,
      variant: 'default',
    })
  }

  return null
}
