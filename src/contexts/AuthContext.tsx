import React, { createContext, useContext, useState, useEffect } from 'react'

export type Role = 'gestor' | 'capataz' | 'operador' | 'admin' | 'gerente'

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  pushEnabled: boolean
  whatsappEnabled: boolean
  notifyCriticalInventory: boolean
  notifyTaskCompletion: boolean
  notifyHealth: boolean
  notifyManagement: boolean
  notifyFinancial: boolean
  notifyVacasCorte: boolean
  notifyNovilhasMatrizes: boolean
  compactMode?: boolean
  offlineSyncFrequency?: 'instant' | '15min' | 'hourly' | 'manual'
  dashboardLayout?: string[]
}

export interface User {
  id: string
  name: string
  role: Role
  email: string
  avatar: string
  avatarUrl?: string
  whatsapp?: string
  preferences: UserPreferences
}

export const mockUsers: User[] = [
  {
    id: 'usr-1',
    name: 'Carlos Fazendeiro',
    email: 'carlos@pecuariaf3.com.br',
    role: 'gestor',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=1',
    avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=1',
    whatsapp: '+55 67 99999-1111',
    preferences: {
      theme: 'system',
      pushEnabled: true,
      whatsappEnabled: true,
      notifyCriticalInventory: true,
      notifyTaskCompletion: true,
      notifyHealth: true,
      notifyManagement: true,
      notifyFinancial: true,
      notifyVacasCorte: true,
      notifyNovilhasMatrizes: true,
      compactMode: false,
      offlineSyncFrequency: 'instant',
      dashboardLayout: ['kpis', 'gmd', 'alerts', 'activities'],
    },
  },
  {
    id: 'usr-2',
    name: 'Antônio Capataz',
    email: 'antonio@pecuariaf3.com.br',
    role: 'capataz',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=2',
    avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=2',
    whatsapp: '+55 67 99999-2222',
    preferences: {
      theme: 'system',
      pushEnabled: true,
      whatsappEnabled: true,
      notifyCriticalInventory: true,
      notifyTaskCompletion: true,
      notifyHealth: true,
      notifyManagement: false,
      notifyFinancial: false,
      notifyVacasCorte: false,
      notifyNovilhasMatrizes: false,
      compactMode: true,
      offlineSyncFrequency: '15min',
      dashboardLayout: ['tasks', 'pastures', 'health'],
    },
  },
  {
    id: 'usr-3',
    name: 'João Vaqueiro',
    email: 'joao@pecuariaf3.com.br',
    role: 'operador',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=3',
    avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=3',
    whatsapp: '+55 67 99999-3333',
    preferences: {
      theme: 'system',
      pushEnabled: true,
      whatsappEnabled: false,
      notifyCriticalInventory: false,
      notifyTaskCompletion: true,
      notifyHealth: false,
      notifyManagement: false,
      notifyFinancial: false,
      notifyVacasCorte: false,
      notifyNovilhasMatrizes: false,
      compactMode: true,
      offlineSyncFrequency: 'manual',
      dashboardLayout: ['field-tasks'],
    },
  },
]

interface AuthContextType {
  user: User
  setUser: (user: User) => void
  switchRole: (role: Role) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  logout: () => void
  isGestor: boolean
  isCapataz: boolean
  isOperador: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('gpi_auth_user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    return mockUsers[0]
  })

  useEffect(() => {
    localStorage.setItem('gpi_auth_user', JSON.stringify(currentUser))
  }, [currentUser])

  const switchRole = (role: Role) => {
    const userForRole = mockUsers.find((u) => u.role === role) || {
      ...currentUser,
      role,
    }
    setCurrentUser(userForRole)
  }

  const updatePreferences = (preferences: Partial<UserPreferences>) => {
    setCurrentUser((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...preferences,
      },
    }))
  }

  const logout = () => {
    setCurrentUser(mockUsers[0])
  }

  const isGestor =
    currentUser.role === 'gestor' || currentUser.role === 'admin' || currentUser.role === 'gerente'
  const isCapataz = currentUser.role === 'capataz'
  const isOperador = currentUser.role === 'operador'

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        setUser: setCurrentUser,
        switchRole,
        updatePreferences,
        logout,
        isGestor,
        isCapataz,
        isOperador,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
