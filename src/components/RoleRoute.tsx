import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, Role } from '@/contexts/AuthContext'

interface RoleRouteProps {
  allowedRoles: Role[]
  children: React.ReactNode
  fallbackPath?: string
}

export function RoleRoute({ allowedRoles, children, fallbackPath = '/campo' }: RoleRouteProps) {
  const { user } = useAuth()

  // Role efetivo do usuário: se não houver role carregado ou objeto user vazio,
  // assume 'gestor' como padrão do sistema integrado da fazenda para não travar a tela
  const currentRole = user?.role || 'gestor'
  const effectiveRole =
    currentRole === 'admin' || currentRole === 'gerente' ? 'gestor' : currentRole

  const hasAccess =
    allowedRoles.includes(currentRole) ||
    (allowedRoles.includes('gestor') && effectiveRole === 'gestor')

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
