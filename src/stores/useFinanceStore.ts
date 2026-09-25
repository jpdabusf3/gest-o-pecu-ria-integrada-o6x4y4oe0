import { useState, useEffect, useCallback } from 'react'

export interface LedgerEntry {
  id: string
  date: string
  description: string
  category: string
  amount: number
  animalId?: string
  loteId?: string
  type: 'expense' | 'revenue'
}

export interface LotThreshold {
  loteId: string
  threshold: number
}

const STORAGE_KEY = '@f3_finance_ledger'
const THRESHOLD_KEY = '@f3_finance_thresholds'

const defaultLedger: LedgerEntry[] = [
  {
    id: 'L1',
    date: new Date().toISOString().split('T')[0],
    description: 'Vacina Febre Aftosa',
    category: 'Sanidade',
    amount: 15.5,
    animalId: 'TAG-1234',
    type: 'expense',
  },
  {
    id: 'L2',
    date: new Date().toISOString().split('T')[0],
    description: 'Suplemento Proteico (Rateio)',
    category: 'Nutrição',
    amount: 45.0,
    animalId: 'TAG-1234',
    type: 'expense',
  },
  {
    id: 'L3',
    date: new Date().toISOString().split('T')[0],
    description: 'Manejo e Pesagem',
    category: 'Mão de Obra',
    amount: 10.0,
    animalId: 'TAG-1234',
    type: 'expense',
  },
  {
    id: 'L4',
    date: new Date().toISOString().split('T')[0],
    description: 'Ração Terminação Alto Grão',
    category: 'Nutrição',
    amount: 11500.0,
    loteId: 'y2tb4dew3rtov5d',
    type: 'expense',
  },
  {
    id: 'L5',
    date: new Date().toISOString().split('T')[0],
    description: 'Protocolo Sanitário Terminação (Vermífugo + Clostridiose)',
    category: 'Sanidade',
    amount: 1850.0,
    loteId: 'y2tb4dew3rtov5d',
    type: 'expense',
  },
  {
    id: 'L6',
    date: new Date().toISOString().split('T')[0],
    description: 'Manejo de Curral e Diárias Confinamento',
    category: 'Mão de Obra',
    amount: 2400.0,
    loteId: 'y2tb4dew3rtov5d',
    type: 'expense',
  },
  {
    id: 'L7',
    date: new Date().toISOString().split('T')[0],
    description: 'Suplemento Proteico Águas 0.1%',
    category: 'Nutrição',
    amount: 6800.0,
    loteId: 'mqfxuk89cdw4bsk',
    type: 'expense',
  },
  {
    id: 'L8',
    date: new Date().toISOString().split('T')[0],
    description: 'Vacinação Reprodutiva e Mineralização',
    category: 'Sanidade',
    amount: 2100.0,
    loteId: 'mqfxuk89cdw4bsk',
    type: 'expense',
  },
  {
    id: 'L9',
    date: new Date().toISOString().split('T')[0],
    description: 'Manejo de Pastagem Rotacionada',
    category: 'Manejo',
    amount: 1900.0,
    loteId: 'mqfxuk89cdw4bsk',
    type: 'expense',
  },
  {
    id: 'L10',
    date: new Date().toISOString().split('T')[0],
    description: 'Concentrado e Sal Mineralizado',
    category: 'Nutrição',
    amount: 4900.0,
    loteId: 'orxzk0hnfts9eqn',
    type: 'expense',
  },
  {
    id: 'L11',
    date: new Date().toISOString().split('T')[0],
    description: 'Diárias de Pastoreio Arrendamento',
    category: 'Arrendamento',
    amount: 3100.0,
    loteId: 'orxzk0hnfts9eqn',
    type: 'expense',
  },
  {
    id: 'L12',
    date: new Date().toISOString().split('T')[0],
    description: 'Ração e Núcleo Confinamento',
    category: 'Nutrição',
    amount: 14200.0,
    loteId: '9tdbbchcxqgr5sm',
    type: 'expense',
  },
  {
    id: 'L13',
    date: new Date().toISOString().split('T')[0],
    description: 'Sanidade e Vacinas Entrada',
    category: 'Sanidade',
    amount: 2300.0,
    loteId: '9tdbbchcxqgr5sm',
    type: 'expense',
  },
]

const defaultThresholds: LotThreshold[] = [
  { loteId: 'LEN-02', threshold: 10000 },
  { loteId: 'LCR-01', threshold: 5000 },
]

export default function useFinanceStore() {
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return defaultLedger
  })

  const [lotThresholds, setLotThresholds] = useState<LotThreshold[]>(() => {
    try {
      const saved = localStorage.getItem(THRESHOLD_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return defaultThresholds
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger))
  }, [ledger])

  useEffect(() => {
    localStorage.setItem(THRESHOLD_KEY, JSON.stringify(lotThresholds))
  }, [lotThresholds])

  const addEntry = useCallback(
    (entry: Omit<LedgerEntry, 'id'> | (Omit<LedgerEntry, 'id' | 'date'> & { date?: string })) => {
      const fullEntry: LedgerEntry = {
        date: entry.date || new Date().toISOString().split('T')[0],
        ...entry,
        id: crypto.randomUUID(),
      }
      setLedger((prev) => [fullEntry, ...prev])
    },
    [],
  )

  const setLotThreshold = useCallback((loteId: string, threshold: number) => {
    setLotThresholds((prev) => {
      const existing = prev.filter((p) => p.loteId !== loteId)
      return [...existing, { loteId, threshold }]
    })
  }, [])

  return { ledger, addEntry, lotThresholds, setLotThreshold }
}
