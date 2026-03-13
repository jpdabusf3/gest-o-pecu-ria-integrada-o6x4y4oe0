import { useState, useEffect, useCallback } from 'react'

export interface FormulaIngredient {
  inventoryId: string
  percentage: number
}

export interface FeedFormula {
  id: string
  name: string
  outputInventoryId: string
  ingredients: FormulaIngredient[]
  version: number
  updatedAt: string
}

export interface FormulaHistory extends FeedFormula {
  historyId: string
  formulaId: string
}

export interface ProductionRun {
  id: string
  date: string
  formulaId: string
  formulaName: string
  amountProducedKg: number
  totalCost: number
  costPerKg: number
  destination: string
}

export interface IntegrationLog {
  id: string
  timestamp: string
  formulaName: string
  amountKg: number
  status: 'Processado' | 'Erro - Estoque Insuficiente' | 'Pendente'
  message: string
}

const STORAGE_KEY_FORMULAS = '@f3_feed_formulas'
const STORAGE_KEY_HISTORY = '@f3_feed_formulas_history'
const STORAGE_KEY_PRODUCTIONS = '@f3_feed_productions'
const STORAGE_KEY_LOGS = '@f3_feed_integration_logs'

const defaultFormulas: FeedFormula[] = [
  {
    id: 'FORM-1',
    name: 'Ração Terminação Alto Grão',
    outputInventoryId: 'N2',
    ingredients: [
      { inventoryId: 'M1', percentage: 75 },
      { inventoryId: 'M2', percentage: 20 },
      { inventoryId: 'M3', percentage: 5 },
    ],
    version: 1,
    updatedAt: new Date().toISOString(),
  },
]

export default function useFeedMillStore() {
  const [formulas, setFormulas] = useState<FeedFormula[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FORMULAS)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return defaultFormulas
  })

  const [history, setHistory] = useState<FormulaHistory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return []
  })

  const [productions, setProductions] = useState<ProductionRun[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUCTIONS)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return [
      {
        id: 'PROD-1',
        date: new Date(Date.now() - 86400000).toISOString(),
        formulaId: 'FORM-1',
        formulaName: 'Ração Terminação Alto Grão',
        amountProducedKg: 2000,
        totalCost: 2530,
        costPerKg: 1.265,
        destination: 'Estoque',
      },
    ]
  })

  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FORMULAS, JSON.stringify(formulas))
  }, [formulas])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history))
  }, [history])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PRODUCTIONS, JSON.stringify(productions))
  }, [productions])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(integrationLogs))
  }, [integrationLogs])

  const saveFormula = useCallback(
    (formula: Omit<FeedFormula, 'id' | 'version' | 'updatedAt'>, id?: string) => {
      setFormulas((prev) => {
        if (id) {
          const existing = prev.find((f) => f.id === id)
          if (existing) {
            const historyEntry: FormulaHistory = {
              ...existing,
              historyId: crypto.randomUUID(),
              formulaId: existing.id,
            }
            setHistory((h) => [historyEntry, ...h])

            return prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    ...formula,
                    version: f.version + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : f,
            )
          }
        }
        return [
          {
            ...formula,
            id: `FORM-${crypto.randomUUID()}`,
            version: 1,
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]
      })
    },
    [],
  )

  const addProduction = useCallback((run: Omit<ProductionRun, 'id' | 'date'>) => {
    setProductions((prev) => [
      {
        ...run,
        id: `PROD-${crypto.randomUUID()}`,
        date: new Date().toISOString(),
      },
      ...prev,
    ])
  }, [])

  const addIntegrationLog = useCallback((log: IntegrationLog) => {
    setIntegrationLogs((prev) => [log, ...prev])
  }, [])

  return {
    formulas,
    history,
    productions,
    integrationLogs,
    saveFormula,
    addProduction,
    addIntegrationLog,
  }
}
