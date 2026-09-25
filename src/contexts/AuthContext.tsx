import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'

export type Role =
  | 'proprietario'
  | 'socio'
  | 'gestor'
  | 'capataz'
  | 'vaqueiro'
  | 'servente'
  | 'operador'
  | 'admin'
  | 'gerente'

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

export const defaultPreferences: UserPreferences = {
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
}

export const fallbackUsers: Record<Role, User> = {
  proprietario: {
    id: 'usr-proprietario',
    name: 'Dr. Carlos Eduardo',
    email: 'proprietario@pecuariaf3.com.br',
    role: 'proprietario',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=8',
    preferences: defaultPreferences,
  },
  socio: {
    id: 'usr-socio',
    name: 'Mariana Castro',
    email: 'socio@pecuariaf3.com.br',
    role: 'socio',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=female&seed=9',
    preferences: defaultPreferences,
  },
  gestor: {
    id: 'usr-gestor',
    name: 'João Pedro (Gestor)',
    email: 'joaopedro_zoo@hotmail.com',
    role: 'gestor',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=1',
    preferences: defaultPreferences,
  },
  capataz: {
    id: 'usr-capataz',
    name: 'Antônio Capataz',
    email: 'antonio.capataz@pecuariaf3.com.br',
    role: 'capataz',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=2',
    preferences: { ...defaultPreferences, compactMode: true },
  },
  vaqueiro: {
    id: 'usr-vaqueiro',
    name: 'João Vaqueiro',
    email: 'joao.vaqueiro@pecuariaf3.com.br',
    role: 'vaqueiro',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=3',
    preferences: { ...defaultPreferences, compactMode: true },
  },
  servente: {
    id: 'usr-servente',
    name: 'Tiago Servente',
    email: 'tiago.servente@pecuariaf3.com.br',
    role: 'servente',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=6',
    preferences: { ...defaultPreferences, compactMode: true },
  },
  operador: {
    id: 'usr-operador',
    name: 'João Vaqueiro',
    email: 'joao.vaqueiro@pecuariaf3.com.br',
    role: 'operador',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=3',
    preferences: { ...defaultPreferences, compactMode: true },
  },
  admin: {
    id: 'usr-admin',
    name: 'Admin Sistema',
    email: 'admin@pecuariaf3.com.br',
    role: 'admin',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=4',
    preferences: defaultPreferences,
  },
  gerente: {
    id: 'usr-gerente',
    name: 'Gerente Operacional',
    email: 'gerente@pecuariaf3.com.br',
    role: 'gerente',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=5',
    preferences: defaultPreferences,
  },
}

interface AuthContextType {
  user: User
  setUser: (user: User) => void
  login: (email: string, pass: string) => Promise<boolean>
  logout: () => void
  switchRole: (role: Role) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  isProprietario: boolean
  isSocio: boolean
  isGestor: boolean
  isCapataz: boolean
  isVaqueiro: boolean
  isServente: boolean
  isOperador: boolean
  canManageEquipe: boolean
  canAccessFechamento: boolean
  canAccessFinanceiro: boolean
  defaultPathForRole: string
  isAuthenticated: boolean
  isLoadingAuth: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    // 1. Tentar restaurar da sessão do PocketBase
    const pbAuth = pb.authStore.record
    if (pb.authStore.isValid && pbAuth) {
      const role = (pbAuth.role as Role) || 'gestor'
      return {
        id: pbAuth.id,
        name: pbAuth.name || pbAuth.email || 'Usuário Autenticado',
        email: pbAuth.email || '',
        role,
        avatar: pbAuth.avatar
          ? pb.files.getURL(pbAuth, pbAuth.avatar)
          : `https://img.usecurling.com/ppl/medium?gender=male&seed=${pbAuth.id.slice(-1) || '1'}`,
        preferences: defaultPreferences,
      }
    }

    // 2. Tentar restaurar do localStorage
    const saved = localStorage.getItem('gpi_auth_user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    return fallbackUsers.gestor
  })

  const [isLoadingAuth, setIsLoadingAuth] = useState(false)

  // Sincronizar com localStorage
  useEffect(() => {
    localStorage.setItem('gpi_auth_user', JSON.stringify(currentUser))
  }, [currentUser])

  // Listener para alterações de autenticação no client do PocketBase
  useEffect(() => {
    const unsub = pb.authStore.onChange((token, model) => {
      if (token && model) {
        const role = (model.role as Role) || 'gestor'
        setCurrentUser({
          id: model.id,
          name: model.name || model.email || 'Usuário Autenticado',
          email: model.email || '',
          role,
          avatar: model.avatar
            ? pb.files.getURL(model, model.avatar)
            : `https://img.usecurling.com/ppl/medium?gender=male&seed=${model.id.slice(-1) || '1'}`,
          preferences: defaultPreferences,
        })
      }
    })
    return () => unsub()
  }, [])

  // Login individual no PocketBase
  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
    try {
      setIsLoadingAuth(true)
      const authData = await pb.collection('users').authWithPassword(email.trim(), pass)
      if (authData?.record) {
        const r = authData.record
        const role = (r.role as Role) || 'gestor'
        setCurrentUser({
          id: r.id,
          name: r.name || r.email,
          email: r.email,
          role,
          avatar: r.avatar
            ? pb.files.getURL(r, r.avatar)
            : `https://img.usecurling.com/ppl/medium?gender=male&seed=${r.id.slice(-1) || '1'}`,
          preferences: defaultPreferences,
        })
        return true
      }
      return false
    } catch (err) {
      console.warn('Falha no login PocketBase:', err)
      throw err
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  const logout = useCallback(() => {
    pb.authStore.clear()
    localStorage.removeItem('gpi_auth_user')
    setCurrentUser(fallbackUsers.gestor)
  }, [])

  // Troca rápida de perfil (para desenvolvimento / testes de campo)
  const switchRole = useCallback((role: Role) => {
    const target = fallbackUsers[role] || fallbackUsers.gestor
    setCurrentUser(target)
  }, [])

  const updatePreferences = useCallback((preferences: Partial<UserPreferences>) => {
    setCurrentUser((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...preferences,
      },
    }))
  }, [])

  // Mapeamento e flags dos 6 perfis em ordem hierárquica
  const isProprietario = currentUser.role === 'proprietario' || currentUser.role === 'admin'
  const isSocio = currentUser.role === 'socio'
  const isGestor =
    currentUser.role === 'gestor' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'gerente' ||
    currentUser.role === 'proprietario'
  const isCapataz = currentUser.role === 'capataz'
  const isVaqueiro = currentUser.role === 'vaqueiro' || currentUser.role === 'operador'
  const isServente = currentUser.role === 'servente'
  // isOperador cobre tanto vaqueiro quanto servente (trabalhadores diretos de campo)
  const isOperador = isVaqueiro || isServente

  // Permissões-chave
  const canManageEquipe =
    isProprietario || currentUser.role === 'gestor' || currentUser.role === 'admin'
  const canAccessFechamento =
    isProprietario || isSocio || currentUser.role === 'gestor' || currentUser.role === 'admin'
  const canAccessFinanceiro =
    isProprietario || isSocio || currentUser.role === 'gestor' || currentUser.role === 'admin'

  // Rota padrão ao fazer login:
  // - Vaqueiro e Servente: /campo
  // - Capataz: /minha-equipe (ou visão de equipe)
  // - Gestor, Sócio e Proprietário: / (Dashboard consolidado)
  const defaultPathForRole = useMemo(() => {
    if (isOperador) return '/campo'
    if (isCapataz) return '/minha-equipe'
    return '/'
  }, [isOperador, isCapataz])

  const isAuthenticated = pb.authStore.isValid || Boolean(currentUser.id)

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        setUser: setCurrentUser,
        login,
        logout,
        switchRole,
        updatePreferences,
        isProprietario,
        isSocio,
        isGestor,
        isCapataz,
        isVaqueiro,
        isServente,
        isOperador,
        canManageEquipe,
        canAccessFechamento,
        canAccessFinanceiro,
        defaultPathForRole,
        isAuthenticated,
        isLoadingAuth,
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
