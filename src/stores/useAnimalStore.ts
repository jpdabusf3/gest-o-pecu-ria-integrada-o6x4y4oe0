import { useState, useEffect, useCallback } from 'react'
import { AnimalRegistro } from '@/types/animal'

const STORAGE_KEY = '@f3_animais'

const migrateData = (data: any[]): AnimalRegistro[] => {
  return data.map((a) => {
    if (['Corte', 'Reprodução'].includes(a.categoria)) {
      let newCat = a.categoria
      if (a.categoria === 'Corte') {
        newCat = a.sexo === 'Fêmea' ? 'Novilhas' : 'Bois'
      } else if (a.categoria === 'Reprodução') {
        newCat = a.sexo === 'Fêmea' ? 'Vacas (Matrizes)' : 'Touros'
      }
      return { ...a, categoria: newCat }
    }
    return a
  })
}

export default function useAnimalStore() {
  const [animais, setAnimais] = useState<AnimalRegistro[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return migrateData(JSON.parse(saved))
      }
    } catch (e) {
      console.error(e)
    }
    return []
  })

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setAnimais(migrateData(JSON.parse(saved)))
        }
      } catch (e) {
        console.error(e)
      }
    }
    window.addEventListener('animais-updated', handleUpdate)
    return () => window.removeEventListener('animais-updated', handleUpdate)
  }, [])

  const addRegistro = useCallback((registro: AnimalRegistro) => {
    setAnimais((prev) => {
      const updated = [registro, ...prev]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('animais-updated'))
      return updated
    })
  }, [])

  const updateRegistro = useCallback((id: string, data: Partial<AnimalRegistro>) => {
    setAnimais((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...data } : a))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('animais-updated'))
      return updated
    })
  }, [])

  const deleteRegistro = useCallback((id: string) => {
    setAnimais((prev) => {
      const updated = prev.filter((a) => a.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('animais-updated'))
      return updated
    })
  }, [])

  return { animais, addRegistro, updateRegistro, deleteRegistro }
}
