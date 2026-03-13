import React, { createContext, useContext, useState } from 'react'
import { confinementData, inventoryData } from '@/data/mock'

export type LotWeightRecord = { date: string; weight: number }

export type InventoryItem = {
  id: string
  item: string
  tipo: string
  qtd: number
  consumoDiario?: number
  minQtd: number
  unidade: string
  status: string
  custoUnitario?: number
}

export type FarmContextType = {
  inventory: InventoryItem[]
  lots: typeof confinementData.lotes
  historicalWeights: Record<string, LotWeightRecord[]>
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => void
  removeInventoryItem: (id: string) => void
  registerConsumption: (loteId: string, inventoryId: string, amount: number) => void
  registerFeedConsumption: (loteId: string, inventoryId: string, amount: number) => void
  registerPurchase: (inventoryId: string, amount: number, totalCost: number) => void
  updateMinThreshold: (inventoryId: string, newMin: number) => void
  addWeightRecord: (loteId: string, weight: number, date: string) => void
  getPredictedSlaughterDate: (loteId: string) => Date | null
  getPredictedGrowthCurve: (loteId: string) => any[]
}

const initialWeights: Record<string, LotWeightRecord[]> = {
  'CONF-01': [
    { date: '2025-12-01', weight: 350 },
    { date: '2026-01-01', weight: 395 },
    { date: '2026-02-01', weight: 440 },
    { date: '2026-03-01', weight: 480 },
  ],
  'CONF-02': [
    { date: '2026-01-15', weight: 300 },
    { date: '2026-02-15', weight: 325 },
    { date: '2026-03-01', weight: 350 },
  ],
  'CONF-03': [
    { date: '2025-11-01', weight: 380 },
    { date: '2026-01-01', weight: 400 },
    { date: '2026-03-01', weight: 420 },
  ],
}

const initialInventory: InventoryItem[] = [
  ...inventoryData.farmacia.map((i: any) => ({ ...i, custoUnitario: i.custoUnitario || 1.5 })),
  ...inventoryData.almoxarifado.map((i: any) => ({ ...i, custoUnitario: i.custoUnitario || 50.0 })),
  ...inventoryData.nutricao.map((i: any) => ({ ...i, custoUnitario: i.custoUnitario || 2.5 })),
]

const FarmContext = createContext<FarmContextType | undefined>(undefined)

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [lots, setLots] = useState(confinementData.lotes)
  const [historicalWeights, setHistoricalWeights] =
    useState<Record<string, LotWeightRecord[]>>(initialWeights)

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    setInventory((prev) => [{ ...item, id: `NEW-${crypto.randomUUID()}` }, ...prev])
  }

  const updateInventoryItem = (id: string, data: Partial<InventoryItem>) => {
    setInventory((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)))
  }

  const removeInventoryItem = (id: string) => {
    setInventory((prev) => prev.filter((item) => item.id !== id))
  }

  const registerConsumption = (loteId: string, inventoryId: string, amount: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === inventoryId ? { ...item, qtd: Math.max(0, item.qtd - amount) } : item,
      ),
    )
  }

  const registerPurchase = (inventoryId: string, amount: number, totalCost: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === inventoryId) {
          const currentTotalValue = item.qtd * (item.custoUnitario || 0)
          const newTotalValue = currentTotalValue + totalCost
          const newQtd = item.qtd + amount
          const newCustoUnitario = newQtd > 0 ? newTotalValue / newQtd : item.custoUnitario
          return { ...item, qtd: newQtd, custoUnitario: newCustoUnitario }
        }
        return item
      }),
    )
  }

  const updateMinThreshold = (inventoryId: string, newMin: number) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === inventoryId ? { ...item, minQtd: newMin } : item)),
    )
  }

  const addWeightRecord = (loteId: string, weight: number, date: string) => {
    setHistoricalWeights((prev) => {
      const history = prev[loteId] || []
      const newHistory = [...history, { date, weight }].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )
      return { ...prev, [loteId]: newHistory }
    })

    setLots((prev) =>
      prev.map((lot) => {
        if (lot.id === loteId) {
          const history = [...(historicalWeights[loteId] || []), { date, weight }].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
          let gmd = lot.gmd
          if (history.length >= 2) {
            const first = history[0]
            const last = history[history.length - 1]
            const days =
              (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 3600 * 24)
            if (days > 0) {
              gmd = Number(((last.weight - first.weight) / days).toFixed(2))
            }
          }
          return { ...lot, pesoMedio: weight, gmd }
        }
        return lot
      }),
    )
  }

  const getPredictedSlaughterDate = (loteId: string) => {
    const lot = lots.find((l) => l.id === loteId)
    const history = historicalWeights[loteId]
    if (!lot || !history || history.length === 0) return null

    const lastRecord = history[history.length - 1]
    const gmd = lot.gmd > 0 ? lot.gmd : 1.0
    const targetWeight = 540

    if (lastRecord.weight >= targetWeight) return new Date(lastRecord.date)

    const remainingWeight = targetWeight - lastRecord.weight
    const daysNeeded = remainingWeight / gmd

    const targetDate = new Date(lastRecord.date)
    targetDate.setDate(targetDate.getDate() + daysNeeded)
    return targetDate
  }

  const getPredictedGrowthCurve = (loteId: string) => {
    const history = historicalWeights[loteId] || []
    const lot = lots.find((l) => l.id === loteId)
    if (!history.length || !lot) return []

    const curve: any[] = []

    history.forEach((record) => {
      const [y, m, d] = record.date.split('-')
      const localDate = new Date(Number(y), Number(m) - 1, Number(d))
      curve.push({
        month: localDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        actual: record.weight,
        expected: record.weight,
        timestamp: localDate.getTime(),
      })
    })

    const lastRecord = curve[curve.length - 1]
    let currentWeight = lastRecord.actual
    let currentDate = new Date(lastRecord.timestamp)
    const gmd = lot.gmd > 0 ? lot.gmd : 1.0
    const targetWeight = 540

    for (let i = 1; i <= 4; i++) {
      currentDate.setMonth(currentDate.getMonth() + 1)
      currentWeight += gmd * 30

      curve.push({
        month: currentDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        expected: Number(currentWeight.toFixed(1)),
        timestamp: currentDate.getTime(),
      })
      if (currentWeight >= targetWeight) break
    }

    return curve
  }

  return (
    <FarmContext.Provider
      value={{
        inventory,
        lots,
        historicalWeights,
        addInventoryItem,
        updateInventoryItem,
        removeInventoryItem,
        registerConsumption,
        registerFeedConsumption: registerConsumption,
        registerPurchase,
        updateMinThreshold,
        addWeightRecord,
        getPredictedSlaughterDate,
        getPredictedGrowthCurve,
      }}
    >
      {children}
    </FarmContext.Provider>
  )
}

export function useFarm() {
  const context = useContext(FarmContext)
  if (!context) throw new Error('useFarm must be used within FarmProvider')
  return context
}
