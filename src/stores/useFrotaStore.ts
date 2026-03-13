import { useState, useEffect, useCallback } from 'react'
import { fleetData } from '@/data/mock'

export interface Machine {
  id: string
  name: string
  type: string
  acquisitionValue: number
  currentHours: number | null
  currentKm: number | null
  fuelConsumption: number
  maintenanceCost: number
  depreciation: number
  status: string
}

export interface RefuelLog {
  id: string
  machineId: string
  machineName: string
  date: string
  fuelType: string
  quantity: number
  operator: string
}

export interface MaintenanceLog {
  id: string
  machineId: string
  machineName: string
  date: string
  category: string
  description: string
  operator: string
  cost: number
}

export interface IncidentLog {
  id: string
  machineId: string
  machineName: string
  date: string
  type: string
  description: string
  operator: string
}

const STORAGE_KEY = '@f3_frota_machines'
const REFUEL_KEY = '@f3_frota_refuels'
const MAINT_KEY = '@f3_frota_maints'
const INCIDENT_KEY = '@f3_frota_incidents'

export default function useFrotaStore() {
  const [machines, setMachines] = useState<Machine[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse machines:', e)
    }
    return fleetData as Machine[]
  })

  const [refuels, setRefuels] = useState<RefuelLog[]>(() => {
    try {
      const saved = localStorage.getItem(REFUEL_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse refuels:', e)
    }
    return []
  })

  const [maintenances, setMaintenances] = useState<MaintenanceLog[]>(() => {
    try {
      const saved = localStorage.getItem(MAINT_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse maintenances:', e)
    }
    return []
  })

  const [incidents, setIncidents] = useState<IncidentLog[]>(() => {
    try {
      const saved = localStorage.getItem(INCIDENT_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse incidents:', e)
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(machines))
  }, [machines])
  useEffect(() => {
    localStorage.setItem(REFUEL_KEY, JSON.stringify(refuels))
  }, [refuels])
  useEffect(() => {
    localStorage.setItem(MAINT_KEY, JSON.stringify(maintenances))
  }, [maintenances])
  useEffect(() => {
    localStorage.setItem(INCIDENT_KEY, JSON.stringify(incidents))
  }, [incidents])

  const addMachine = useCallback((machine: Omit<Machine, 'id'>) => {
    setMachines((prev) => [{ ...machine, id: `M${Date.now()}` }, ...prev])
  }, [])

  const addRefuel = useCallback((log: Omit<RefuelLog, 'id'>) => {
    setRefuels((prev) => [{ ...log, id: `R${Date.now()}` }, ...prev])
  }, [])

  const addMaintenance = useCallback((log: Omit<MaintenanceLog, 'id'>) => {
    setMaintenances((prev) => [{ ...log, id: `MA${Date.now()}` }, ...prev])
  }, [])

  const addIncident = useCallback((log: Omit<IncidentLog, 'id'>) => {
    setIncidents((prev) => [{ ...log, id: `I${Date.now()}` }, ...prev])
  }, [])

  return {
    machines,
    refuels,
    maintenances,
    incidents,
    addMachine,
    addRefuel,
    addMaintenance,
    addIncident,
  }
}
