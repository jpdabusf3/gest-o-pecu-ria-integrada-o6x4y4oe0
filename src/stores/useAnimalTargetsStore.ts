import { useState, useEffect, useCallback } from 'react'

export interface AnimalTargets {
  pesoAlvoCorte: number
  idadeAlvoMesesCorte: number
}

const STORAGE_KEY = '@f3_animal_targets'

export default function useAnimalTargetsStore() {
  const [targets, setTargets] = useState<AnimalTargets>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return { pesoAlvoCorte: 500, idadeAlvoMesesCorte: 24 }
  })

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) setTargets(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
    window.addEventListener('animal-targets-updated', handleUpdate)
    return () => window.removeEventListener('animal-targets-updated', handleUpdate)
  }, [])

  const updateTargets = useCallback((newTargets: Partial<AnimalTargets>) => {
    setTargets((prev) => {
      const updated = { ...prev, ...newTargets }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('animal-targets-updated'))
      return updated
    })
  }, [])

  return { targets, updateTargets }
}
