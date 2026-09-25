import pb from '@/lib/pocketbase/client'

export type TipoEventoAudit =
  | 'criacao'
  | 'correcao'
  | 'cancelamento'
  | 'mudanca_status'
  | 'redefinicao_senha'

export interface AuditLogRecord {
  id: string
  evento_id: string
  tipo_evento: TipoEventoAudit
  usuario_id: string
  usuario_nome?: string
  perfil: string
  payload_antes?: any
  payload_depois?: any
  timestamp_dispositivo: string
  timestamp_servidor: string
  origem: 'online' | 'offline'
  dispositivo_id?: string
  geolocalizacao?: {
    latitude?: number
    longitude?: number
    precisao?: number
  }
  referencia_tipo?: string // 'ocorrencia' | 'equipe' | 'lote'
  referencia_id?: string
  lote_id?: string
  pasto_id?: string
  motivo?: string
  created: string
  updated: string
}

export interface RegistrarAuditInput {
  evento_id?: string
  tipo_evento: TipoEventoAudit
  usuario_id: string
  usuario_nome?: string
  perfil: string
  payload_antes?: any
  payload_depois?: any
  timestamp_dispositivo?: string
  origem?: 'online' | 'offline'
  dispositivo_id?: string
  geolocalizacao?: {
    latitude?: number
    longitude?: number
    precisao?: number
  }
  referencia_tipo?: string
  referencia_id?: string
  lote_id?: string
  pasto_id?: string
  motivo?: string
}

/**
 * Obter identificador persistente do dispositivo (UUID guardado no localStorage)
 */
export function getDispositivoId(): string {
  try {
    const key = 'gpi_dispositivo_id'
    let id = localStorage.getItem(key)
    if (!id) {
      id = `dev_${crypto.randomUUID()}`
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return 'dev_unknown'
  }
}

/**
 * Registra evento no audit_log (APPEND-ONLY).
 * Grava QUEM, QUANDO (duplo timestamp: celular + servidor), ONDE, O QUÊ e ORIGEM.
 */
export async function registrarAuditLog(
  input: RegistrarAuditInput,
): Promise<AuditLogRecord | null> {
  const eventoId = input.evento_id || crypto.randomUUID()
  const dispositivoTimestamp = input.timestamp_dispositivo || new Date().toISOString()
  const servidorTimestamp = new Date().toISOString()
  const dispositivoId = input.dispositivo_id || getDispositivoId()

  const payload: any = {
    evento_id: eventoId,
    tipo_evento: input.tipo_evento,
    usuario_id: input.usuario_id || 'anonimo',
    usuario_nome: input.usuario_nome || '',
    perfil: input.perfil || 'vaqueiro',
    payload_antes: input.payload_antes || null,
    payload_depois: input.payload_depois || null,
    timestamp_dispositivo: dispositivoTimestamp,
    timestamp_servidor: servidorTimestamp,
    origem: input.origem || 'online',
    dispositivo_id: dispositivoId,
    geolocalizacao: input.geolocalizacao || null,
    referencia_tipo: input.referencia_tipo || 'ocorrencia',
    referencia_id: input.referencia_id || '',
    lote_id: input.lote_id || '',
    pasto_id: input.pasto_id || '',
    motivo: input.motivo || '',
  }

  try {
    const record = await pb.collection('audit_log').create<AuditLogRecord>(payload)
    return record
  } catch (err) {
    console.warn('Erro ao salvar audit_log no PocketBase:', err)
    return null
  }
}

/**
 * Consulta a trilha de auditoria com filtros flexíveis (ordenação sempre pelo servidor)
 */
export async function getAuditLogs(filtros?: {
  tipo_evento?: string
  usuario_id?: string
  referencia_id?: string
  lote_id?: string
  limite?: number
}): Promise<AuditLogRecord[]> {
  try {
    const parts: string[] = []
    if (filtros?.tipo_evento && filtros.tipo_evento !== 'todos') {
      parts.push(`tipo_evento = '${filtros.tipo_evento}'`)
    }
    if (filtros?.usuario_id) {
      parts.push(`usuario_id = '${filtros.usuario_id}'`)
    }
    if (filtros?.referencia_id) {
      parts.push(`referencia_id = '${filtros.referencia_id}'`)
    }
    if (filtros?.lote_id) {
      parts.push(`lote_id = '${filtros.lote_id}'`)
    }

    const filter = parts.join(' && ')
    const records = await pb.collection('audit_log').getFullList<AuditLogRecord>({
      filter,
      sort: '-timestamp_servidor',
    })
    return records
  } catch (err) {
    console.warn('Erro ao consultar audit_log:', err)
    return []
  }
}
