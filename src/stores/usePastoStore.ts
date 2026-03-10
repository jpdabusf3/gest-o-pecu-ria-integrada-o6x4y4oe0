import { useState, useEffect, useCallback } from 'react'
import { Pasto } from '@/types/pasto'
import { pasturesData } from '@/data/mock'

const STORAGE_KEY = '@f3_pastos'

export default function usePastoStore() {
  const [pastos, setPastos] = useState<Pasto[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return pasturesData as Pasto[]
  })

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) setPastos(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
    window.addEventListener('pastos-updated', handleUpdate)
    return () => window.removeEventListener('pastos-updated', handleUpdate)
  }, [])

  const addPasto = useCallback((pasto: Pasto) => {
    setPastos((prev) => {
      const updated = [...prev, pasto]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('pastos-updated'))
      return updated
    })
  }, [])

  const updatePasto = useCallback((id: string | number, data: Partial<Pasto>) => {
    setPastos((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...data } : p))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('pastos-updated'))
      return updated
    })
  }, [])

  const deletePasto = useCallback((id: string | number) => {
    setPastos((prev) => {
      const updated = prev.filter((p) => p.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('pastos-updated'))
      return updated
    })
  }, [])

  return { pastos, addPasto, updatePasto, deletePasto }
}
