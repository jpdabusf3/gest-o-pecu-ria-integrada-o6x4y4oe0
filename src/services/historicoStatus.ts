import pb from '@/lib/pocketbase/client'

export type MotivoNaoRealizada =
  | 'falta_insumo'
  | 'animal_nao_localizado'
  | 'clima'
  | 'falta_mao_obra'
  | 'outro'

export interface HistoricoStatusRecord {
  id: string
  atividade_id: string
  status_anterior?: string
  status_novo: string
  usuario_id: string
  motivo?: MotivoNaoRealizada | string
  detalhes?: string
  offline: boolean
  timestamp: string
  created: string
  updated: string
}

export interface HistoricoStatusInput {
  atividade_id: string
  status_anterior?: string
  status_novo: string
  usuario_id: string
  motivo?: string
  detalhes?: string
  offline?: boolean
  timestamp?: string
}

export const MOTIVOS_NAO_REALIZADA_OPTIONS: { id: MotivoNaoRealizada; label: string }[] = [
  { id: 'falta_insumo', label: 'Falta de insumo' },
  { id: 'animal_nao_localizado', label: 'Animal não localizado' },
  { id: 'clima', label: 'Clima desfavorável (chuva/calor extremo)' },
  { id: 'falta_mao_obra', label: 'Falta de mão de obra / equipe' },
  { id: 'outro', label: 'Outro (texto livre)' },
]

export const getMotivoLabel = (motivo?: string): string => {
  if (!motivo) return '-'
  const found = MOTIVOS_NAO_REALIZADA_OPTIONS.find((m) => m.id === motivo)
  return found ? found.label : motivo
}

export const getHistoricoPorAtividade = async (
  atividadeId: string,
): Promise<HistoricoStatusRecord[]> => {
  try {
    const records = await pb.collection('historico_status').getFullList({
      filter: `atividade_id = "${atividadeId}"`,
      sort: '-timestamp',
    })
    return records as unknown as HistoricoStatusRecord[]
  } catch (err) {
    console.warn('Erro ao carregar histórico de status:', err)
    return []
  }
}

export const getAllHistoricoStatus = async (filter?: string): Promise<HistoricoStatusRecord[]> => {
  try {
    const records = await pb.collection('historico_status').getFullList({
      filter,
      sort: '-timestamp',
    })
    return records as unknown as HistoricoStatusRecord[]
  } catch (err) {
    console.warn('Erro ao carregar todos os históricos de status:', err)
    return []
  }
}

export const createHistoricoStatus = async (
  input: HistoricoStatusInput,
): Promise<HistoricoStatusRecord> => {
  const payload = {
    ...input,
    timestamp: input.timestamp || new Date().toISOString(),
    offline: !!input.offline,
  }
  const rec = await pb.collection('historico_status').create(payload)
  return rec as unknown as HistoricoStatusRecord
}
