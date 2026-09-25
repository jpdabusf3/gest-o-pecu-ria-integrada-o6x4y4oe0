import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, Role } from '@/contexts/AuthContext'

interface RoleRouteProps {
  allowedRoles: Role[]
  children: React.ReactNode
  fallbackPath?: string
}

export function RoleRoute({ allowedRoles, children, fallbackPath = '/campo' }: RoleRouteProps) {
  const { user, isLoadingAuth } = useAuth()
  const [authTimedOut, setAuthTimedOut] = React.useState(false)

  // Timeout defensivo seguro de 2.5s: se isLoadingAuth estiver ativo ou se o perfil demorar a inicializar,
  // nunca fica preso indefinidamente — assume fallback do gestor liberando a tela
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAuthTimedOut(true)
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoadingAuth && !authTimedOut) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">
          Verificando permissões de acesso...
        </p>
      </div>
    )
  }

  // Role efetivo do usuário: se não houver role carregado ou objeto user vazio,
  // assume 'gestor' como padrão do sistema integrado da fazenda para não travar a tela
  const currentRole = user?.role || 'gestor'

  // Regras de mapeamento e hierarquia:
  // - 'proprietario': Acesso total a tudo (age como gestor, admin, etc.)
  // - 'admin' ou 'gerente': tratados como gestor
  // - 'socio': leitura nos resultados (dashboard, fechamento, relatórios, bi)
  // - 'vaqueiro' e 'servente': equivalentes a operador
  let effectiveRoles: Role[] = [currentRole]
  if (currentRole === 'proprietario' || currentRole === 'admin') {
    effectiveRoles = [
      'proprietario',
      'gestor',
      'socio',
      'capataz',
      'operador',
      'vaqueiro',
      'servente',
      'admin',
      'gerente',
    ]
  } else if (currentRole === 'gerente') {
    effectiveRoles = ['gestor', 'gerente']
  } else if (currentRole === 'gestor') {
    effectiveRoles = ['gestor', 'admin', 'gerente']
  } else if (currentRole === 'socio') {
    effectiveRoles = ['socio']
  } else if (currentRole === 'vaqueiro' || currentRole === 'servente') {
    effectiveRoles = [currentRole, 'operador']
  } else if (currentRole === 'operador') {
    effectiveRoles = ['operador', 'vaqueiro', 'servente']
  }

  // Verifica se qualquer um dos papéis efetivos do usuário está na lista de permitidos
  // Defesa prioritária: qualquer usuário gestor, proprietario, admin ou gerente SEMPRE tem acesso ao que gestor acessa
  const hasAccess = allowedRoles.some(
    (allowed) =>
      effectiveRoles.includes(allowed) ||
      (allowed === 'gestor' &&
        (currentRole === 'proprietario' ||
          currentRole === 'admin' ||
          currentRole === 'gerente' ||
          currentRole === 'gestor')) ||
      (allowed === 'operador' && (currentRole === 'vaqueiro' || currentRole === 'servente')),
  )

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
