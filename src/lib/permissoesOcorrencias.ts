import { PerfilEquipe } from '@/services/equipe'

export interface PermissoesOcorrencias {
  pode_registrar: boolean
  pode_resolver: boolean
  pode_aprovar: boolean
  pode_corrigir: boolean
  pode_configurar: boolean
  pode_visualizar_auditoria: boolean
  pode_cancelar: boolean
}

/**
 * Matriz de Permissões com padrão restritivo (libera só o essencial):
 * - pode_registrar = TRUE para todos os perfis (proprietario, socio, gestor, capataz, vaqueiro, servente, etc.)
 * - pode_resolver (marcar ocorrência como resolvida) = capataz e gestor apenas.
 * - pode_aprovar (validar lançamentos sensíveis: morte, venda, correção) = gestor e proprietário.
 * - pode_corrigir (registrar evento de correção encadeado) = capataz e gestor.
 * - pode_configurar (criar tipos de ocorrência, editar configurações) = gestor e proprietário.
 * - Sócio comum: leitura; "sócio administrador" herda permissões de gestor.
 */
export function getPermissoesOcorrencias(
  perfil?: string | PerfilEquipe,
  socioAdministrador?: boolean,
): PermissoesOcorrencias {
  const p = (perfil || '').toLowerCase()

  // Se for socio_administrador, herda permissões do gestor
  const ehSocioAdm = p === 'socio' && Boolean(socioAdministrador)

  // Proprietário e Admin
  if (p === 'proprietario' || p === 'admin') {
    return {
      pode_registrar: true,
      pode_resolver: true,
      pode_aprovar: true,
      pode_corrigir: true,
      pode_configurar: true,
      pode_visualizar_auditoria: true,
      pode_cancelar: true,
    }
  }

  // Gestor, Gerente ou Sócio Administrador
  if (p === 'gestor' || p === 'gerente' || ehSocioAdm) {
    return {
      pode_registrar: true,
      pode_resolver: true,
      pode_aprovar: true,
      pode_corrigir: true,
      pode_configurar: true,
      pode_visualizar_auditoria: true,
      pode_cancelar: true,
    }
  }

  // Capataz
  if (p === 'capataz') {
    return {
      pode_registrar: true,
      pode_resolver: true,
      pode_aprovar: false,
      pode_corrigir: true,
      pode_configurar: false,
      pode_visualizar_auditoria: true,
      pode_cancelar: false,
    }
  }

  // Sócio comum: leitura de auditoria e pode registrar ocorrências
  if (p === 'socio') {
    return {
      pode_registrar: true,
      pode_resolver: false,
      pode_aprovar: false,
      pode_corrigir: false,
      pode_configurar: false,
      pode_visualizar_auditoria: true,
      pode_cancelar: false,
    }
  }

  // Vaqueiro, Servente, Operador e qualquer outro perfil de campo:
  // pode_registrar = TRUE para todos os perfis — ninguém fica impedido de registrar.
  return {
    pode_registrar: true,
    pode_resolver: false,
    pode_aprovar: false,
    pode_corrigir: false,
    pode_configurar: false,
    pode_visualizar_auditoria: false,
    pode_cancelar: false,
  }
}
