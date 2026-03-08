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

const STORAGE_KEY = '@f3_finance_ledger'

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger))
  }, [ledger])

  const addEntry = useCallback((entry: Omit<LedgerEntry, 'id'>) => {
    setLedger((prev) => [{ ...entry, id: crypto.randomUUID() }, ...prev])
  }, [])

  return { ledger, addEntry }
}
