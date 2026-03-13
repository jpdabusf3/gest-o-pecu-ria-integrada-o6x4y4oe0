import { useState, useEffect, useCallback } from 'react'

export interface HedgePosition {
  id: string
  contractCode: string
  type: 'Future' | 'Put' | 'Call'
  quantity: number
  strikePrice: number
  premiumPaid: number
  expiryDate: string
  basisLocal: number
  status: 'Aberto' | 'Encerrado'
}

const STORAGE_KEY = '@f3_hedge_positions'

export default function useHedgeStore() {
  const [positions, setPositions] = useState<HedgePosition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return [
      {
        id: 'H1',
        contractCode: 'BGIV26',
        type: 'Put',
        quantity: 10,
        strikePrice: 280.0,
        premiumPaid: 5.5,
        expiryDate: '2026-10-31',
        basisLocal: -15.0,
        status: 'Aberto',
      },
    ]
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
  }, [positions])

  const addPosition = useCallback((pos: Omit<HedgePosition, 'id'>) => {
    setPositions((prev) => [{ ...pos, id: crypto.randomUUID() }, ...prev])
  }, [])

  return { positions, addPosition }
}
