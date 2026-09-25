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

  // 'admin' e 'gerente' possuem prerrogativas equivalentes a 'gestor'
  const effectiveRole = user.role === 'admin' || user.role === 'gerente' ? 'gestor' : user.role
  const hasAccess =
    allowedRoles.includes(user.role) ||
    (allowedRoles.includes('gestor') && effectiveRole === 'gestor')

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
