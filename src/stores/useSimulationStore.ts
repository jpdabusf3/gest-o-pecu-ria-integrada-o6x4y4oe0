import { useState, useEffect, useCallback } from 'react'

export interface SimulationResult {
  id: string
  date: string
  category: string
  weight: number
  salesPrice: number
  productionCost: number
  farmCost?: number
  arrobas: number
  revenue: number
  profit: number
  margin: number
  farmIds?: string[]
}

const STORAGE_KEY = '@fazenda-simulations'

export default function useSimulationStore() {
  const [simulations, setSimulations] = useState<SimulationResult[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return []
  })

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) setSimulations(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
    window.addEventListener('simulations-updated', handleUpdate)
    return () => window.removeEventListener('simulations-updated', handleUpdate)
  }, [])

  const addSimulation = useCallback((sim: Omit<SimulationResult, 'id' | 'date'>) => {
    setSimulations((prev) => {
      const newSim: SimulationResult = {
        ...sim,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
      }
      const updated = [newSim, ...prev]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('simulations-updated'))
      return updated
    })
  }, [])

  const deleteSimulation = useCallback((id: string) => {
    setSimulations((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('simulations-updated'))
      return updated
    })
  }, [])

  return { simulations, addSimulation, deleteSimulation }
}
