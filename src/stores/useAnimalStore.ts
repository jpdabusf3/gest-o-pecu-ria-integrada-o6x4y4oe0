import { useState, useEffect, useCallback } from 'react'
import { AnimalRegistro } from '@/types/animal'

const STORAGE_KEY = '@f3_animais'

export default function useAnimalStore() {
  const [animais, setAnimais] = useState<AnimalRegistro[]>(() => {
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
        if (saved) setAnimais(JSON.parse(saved))
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

  const deleteRegistro = useCallback((id: string) => {
    setAnimais((prev) => {
      const updated = prev.filter((a) => a.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('animais-updated'))
      return updated
    })
  }, [])

  return { animais, addRegistro, deleteRegistro }
}
