import { useState, useEffect, useCallback } from 'react'

export interface SlaughterRecord {
  id: string
  lotId: string
  frigorificoName: string
  date: string
  headcount: number
  pesoVivoTotal: number
  pesoCarcacaTotal: number
  valorTotal: number
  yieldPct: number
  pricePerArroba: number
}

const STORAGE_KEY = '@f3_slaughter_records'

export default function useAbateStore() {
  const [records, setRecords] = useState<SlaughterRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return [
      {
        id: 'A1',
        lotId: 'LEN-02',
        frigorificoName: 'Frigorífico Boi Forte',
        date: '2026-03-10',
        headcount: 50,
        pesoVivoTotal: 26000,
        pesoCarcacaTotal: 14170,
        valorTotal: 236166.67,
        yieldPct: 54.5,
        pricePerArroba: 250.0,
      },
    ]
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }, [records])

  const addRecord = useCallback(
    (rec: Omit<SlaughterRecord, 'id' | 'yieldPct' | 'pricePerArroba'>) => {
      const yieldPct = (rec.pesoCarcacaTotal / rec.pesoVivoTotal) * 100
      const arrobas = rec.pesoCarcacaTotal / 15
      const pricePerArroba = rec.valorTotal / arrobas

      setRecords((prev) => [{ ...rec, yieldPct, pricePerArroba, id: crypto.randomUUID() }, ...prev])
    },
    [],
  )

  return { records, addRecord }
}
