import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  marketIndicators as initialMarket,
  b3FuturesData as initialB3,
  replacementIndicators as initialReplacement,
  commodityIndicators as initialCommodity,
  MarketIndicator,
  MarketTrend,
} from '@/data/market'

export type AlertCondition = 'above' | 'below'

export interface MarketAlert {
  id: string
  indicatorId: string
  indicatorLabel: string
  condition: AlertCondition
  targetPrice: number
  notifyWhatsApp: boolean
  active: boolean
}

interface MarketContextType {
  marketData: MarketIndicator[]
  b3Data: Record<string, any[]>
  replacementData: MarketIndicator[]
  commodityData: MarketIndicator[]
  lastUpdate: string
  b3LastUpdate: string
  alerts: MarketAlert[]
  isAutoUpdateEnabled: boolean
  isRefreshing: boolean
  addAlert: (alert: Omit<MarketAlert, 'id' | 'active'>) => void
  toggleAlert: (id: string, active: boolean) => void
  deleteAlert: (id: string) => void
  getPrice: (id: string) => number | null
  refreshMarketPrices: () => Promise<void>
  toggleAutoUpdate: (enabled: boolean) => void
  setManualPrice: (id: string, price: number) => void
}

const MarketContext = createContext<MarketContextType | undefined>(undefined)

const fluctuatePrice = (price: number, volatility: number = 0.005) => {
  const change = price * volatility * (Math.random() * 2 - 1)
  return Number((price + change).toFixed(2))
}

const calculateTrend = (oldPrice: number, newPrice: number): MarketTrend => {
  if (newPrice > oldPrice) return 'up'
  if (newPrice < oldPrice) return 'down'
  return 'stable'
}

const calculateChangeStr = (oldPrice: number, newPrice: number): string => {
  const diff = ((newPrice - oldPrice) / oldPrice) * 100
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(2)}%`
}

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [marketData, setMarketData] = useState<MarketIndicator[]>(initialMarket)
  const [b3Data, setB3Data] = useState<Record<string, any[]>>(initialB3)
  const [replacementData, setReplacementData] = useState<MarketIndicator[]>(initialReplacement)
  const [commodityData, setCommodityData] = useState<MarketIndicator[]>(initialCommodity)
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString('pt-BR'))
  const [b3LastUpdate, setB3LastUpdate] = useState(new Date().toLocaleTimeString('pt-BR'))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(true)
  const { toast } = useToast()

  const [alerts, setAlerts] = useState<MarketAlert[]>([
    {
      id: 'mock-1',
      indicatorId: 'boi-gordo-mt',
      indicatorLabel: 'Boi Gordo - MT (Datagro)',
      condition: 'above',
      targetPrice: 270.0,
      notifyWhatsApp: true,
      active: true,
    },
  ])

  const getPrice = useCallback(
    (id: string): number | null => {
      let found = marketData.find((i) => i.id === id)
      if (found) return found.price
      found = replacementData.find((i) => i.id === id)
      if (found) return found.price
      found = commodityData.find((i) => i.id === id)
      if (found) return found.price

      for (const key in b3Data) {
        const item = b3Data[key].find((i: any) => i.ticker === id)
        if (item) return item.price
      }
      return null
    },
    [marketData, replacementData, commodityData, b3Data],
  )

  const checkAlerts = useCallback(() => {
    alerts.forEach((alert) => {
      if (!alert.active) return
      const currentPrice = getPrice(alert.indicatorId)
      if (currentPrice === null) return

      const isTriggered =
        alert.condition === 'above'
          ? currentPrice >= alert.targetPrice
          : currentPrice <= alert.targetPrice

      if (isTriggered) {
        if (alert.notifyWhatsApp) {
          toast({
            title: '📱 Alerta WhatsApp Disparado!',
            description: `O mercado ${alert.indicatorLabel} atingiu R$ ${currentPrice.toFixed(
              2,
            )}. Condição: ${alert.condition === 'above' ? 'Acima' : 'Abaixo'} de R$ ${alert.targetPrice.toFixed(2)}.`,
            variant: 'default',
            className:
              'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
          })
        } else {
          toast({
            title: '🚨 Alerta de Mercado',
            description: `${alert.indicatorLabel} atingiu sua meta de R$ ${currentPrice.toFixed(2)}.`,
          })
        }

        setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, active: false } : a)))
      }
    })
  }, [alerts, getPrice, toast])

  const refreshMarketPrices = useCallback(async () => {
    if (!isAutoUpdateEnabled) return
    setIsRefreshing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200))

      // Simulate > 24h sync fail rarely
      if (Math.random() < 0.05) {
        throw new Error('Sync failed > 24h')
      }

      const updatedPrices = [
        { id: 'boi-gordo-mt', price: 268.5 + (Math.random() * 2 - 1) },
        { id: 'novilha-mt', price: 252.0 + (Math.random() * 2 - 1) },
        { id: 'vaca-mt', price: 236.5 + (Math.random() * 2 - 1) },
      ]

      let maxVariation = 0

      setMarketData((prev) =>
        prev.map((item) => {
          const update = updatedPrices.find((u) => u.id === item.id)
          if (update) {
            const newPrice = Number(update.price.toFixed(2))
            const variation = Math.abs((newPrice - item.price) / item.price)
            if (variation > maxVariation) maxVariation = variation

            return {
              ...item,
              price: newPrice,
              trend: calculateTrend(item.price, newPrice),
              change: calculateChangeStr(item.price, newPrice),
              source: 'Datagro (API)',
            }
          }
          return item
        }),
      )

      // Simulate a random large variation sometimes
      if (Math.random() < 0.1 || maxVariation > 0.1) {
        toast({
          title: '🚨 Alerta DATAGRO',
          description: 'Variação diária superior a 10% detectada no Indicador de Mercado (MT).',
          variant: 'destructive',
        })
      }

      setLastUpdate(new Date().toLocaleTimeString('pt-BR'))

      toast({
        title: 'Sincronização DATAGRO Concluída',
        description: 'Cotações do MT (Boi Gordo, Reposição e Insumos) atualizadas.',
        className: 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
      })
    } catch (error) {
      toast({
        title: 'Erro de Sincronização (>24h)',
        description:
          'Falha ao buscar dados DATAGRO. A última sincronização ocorreu há mais de 24h.',
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [toast, isAutoUpdateEnabled])

  const toggleAutoUpdate = useCallback(
    (enabled: boolean) => {
      setIsAutoUpdateEnabled(enabled)
      if (enabled) {
        toast({
          title: 'Integração de Mercado Ativa',
          description: 'Os preços serão atualizados automaticamente via API DATAGRO.',
        })
        refreshMarketPrices()
      } else {
        toast({
          title: 'Modo Manual',
          description: 'A atualização automática foi desativada. Ajuste os valores manualmente.',
          variant: 'secondary',
        })
      }
    },
    [refreshMarketPrices, toast],
  )

  const setManualPrice = useCallback((id: string, price: number) => {
    setMarketData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newTrend = calculateTrend(item.price, price)
          const newChange = calculateChangeStr(item.price, price)
          return { ...item, price, trend: newTrend, change: newChange, source: 'Manual' }
        }
        return item
      }),
    )
    setLastUpdate(new Date().toLocaleTimeString('pt-BR') + ' (Manual)')
  }, [])

  useEffect(() => {
    if (!isAutoUpdateEnabled) return
    const fastTick = setInterval(() => {
      setB3Data((prev) => {
        const next = { ...prev }
        for (const key in next) {
          next[key] = next[key].map((item) => {
            const newPrice = fluctuatePrice(item.price, 0.002)
            return {
              ...item,
              price: newPrice,
              trend: calculateTrend(item.price, newPrice),
              change: calculateChangeStr(item.price, newPrice),
            }
          })
        }
        return next
      })
      setB3LastUpdate(new Date().toLocaleTimeString('pt-BR'))
    }, 8000)

    return () => clearInterval(fastTick)
  }, [isAutoUpdateEnabled])

  useEffect(() => {
    if (!isAutoUpdateEnabled) return
    const slowTick = setInterval(() => {
      const updateList = (list: MarketIndicator[]) =>
        list.map((item) => {
          if (item.source === 'Manual') return item
          const newPrice = fluctuatePrice(item.price, 0.005)
          return {
            ...item,
            price: newPrice,
            trend: calculateTrend(item.price, newPrice),
            change: calculateChangeStr(item.price, newPrice),
          }
        })

      setMarketData((prev) => updateList(prev))
      setReplacementData((prev) => updateList(prev))
      setCommodityData((prev) => updateList(prev))
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
    }, 25000)

    return () => clearInterval(slowTick)
  }, [isAutoUpdateEnabled])

  useEffect(() => {
    checkAlerts()
  }, [b3Data, marketData, checkAlerts])

  const addAlert = (alert: Omit<MarketAlert, 'id' | 'active'>) => {
    setAlerts((prev) => [{ ...alert, id: crypto.randomUUID(), active: true }, ...prev])
    toast({
      title: 'Alerta Configurado',
      description: `Monitorando ${alert.indicatorLabel} para disparar ${
        alert.notifyWhatsApp ? 'via WhatsApp' : 'no sistema'
      }.`,
    })
  }

  const toggleAlert = (id: string, active: boolean) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active } : a)))
  }

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    toast({ description: 'Alerta removido com sucesso.' })
  }

  const value = useMemo(
    () => ({
      marketData,
      b3Data,
      replacementData,
      commodityData,
      lastUpdate,
      b3LastUpdate,
      alerts,
      isAutoUpdateEnabled,
      isRefreshing,
      addAlert,
      toggleAlert,
      deleteAlert,
      getPrice,
      refreshMarketPrices,
      toggleAutoUpdate,
      setManualPrice,
    }),
    [
      marketData,
      b3Data,
      replacementData,
      commodityData,
      lastUpdate,
      b3LastUpdate,
      alerts,
      isAutoUpdateEnabled,
      isRefreshing,
      getPrice,
      refreshMarketPrices,
      toggleAutoUpdate,
      setManualPrice,
    ],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const context = useContext(MarketContext)
  if (!context) throw new Error('useMarket must be used within MarketProvider')
  return context
}
