import pb from '@/lib/pocketbase/client'
import { FrenteFechamento } from './fechamento'

export interface FechamentoArquivadoRecord {
  id?: string
  ano_safra: string // ex: "2023/2024", "2024/2025"
  periodo_rotulo: string
  frente: FrenteFechamento
  arrobas_ha_ano: number
  arrobas_cab_ano: number
  custo_arroba_produzida: number
  cotacao_arroba_media?: number
  margem_ebitda_pct?: number
  ebitda_total?: number
  lucro_liquido?: number
  receita_total?: number
  custeio_cab_ano?: number
  taxa_lotacao_ua_ha?: number
  mortalidade_pct?: number
  taxa_desmame_pct?: number
  gmd_medio_kg_dia?: number
  rebanho_medio_cab?: number
  arrobas_totais_produzidas?: number
  snapshot_dados?: any
  arquivado_por?: string
  arquivado_em?: string
  created?: string
}

export async function getFechamentosArquivados(
  frente: FrenteFechamento = 'todas',
): Promise<FechamentoArquivadoRecord[]> {
  try {
    const filter = frente === 'todas' ? '' : `frente = '${frente}'`
    const records = await pb
      .collection('fechamentos_arquivados')
      .getFullList<FechamentoArquivadoRecord>({
        filter,
        sort: 'ano_safra',
      })
    return records
  } catch (err) {
    console.warn('Erro ao buscar fechamentos arquivados:', err)
    return []
  }
}

export async function arquivarFechamentoSafra(
  dados: Omit<FechamentoArquivadoRecord, 'id' | 'created'>,
): Promise<FechamentoArquivadoRecord> {
  const created = await pb.collection('fechamentos_arquivados').create(dados)
  return created as unknown as FechamentoArquivadoRecord
}
