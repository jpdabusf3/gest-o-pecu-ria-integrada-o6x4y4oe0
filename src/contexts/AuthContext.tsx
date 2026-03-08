import React, { createContext, useContext, useState, ReactNode } from 'react'

export type Role = 'admin' | 'gerente' | 'operador'

export interface UserPreferences {
  whatsappEnabled: boolean
  notifyHealth: boolean
  notifyFinancial: boolean
  notifyManagement: boolean
}

export interface User {
  id: string
  name: string
  role: Role
  avatar: string
  email: string
  whatsapp?: string
  preferences: UserPreferences
}

export const mockUsers: User[] = [
  {
    id: 'U1',
    name: 'Administrador (Sede)',
    role: 'admin',
    avatar: 'https://img.usecurling.com/ppl/thumbnail?gender=male&seed=42',
    email: 'admin@fazenda.com',
    whatsapp: '(11) 99999-9999',
    preferences: {
      whatsappEnabled: true,
      notifyHealth: true,
      notifyFinancial: true,
      notifyManagement: true,
    },
  },
  {
    id: 'U3',
    name: 'Carlos (Gerente)',
    role: 'gerente',
    avatar: 'https://img.usecurling.com/ppl/thumbnail?gender=male&seed=22',
    email: 'gerente@fazenda.com',
    whatsapp: '(11) 97777-7777',
    preferences: {
      whatsappEnabled: true,
      notifyHealth: true,
      notifyFinancial: false,
      notifyManagement: true,
    },
  },
  {
    id: 'U2',
    name: 'João (Operador Campo)',
    role: 'operador',
    avatar: 'https://img.usecurling.com/ppl/thumbnail?gender=male&seed=15',
    email: 'joao@fazenda.com',
    whatsapp: '(16) 98888-8888',
    preferences: {
      whatsappEnabled: false,
      notifyHealth: false,
      notifyFinancial: false,
      notifyManagement: false,
    },
  },
]

interface AuthContextType {
  user: User
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(mockUsers[0])

  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
