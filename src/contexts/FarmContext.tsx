import React, { createContext, useContext, useState, useEffect } from 'react'
import { getEstoqueInsumos, salvarItemEstoque } from '@/services/fechamento'
import { getLotesRebanho } from '@/services/rebanho'

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
  lots: any[]
  historicalWeights: Record<string, LotWeightRecord[]>
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => void
  removeInventoryItem: (id: string) => void
  registerConsumption: (loteId: string, inventoryId: string, amount: number) => Promise<void>
  registerFeedConsumption: (loteId: string, inventoryId: string, amount: number) => Promise<void>
  registerPurchase: (inventoryId: string, amount: number, totalCost: number) => void
  updateMinThreshold: (inventoryId: string, newMin: number) => void
  addWeightRecord: (loteId: string, weight: number, date: string) => void
  getPredictedSlaughterDate: (loteId: string) => Date | null
  getPredictedGrowthCurve: (loteId: string) => any[]
  reloadInventory: () => Promise<void>
  reloadLots: () => Promise<void>
}

const FarmContext = createContext<FarmContextType | undefined>(undefined)

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [lots, setLots] = useState<any[]>([])
  const [historicalWeights, setHistoricalWeights] = useState<Record<string, LotWeightRecord[]>>({})

  const reloadInventory = async () => {
    try {
      const items = await getEstoqueInsumos()
      if (items && items.length > 0) {
        const mapped: InventoryItem[] = items.map((i) => {
          const nomeLower = (i.produto || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
          const catLower = (i.categoria || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')

          // Derivação dinâmica do tipo de item para compatibilidade total com as abas de estoque
          let tipoDerivado = 'Almoxarifado'

          if (
            nomeLower.includes('milho') ||
            nomeLower.includes('soja') ||
            nomeLower.includes('farelo') ||
            nomeLower.includes('bagaco') ||
            nomeLower.includes('silagem') ||
            nomeLower.includes('polpa') ||
            nomeLower.includes('ddg') ||
            nomeLower.includes('sorgo') ||
            nomeLower.includes('materia prima')
          ) {
            tipoDerivado = 'Materia Prima'
          } else if (
            catLower === 'sanidade' ||
            catLower.includes('farmacia') ||
            nomeLower.includes('vacina') ||
            nomeLower.includes('vermifugo') ||
            nomeLower.includes('antibiotico') ||
            nomeLower.includes('medicamento') ||
            nomeLower.includes('biologico') ||
            nomeLower.includes('antiparasitario')
          ) {
            tipoDerivado = 'Biológico'
          } else if (
            catLower === 'semen' ||
            nomeLower.includes('semen') ||
            nomeLower.includes('hormonio') ||
            nomeLower.includes('iatf')
          ) {
            tipoDerivado = 'Sêmen'
          } else if (
            catLower === 'nutricao' ||
            catLower.includes('suplemento') ||
            nomeLower.includes('nucleo') ||
            nomeLower.includes('suplemento') ||
            nomeLower.includes('concentrado') ||
            nomeLower.includes('racao') ||
            nomeLower.includes('sal') ||
            nomeLower.includes('ureia') ||
            nomeLower.includes('mineral')
          ) {
            tipoDerivado = 'Suplemento'
          } else if (
            catLower === 'combustivel' ||
            nomeLower.includes('diesel') ||
            nomeLower.includes('gasolina') ||
            nomeLower.includes('cerca') ||
            nomeLower.includes('arame')
          ) {
            tipoDerivado = 'Material Cerca'
          } else if (i.categoria) {
            tipoDerivado = i.categoria
          }

          return {
            id: i.codigo || i.id,
            item: i.produto,
            tipo: tipoDerivado,
            qtd: i.estoque_final,
            minQtd: 50,
            unidade: i.unidade,
            status: i.estoque_final <= 50 ? 'Baixo' : 'Normal',
            custoUnitario: i.preco_unitario,
          }
        })
        setInventory(mapped)
      }
    } catch (e) {
      console.warn('Erro ao carregar estoque PocketBase:', e)
    }
  }

  // Recarrega os lotes reais (coleção `lots`) para alimentar o dashboard,
  // pesagens e fechamento — agora incluindo os lotes do módulo Rebanho.
  const reloadLots = async () => {
    try {
      const lotsPb = await getLotesRebanho()
      setLots(lotsPb)
    } catch (e) {
      console.warn('Erro ao carregar lotes do rebanho:', e)
    }
  }

  useEffect(() => {
    reloadInventory()
    reloadLots()
  }, [])

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    setInventory((prev) => [{ ...item, id: `NEW-${crypto.randomUUID()}` }, ...prev])
  }

  const updateInventoryItem = (id: string, data: Partial<InventoryItem>) => {
    setInventory((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)))
  }

  const removeInventoryItem = (id: string) => {
    setInventory((prev) => prev.filter((item) => item.id !== id))
  }

  const registerConsumption = async (_loteId: string, inventoryId: string, amount: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === inventoryId ? { ...item, qtd: Math.max(0, item.qtd - amount) } : item,
      ),
    )

    // Dedução persistente na coleção real estoque_insumos
    try {
      const items = await getEstoqueInsumos()
      const match = items.find((i) => i.codigo === inventoryId || i.id === inventoryId)
      if (match) {
        const saidasNovas = (match.saidas || 0) + amount
        await salvarItemEstoque({
          id: match.id,
          produto: match.produto,
          codigo: match.codigo,
          unidade: match.unidade,
          categoria: match.categoria,
          estoque_inicial: match.estoque_inicial,
          entradas: match.entradas,
          saidas: saidasNovas,
          preco_unitario: match.preco_unitario,
          periodo_mes: match.periodo_mes || new Date().toISOString().slice(0, 7),
        })
      }
    } catch (err) {
      console.warn('Erro ao registrar consumo persistente no estoque:', err)
    }
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
          return { ...lot, pesoMedio: weight }
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
        reloadInventory,
        reloadLots,
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
