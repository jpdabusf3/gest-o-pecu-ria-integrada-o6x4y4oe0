import { createContext, useContext, useState, ReactNode } from 'react'

export type Task = {
  id: string
  title: string
  frequency: string
  assignedTo: string
  duration: number
  costPerHour: number
  status: 'Pendente' | 'Concluído'
  lotId: string
}

const initialTasks: Task[] = [
  {
    id: 'T1',
    title: 'Vacinação Febre Aftosa',
    frequency: 'Semestral',
    assignedTo: 'João (Operador Campo)',
    duration: 8,
    costPerHour: 25,
    status: 'Pendente',
    lotId: 'LCR-04',
  },
  {
    id: 'T2',
    title: 'Limpeza de Cochos Baia 01',
    frequency: 'Semanal',
    assignedTo: 'Carlos (Tratorista)',
    duration: 2,
    costPerHour: 20,
    status: 'Concluído',
    lotId: 'LEN-02',
  },
  {
    id: 'T3',
    title: 'Manutenção de Cerca',
    frequency: 'Mensal',
    assignedTo: 'João (Operador Campo)',
    duration: 6,
    costPerHour: 25,
    status: 'Pendente',
    lotId: 'Pasto 02',
  },
  {
    id: 'T4',
    title: 'Pesagem Lote LEN-01',
    frequency: 'Mensal',
    assignedTo: 'Carlos (Tratorista)',
    duration: 4,
    costPerHour: 20,
    status: 'Pendente',
    lotId: 'LEN-01',
  },
]

interface TaskContextType {
  serverTasks: Task[]
  completeTaskOnServer: (id: string) => void
  addTaskOnServer: (task: Task) => void
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export function TaskProvider({ children }: { children: ReactNode }) {
  const [serverTasks, setServerTasks] = useState<Task[]>(initialTasks)

  const completeTaskOnServer = (id: string) => {
    setServerTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Concluído' } : t)))
  }

  const addTaskOnServer = (task: Task) => {
    setServerTasks((prev) => [...prev, task])
  }

  return (
    <TaskContext.Provider value={{ serverTasks, completeTaskOnServer, addTaskOnServer }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  const context = useContext(TaskContext)
  if (!context) throw new Error('useTasks must be used within TaskProvider')
  return context
}
