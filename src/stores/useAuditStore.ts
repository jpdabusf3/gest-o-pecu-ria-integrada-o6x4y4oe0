import { useState, useEffect, useCallback } from 'react'

export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  entityType: 'Animal' | 'Colaborador'
  entityId: string
  action: 'Create' | 'Update' | 'Delete'
  details: string
}

const STORAGE_KEY = '@f3_audit_logs'

export default function useAuditStore() {
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return [
      {
        id: 'mock-1',
        timestamp: new Date().toISOString(),
        userId: 'U1',
        userName: 'Administrador (Sede)',
        entityType: 'Animal',
        entityId: 'TAG-1234',
        action: 'Create',
        details: 'Registro inicial do animal no sistema.',
      },
    ]
  })

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) setLogs(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
    window.addEventListener('audit-updated', handleUpdate)
    return () => window.removeEventListener('audit-updated', handleUpdate)
  }, [])

  const addLog = useCallback((log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    setLogs((prev) => {
      const newLog: AuditLog = {
        ...log,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }
      const updated = [newLog, ...prev]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('audit-updated'))
      return updated
    })
  }, [])

  return { logs, addLog }
}
