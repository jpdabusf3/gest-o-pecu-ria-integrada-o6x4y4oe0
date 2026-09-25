import { useEffect } from 'react'
import { useOffline } from '@/contexts/OfflineContext'
import { useTasks } from '@/contexts/TaskContext'
import { useAppNotifications } from '@/contexts/NotificationContext'
import { useToast } from '@/hooks/use-toast'
import { createPesagem } from '@/services/pesagens'
import { transicionarStatusAtividade, updateAtividade } from '@/services/atividades'
import { salvarItemEstoque, getEstoqueInsumos } from '@/services/fechamento'
import { criarOcorrencia } from '@/services/ocorrencias'

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
        let statusSynced = 0
        let ocorrenciasSynced = 0

        for (const action of items) {
          if (action.type === 'REGISTRAR_OCORRENCIA') {
            try {
              await criarOcorrencia({
                ...action.payload,
                origemOffline: true,
              })
              ocorrenciasSynced++
            } catch (err) {
              console.warn('Erro ao sincronizar ocorrencia SW:', err)
            }
          } else if (action.type === 'UPDATE_ATIVIDADE_STATUS') {
            try {
              await transicionarStatusAtividade({
                atividadeId: action.payload.atividadeId,
                statusNovo: action.payload.statusNovo,
                statusAnterior: action.payload.statusAnterior,
                usuarioNome: action.payload.usuarioNome,
                motivo: action.payload.motivo,
                detalhes: action.payload.detalhes,
                progresso: action.payload.progresso,
                offline: true, // Gravado originalmente offline
                timestamp: action.payload.timestamp,
              })
              statusSynced++
            } catch (err) {
              console.warn('Erro ao sincronizar status da atividade:', err)
            }
          } else if (action.type === 'COMPLETE_TASK') {
            completeTaskOnServer(action.payload.taskId)
            if (action.payload.atividadeId) {
              try {
                await updateAtividade(action.payload.atividadeId, {
                  status: 'realizada',
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
          } else if (action.type === 'DEDUCT_INVENTORY') {
            try {
              const { inventoryId, amount, item } = action.payload
              const items = await getEstoqueInsumos()
              const match = items.find((i) => i.codigo === inventoryId || i.id === inventoryId)
              if (match) {
                await salvarItemEstoque({
                  id: match.id,
                  produto: match.produto,
                  codigo: match.codigo,
                  unidade: match.unidade,
                  categoria: match.categoria,
                  estoque_inicial: match.estoque_inicial,
                  entradas: match.entradas,
                  saidas: (match.saidas || 0) + amount,
                  preco_unitario: match.preco_unitario,
                  periodo_mes: match.periodo_mes || new Date().toISOString().slice(0, 7),
                })
              } else {
                await salvarItemEstoque({
                  produto: item || 'Insumo de Campo',
                  codigo: inventoryId,
                  unidade: 'un',
                  estoque_inicial: 500,
                  entradas: 0,
                  saidas: amount,
                  preco_unitario: 50.0,
                  periodo_mes: new Date().toISOString().slice(0, 7),
                })
              }
              opsSynced++
            } catch (err) {
              console.error('Erro ao sincronizar dedução de estoque:', err)
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
          description: `Sincronização em background concluída (${tasksCompleted + opsSynced + pesagensSynced + statusSynced + ocorrenciasSynced} registros).`,
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
    let statusSynced = 0
    let ocorrenciasSynced = 0

    for (const action of queue) {
      if (action.type === 'REGISTRAR_OCORRENCIA') {
        try {
          await criarOcorrencia({
            ...action.payload,
            origemOffline: true,
          })
          ocorrenciasSynced++
          addNotification({
            title: 'Ocorrência Sincronizada',
            message: `Ocorrência (${action.payload.tipo}) sincronizada com carimbo de auditoria.`,
            type: 'task',
          })
        } catch (err) {
          console.warn('Erro ao sincronizar ocorrencia offline:', err)
        }
      } else if (action.type === 'UPDATE_ATIVIDADE_STATUS') {
        try {
          await transicionarStatusAtividade({
            atividadeId: action.payload.atividadeId,
            statusNovo: action.payload.statusNovo,
            statusAnterior: action.payload.statusAnterior,
            usuarioNome: action.payload.usuarioNome,
            motivo: action.payload.motivo,
            detalhes: action.payload.detalhes,
            progresso: action.payload.progresso,
            offline: true, // Importante: mantém carimbo offline=true pois foi gravado na fila offline
            timestamp: action.payload.timestamp,
          })
          statusSynced++
        } catch (err) {
          console.warn('Erro ao processar transição de status na fila:', err)
        }
      } else if (action.type === 'COMPLETE_TASK') {
        completeTaskOnServer(action.payload.taskId)
        if (action.payload.atividadeId) {
          try {
            await updateAtividade(action.payload.atividadeId, {
              status: 'realizada',
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
      } else if (action.type === 'DEDUCT_INVENTORY') {
        try {
          const { inventoryId, amount, item } = action.payload
          const items = await getEstoqueInsumos()
          const match = items.find((i) => i.codigo === inventoryId || i.id === inventoryId)
          if (match) {
            await salvarItemEstoque({
              id: match.id,
              produto: match.produto,
              codigo: match.codigo,
              unidade: match.unidade,
              categoria: match.categoria,
              estoque_inicial: match.estoque_inicial,
              entradas: match.entradas,
              saidas: (match.saidas || 0) + amount,
              preco_unitario: match.preco_unitario,
              periodo_mes: match.periodo_mes || new Date().toISOString().slice(0, 7),
            })
          } else {
            await salvarItemEstoque({
              produto: item || 'Insumo de Campo',
              codigo: inventoryId,
              unidade: 'un',
              estoque_inicial: 500,
              entradas: 0,
              saidas: amount,
              preco_unitario: 50.0,
              periodo_mes: new Date().toISOString().slice(0, 7),
            })
          }
          opsSynced++
        } catch (err) {
          console.error('Erro ao sincronizar dedução de estoque offline:', err)
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
      description: `${tasksCompleted + opsSynced + pesagensSynced + statusSynced + ocorrenciasSynced} registros da fila offline foram processados no banco de dados.`,
      variant: 'default',
    })
  }

  return null
}
