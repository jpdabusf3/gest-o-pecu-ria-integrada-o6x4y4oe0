import { useState, useEffect, useCallback } from 'react'
import { Fazenda } from '@/types/fazenda'

const STORAGE_KEY = '@f3_fazendas'

export default function useFazendaStore() {
  const [fazendas, setFazendas] = useState<Fazenda[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return [
      {
        id: '1',
        nome: 'Fazenda Boa Esperança',
        proprietario: 'Grupo Agro F3',
        localizacao: 'Ribeirão Preto, SP',
        area: 1500,
        rebanho: 3450,
        sistemas: ['ILP'],
        arrendamento: false,
        atividades: ['Ciclo Completo', 'Produção de Genética'],
        custoNutricao: 45000,
        custoManejo: 15000,
      },
    ]
  })

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) setFazendas(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
    window.addEventListener('fazendas-updated', handleUpdate)
    return () => window.removeEventListener('fazendas-updated', handleUpdate)
  }, [])

  const addFazenda = useCallback((fazenda: Fazenda) => {
    setFazendas((prev) => {
      const updated = [...prev, fazenda]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('fazendas-updated'))
      return updated
    })
  }, [])

  const deleteFazenda = useCallback((id: string) => {
    setFazendas((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('fazendas-updated'))
      return updated
    })
  }, [])

  const updateFazenda = useCallback((id: string, data: Partial<Fazenda>) => {
    setFazendas((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, ...data } : f))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('fazendas-updated'))
      return updated
    })
  }, [])

  return { fazendas, addFazenda, deleteFazenda, updateFazenda }
}
