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

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
