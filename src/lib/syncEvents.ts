/**
 * Barramento Central de Sincronização & Tempo Real (GPI - Gestão Pecuária Integrada)
 *
 * Garante que qualquer inserção, alteração ou exclusão em qualquer módulo
 * (Nascimentos, IATF, DG, Resultado Final, Lotes, Pastos, Pesagens, Vendas, Fechamento)
 * seja propagada instantaneamente para todas as telas abertas sem necessidade de
 * recarregar a página (F5) ou navegar para outra rota.
 */

import { useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'

export const EVENTO_DADOS_ATUALIZADOS = 'gpi:dados-atualizados'
const CANAL_BROADCAST = 'gpi_sync_channel'

// Instância segura de BroadcastChannel para sincronizar entre abas do navegador
let broadcastChannel: BroadcastChannel | null = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CANAL_BROADCAST)
  }
} catch {
  broadcastChannel = null
}

/**
 * Notifica todas as telas do sistema que dados de determinada origem mudaram.
 * Dispara evento CustomEvent na janela e mensagem pelo BroadcastChannel.
 */
export function notifyDataChanged(origem: string = 'geral', detalhes?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  const payload = { origem, timestamp: Date.now(), ...detalhes }

  // 1. Evento DOM na janela atual
  window.dispatchEvent(
    new CustomEvent(EVENTO_DADOS_ATUALIZADOS, {
      detail: payload,
    }),
  )

  // 2. BroadcastChannel para outras abas / instâncias
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(payload)
    }
  } catch {
    // broadcast falhou silenciosamente
  }
}

/**
 * Hook universal de auto-atualização reativa.
 * Escuta eventos locais (notifyDataChanged), outras abas (BroadcastChannel) e
 * assinaturas realtime do PocketBase para as coleções especificadas.
 *
 * Aplica debounce automático para evitar recarregamentos repetidos quando múltiplos
 * registros são gravados em sequência rápida.
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  collections: string[] = [],
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      try {
        const res = callbackRef.current()
        if (res && typeof (res as Promise<unknown>).catch === 'function') {
          ;(res as Promise<unknown>).catch((err) =>
            console.warn('Erro na atualização automática:', err),
          )
        }
      } catch (err) {
        console.warn('Erro síncrono na atualização automática:', err)
      }
    }, 120)
  }

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // 1. Ouvir evento CustomEvent local
    const handleLocalEvent = () => {
      trigger()
    }
    window.addEventListener(EVENTO_DADOS_ATUALIZADOS, handleLocalEvent)

    // 2. Ouvir BroadcastChannel
    const handleBroadcast = () => {
      trigger()
    }
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast)
    }

    // 3. Assinatura Realtime no PocketBase para cada coleção solicitada
    const unsubFns: Array<() => Promise<void>> = []
    let isCancelled = false

    if (collections && collections.length > 0) {
      collections.forEach((colName) => {
        try {
          pb.collection(colName)
            .subscribe('*', () => {
              trigger()
            })
            .then((unsub) => {
              if (isCancelled) {
                unsub().catch(() => {})
              } else {
                unsubFns.push(unsub)
              }
            })
            .catch((err) => {
              console.warn(`Erro ao assinar realtime para ${colName}:`, err)
            })
        } catch (subErr) {
          console.warn(`Falha na chamada subscribe para ${colName}:`, subErr)
        }
      })
    }

    return () => {
      isCancelled = true
      window.removeEventListener(EVENTO_DADOS_ATUALIZADOS, handleLocalEvent)
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast)
      }
      unsubFns.forEach((fn) => {
        try {
          fn().catch(() => {})
        } catch {
          // cleanup
        }
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, collections.join(',')])
}
