import pb from '@/lib/pocketbase/client'
import { createHistoricoStatus, HistoricoStatusInput } from './historicoStatus'

export type TipoAtividade =
  | 'sanidade'
  | 'reproducao'
  | 'manejo'
  | 'pesagem'
  | 'manutencao'
  | 'comercial'
  | 'nutricao'

export type StatusAtividade =
  | 'agendada'
  | 'em_andamento'
  | 'realizada'
  | 'nao_realizada'
  | 'reagendada'
  | 'planejada' // compatibilidade legada
  | 'concluida' // compatibilidade legada
  | 'cancelada' // compatibilidade legada

export type Recorrencia = 'unica' | 'diaria' | 'semanal' | 'anual'

export type InsumoAtividade = {
  inventoryId: string
  item: string
  quantidade: number
  unidade?: string
  custoUnitario?: number
}

export interface AtividadeRecord {
  id: string
  titulo: string
  tipo: TipoAtividade
  data: string
  data_fim?: string
  frente: 'cria' | 'recria' | 'engorda' | 'confinamento' | 'arrendamento'
  lote_ids: string[]
  setor?: string
  responsavel_id: string
  recorrencia: Recorrencia
  insumos: InsumoAtividade[]
  status: StatusAtividade
  motivo_nao_realizada?: string
  detalhes_motivo?: string
  progresso_observacoes?: string
  iniciado_em?: string
  revisado_gestor?: boolean
  revisado_em?: string
  revisado_por?: string
  descricao?: string
  is_arrendamento: boolean
  custo_previsto?: number
  concluido_em?: string
  concluido_por?: string
  alerta_dias_antes?: number
  parent_event_id?: string
  created_by?: string
  created: string
  updated: string
}

export interface AtividadeInput {
  titulo: string
  tipo: TipoAtividade
  data: string
  data_fim?: string
  frente: AtividadeRecord['frente']
  lote_ids: string[]
  setor?: string
  responsavel_id: string
  recorrencia: Recorrencia
  insumos: InsumoAtividade[]
  status: StatusAtividade
  motivo_nao_realizada?: string
  detalhes_motivo?: string
  progresso_observacoes?: string
  iniciado_em?: string
  revisado_gestor?: boolean
  revisado_em?: string
  revisado_por?: string
  descricao?: string
  is_arrendamento: boolean
  custo_previsto?: number
  concluido_em?: string
  concluido_por?: string
  alerta_dias_antes?: number
  parent_event_id?: string
  created_by?: string
}

const TYPE_LABEL: Record<TipoAtividade, string> = {
  sanidade: 'Sanidade',
  reproducao: 'Reprodução',
  manejo: 'Manejo',
  pesagem: 'Pesagem',
  manutencao: 'Manutenção',
  comercial: 'Comercial',
  nutricao: 'Nutrição',
}

export const tipoLabel = (tipo: TipoAtividade): string => TYPE_LABEL[tipo] || tipo

export const tipoCores: Record<TipoAtividade, string> = {
  sanidade: '#dc2626',
  reproducao: '#db2777',
  manejo: '#2563eb',
  pesagem: '#059669',
  manutencao: '#d97706',
  comercial: '#7c3aed',
  nutricao: '#16a34a',
}

export const getStatusLabel = (status: StatusAtividade): string => {
  const map: Record<string, string> = {
    agendada: 'Agendada',
    em_andamento: 'Em Andamento',
    realizada: 'Realizada',
    nao_realizada: 'Não Realizada',
    reagendada: 'Reagendada',
    planejada: 'Agendada',
    concluida: 'Realizada',
    cancelada: 'Cancelada',
  }
  return map[status] || status
}

export const getFrenteLabel = (frente: AtividadeRecord['frente']): string => {
  const map: Record<AtividadeRecord['frente'], string> = {
    cria: 'Cria',
    recria: 'Recria',
    engorda: 'Engorda',
    confinamento: 'Confinamento',
    arrendamento: 'Arrendamento de Fêmeas',
  }
  return map[frente] || frente
}

// ---------------------------------------------
// Expansão de recorrência (única/diária/semanal/anual)
// ---------------------------------------------

const startOfDay = (d: Date): Date => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const endOfDay = (d: Date): Date => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export interface ExpandedOccurrence {
  record: AtividadeRecord
  occurrenceDate: Date
  virtualId: string
}

export function expandAtividades(
  records: AtividadeRecord[],
  rangeStart: Date,
  rangeEnd: Date,
): ExpandedOccurrence[] {
  const out: ExpandedOccurrence[] = []
  const s = startOfDay(rangeStart)
  const e = endOfDay(rangeEnd)

  for (const rec of records) {
    if (rec.status === 'cancelada') continue
    const base = new Date(rec.data)
    if (isNaN(base.getTime())) continue

    const isFinalizada = rec.status === 'realizada' || rec.status === 'concluida'

    if (rec.recorrencia === 'unica' || isFinalizada) {
      if (base >= s && base <= e) {
        out.push({ record: rec, occurrenceDate: base, virtualId: `${rec.id}#${rec.data}` })
      }
      continue
    }

    // Diária: expande todos os dias no intervalo
    if (rec.recorrencia === 'diaria') {
      const cursor = new Date(base)
      cursor.setHours(0, 0, 0, 0)
      while (cursor <= e) {
        if (cursor >= s) {
          const occ = new Date(cursor)
          occ.setHours(base.getHours(), base.getMinutes())
          const key = occ.toISOString().split('T')[0]
          out.push({ record: rec, occurrenceDate: occ, virtualId: `${rec.id}#${key}` })
        }
        cursor.setDate(cursor.getDate() + 1)
        if (out.length > 800) break
      }
      continue
    }

    // Semanal: expande cada 7 dias
    if (rec.recorrencia === 'semanal') {
      const cursor = new Date(base)
      cursor.setHours(0, 0, 0, 0)
      while (cursor <= e) {
        if (cursor >= s) {
          const occ = new Date(cursor)
          occ.setHours(base.getHours(), base.getMinutes())
          const key = occ.toISOString().split('T')[0]
          out.push({ record: rec, occurrenceDate: occ, virtualId: `${rec.id}#${key}` })
        }
        cursor.setDate(cursor.getDate() + 7)
        if (out.length > 800) break
      }
      continue
    }

    // Anual: expande cada 12 meses
    if (rec.recorrencia === 'anual') {
      const cursor = new Date(base)
      cursor.setHours(0, 0, 0, 0)
      while (cursor <= e) {
        if (cursor >= s) {
          const occ = new Date(cursor)
          occ.setHours(base.getHours(), base.getMinutes())
          const key = occ.toISOString().split('T')[0]
          out.push({ record: rec, occurrenceDate: occ, virtualId: `${rec.id}#${key}` })
        }
        cursor.setFullYear(cursor.getFullYear() + 1)
        if (out.length > 800) break
      }
    }
  }
  return out
}

// ---------------------------------------------
// Utilidades de datas & status
// ---------------------------------------------

export const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export const isAtividadeVencida = (a: AtividadeRecord, now = new Date()): boolean => {
  if (
    a.status === 'realizada' ||
    a.status === 'concluida' ||
    a.status === 'cancelada' ||
    a.status === 'nao_realizada'
  ) {
    return false
  }
  const d = new Date(a.data)
  return d < startOfDay(now)
}

export const isAtividadeHoje = (a: AtividadeRecord, now = new Date()): boolean => {
  return isSameDay(new Date(a.data), now)
}

/**
 * Atividade "em_andamento" há mais de 3 dias gera alerta ao gestor
 */
export const isAlertaEmAndamentoExcessivo = (a: AtividadeRecord, now = new Date()): boolean => {
  if (a.status !== 'em_andamento') return false
  const refDate = a.iniciado_em ? new Date(a.iniciado_em) : new Date(a.updated || a.data)
  const diffDays = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays > 3
}

/**
 * Calcula próximo dia útil (+1 dia útil) a partir de uma data de referência
 */
export const calcularProximoDiaUtil = (fromDate: Date = new Date()): Date => {
  const d = new Date(fromDate)
  d.setDate(d.getDate() + 1)
  // Se for sábado (6), pula para segunda (+2)
  if (d.getDay() === 6) {
    d.setDate(d.getDate() + 2)
  } else if (d.getDay() === 0) {
    // Se for domingo (0), pula para segunda (+1)
    d.setDate(d.getDate() + 1)
  }
  return d
}

/**
 * Verifica se "não realizada" tem impacto em estoque ou sanidade (aparece como pendência do gestor)
 */
export const temImpactoEstoqueOuSanidade = (a: AtividadeRecord): boolean => {
  if (a.tipo === 'sanidade') return true
  if (a.insumos && a.insumos.length > 0) return true
  return false
}

// ---------------------------------------------
// Gatilhos reprodutivos automáticos
// ---------------------------------------------

export function gerarGatilhosIatf(
  base: AtividadeInput,
): { diasDepois: number; titulo: string; tipo: TipoAtividade; descricao: string }[] {
  const labelBase = base.titulo.replace(/\s*\(.*?\)\s*$/, '').trim()
  const gatilhos: { diasDepois: number; titulo: string; tipo: TipoAtividade; descricao: string }[] =
    []

  gatilhos.push({
    diasDepois: 35,
    titulo: `DG - Diagnóstico de Gestação pós-${labelBase}`,
    tipo: 'reproducao',
    descricao: `Diagnóstico de gestação gerado automaticamente (35 dias após ${base.data.split('T')[0]}) para o evento "${base.titulo}".`,
  })
  gatilhos.push({
    diasDepois: 270,
    titulo: `Previsão de Parto pós-${labelBase}`,
    tipo: 'reproducao',
    descricao: `Previsão de parto (270 dias ≈ 9 meses após ${base.data.split('T')[0]}) gerada automaticamente.`,
  })
  gatilhos.push({
    diasDepois: 540,
    titulo: `Desmama - Filhotes pós-${labelBase}`,
    tipo: 'manejo',
    descricao: `Desmama (previsão de parto + 8 meses) gerada automaticamente a partir de ${base.data.split('T')[0]}.`,
  })
  return gatilhos
}

export const DIAS_IATF = [30, 35, 40, 45, 50, 55, 60]

// ---------------------------------------------
// CRUD PocketBase com Auditoria e Regras de Transição
// ---------------------------------------------

export const getAtividades = async (filter?: string): Promise<AtividadeRecord[]> => {
  const res = await pb.collection('atividades').getFullList({
    filter,
    sort: 'data',
  })
  const normalized: AtividadeRecord[] = res.map((r: any) => ({
    ...r,
    lote_ids: Array.isArray(r.lote_ids) ? r.lote_ids : [],
    insumos: Array.isArray(r.insumos) ? r.insumos : [],
    is_arrendamento: !!r.is_arrendamento,
  }))
  return normalized
}

export const getAtividade = async (id: string): Promise<AtividadeRecord> => {
  const r: any = await pb.collection('atividades').getOne(id)
  return {
    ...r,
    lote_ids: Array.isArray(r.lote_ids) ? r.lote_ids : [],
    insumos: Array.isArray(r.insumos) ? r.insumos : [],
    is_arrendamento: !!r.is_arrendamento,
  }
}

export const createAtividade = async (data: AtividadeInput): Promise<AtividadeRecord> => {
  const payload = {
    ...data,
    lote_ids: data.lote_ids.filter(Boolean),
  }
  const r: any = await pb.collection('atividades').create(payload)
  return {
    ...r,
    lote_ids: Array.isArray(r.lote_ids) ? r.lote_ids : [],
    insumos: Array.isArray(r.insumos) ? r.insumos : [],
    is_arrendamento: !!r.is_arrendamento,
  }
}

export const updateAtividade = async (
  id: string,
  data: Partial<AtividadeInput>,
): Promise<AtividadeRecord> => {
  const r: any = await pb.collection('atividades').update(id, data)
  return {
    ...r,
    lote_ids: Array.isArray(r.lote_ids) ? r.lote_ids : [],
    insumos: Array.isArray(r.insumos) ? r.insumos : [],
    is_arrendamento: !!r.is_arrendamento,
  }
}

/**
 * Transição de status estruturada com gravação automática de auditoria na coleção `historico_status`
 */
export interface TransicaoStatusParams {
  atividadeId: string
  statusNovo: StatusAtividade
  statusAnterior?: string
  usuarioNome: string
  motivo?: string
  detalhes?: string
  progresso?: string
  offline?: boolean
  timestamp?: string
}

export const transicionarStatusAtividade = async (
  params: TransicaoStatusParams,
): Promise<AtividadeRecord> => {
  const {
    atividadeId,
    statusNovo,
    statusAnterior,
    usuarioNome,
    motivo,
    detalhes,
    progresso,
    offline,
    timestamp = new Date().toISOString(),
  } = params

  const updatePayload: Partial<AtividadeInput> = {
    status: statusNovo,
  }

  if (statusNovo === 'realizada') {
    updatePayload.concluido_em = timestamp
    updatePayload.concluido_por = usuarioNome
  } else if (statusNovo === 'em_andamento') {
    updatePayload.iniciado_em = timestamp
    if (progresso !== undefined) {
      updatePayload.progresso_observacoes = progresso
    }
  } else if (statusNovo === 'nao_realizada') {
    updatePayload.motivo_nao_realizada = motivo
    updatePayload.detalhes_motivo = detalhes
    updatePayload.revisado_gestor = false
  } else if (statusNovo === 'reagendada') {
    updatePayload.revisado_gestor = true
  }

  // 1. Atualiza registro na tabela de atividades
  const updated = await updateAtividade(atividadeId, updatePayload)

  // 2. Grava registro na tabela historico_status
  try {
    const auditInput: HistoricoStatusInput = {
      atividade_id: atividadeId,
      status_anterior: statusAnterior,
      status_novo: statusNovo,
      usuario_id: usuarioNome,
      motivo: motivo,
      detalhes: detalhes || progresso,
      offline: !!offline,
      timestamp,
    }
    await createHistoricoStatus(auditInput)
  } catch (auditErr) {
    console.warn('Erro ao salvar auditoria de historico_status:', auditErr)
  }

  return updated
}

export const deleteAtividade = async (id: string): Promise<void> => {
  await pb.collection('atividades').delete(id)
}
