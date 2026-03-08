import React, { createContext, useContext, useState, ReactNode } from 'react'

export type Role = 'admin' | 'operador'

export interface User {
  id: string
  name: string
  role: Role
  avatar: string
  email: string
  whatsapp?: string
}

export const mockUsers: User[] = [
  {
    id: 'U1',
    name: 'Administrador (Sede)',
    role: 'admin',
    avatar: 'https://img.usecurling.com/ppl/thumbnail?gender=male&seed=42',
    email: 'admin@fazenda.com',
    whatsapp: '(11) 99999-9999',
  },
  {
    id: 'U2',
    name: 'João (Operador Campo)',
    role: 'operador',
    avatar: 'https://img.usecurling.com/ppl/thumbnail?gender=male&seed=15',
    email: 'joao@fazenda.com',
    whatsapp: '(16) 98888-8888',
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
