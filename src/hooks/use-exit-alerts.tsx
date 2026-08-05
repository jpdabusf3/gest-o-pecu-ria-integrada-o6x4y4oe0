import { useState, useEffect, useCallback, useRef } from 'react'
import { getHedgeOperations, type HedgeOperation } from '@/services/hedge'
import { getMarketPrices, type MarketPrice } from '@/services/market'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'

export interface ExitAlert {
  id: string
  operation: HedgeOperation
  marketPrice: MarketPrice
  diffPercent: number
  direction: 'above' | 'below' | 'near'
  severity: 'warning' | 'critical'
}

export function useExitAlerts(lotIds?: string[]) {
  const [alerts, setAlerts] = useState<ExitAlert[]>([])
  const [loading, setLoading] = useState(true)
  const isFirstLoad = useRef(true)
  const notifiedIds = useRef<Set<string>>(new Set())

  const lotIdsKey = lotIds?.join(',') ?? 'all'

  const loadData = useCallback(async () => {
    try {
      const [ops, prices] = await Promise.all([getHedgeOperations(), getMarketPrices()])
      const openOps = ops.filter((o) => o.status === 'open')

      let filteredOps = openOps
      if (lotIds) {
        filteredOps = lotIds.length > 0 ? openOps.filter((o) => lotIds.includes(o.lot_id)) : []
      }

      const latestByKey = new Map<string, MarketPrice>()
      prices.forEach((p) => {
        const key = `${p.indicator}|${p.region}`
        const existing = latestByKey.get(key)
        if (!existing || new Date(p.reference_date) > new Date(existing.reference_date)) {
          latestByKey.set(key, p)
        }
      })

      const newAlerts: ExitAlert[] = []
      filteredOps.forEach((op) => {
        latestByKey.forEach((price) => {
          const strike = op.strike_price || 0
          if (strike <= 0 || price.price <= 0) return

          const diff = Math.abs(price.price - strike)
          const diffPercent = (diff / strike) * 100

          if (diffPercent <= 2) {
            newAlerts.push({
              id: `${op.id}-${price.indicator}-${price.region}`,
              operation: op,
              marketPrice: price,
              diffPercent,
              direction: price.price > strike ? 'above' : price.price < strike ? 'below' : 'near',
              severity: diffPercent <= 0.5 ? 'critical' : 'warning',
            })
          }
        })
      })

      setAlerts(newAlerts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [lotIdsKey])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('market_prices', () => loadData())
  useRealtime('hedge_operations', () => loadData())

  useEffect(() => {
    if (loading) return
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      alerts.forEach((a) => notifiedIds.current.add(a.id))
      return
    }
    alerts.forEach((alert) => {
      if (!notifiedIds.current.has(alert.id)) {
        notifiedIds.current.add(alert.id)
        toast({
          title:
            alert.severity === 'critical'
              ? '🚨 Ponto de Saída Crítico!'
              : '⚠️ Alerta de Ponto de Saída',
          description: `${alert.marketPrice.indicator} (${alert.marketPrice.region}): R$ ${alert.marketPrice.price.toFixed(2)} está a ${alert.diffPercent.toFixed(2)}% do strike R$ ${alert.operation.strike_price?.toFixed(2)}.`,
          variant: alert.severity === 'critical' ? 'destructive' : 'default',
        })
      }
    })
  }, [alerts, loading])

  return { alerts, loading }
}
