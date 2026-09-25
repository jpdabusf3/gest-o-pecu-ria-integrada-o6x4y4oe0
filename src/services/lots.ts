import pb from '@/lib/pocketbase/client'

export type FaseLote = 'cria' | 'recria' | 'engorda' | 'tip_rip' | 'confinamento'
export type FrenteLote = 'cria' | 'recria' | 'engorda' | 'arrendamento'

export interface LotRecord {
  id: string
  name: string
  sector: 'cria' | 'recria' | 'engorda' | 'venda'
  sex: 'macho' | 'femea'
  category: string
  initial_weight: number
  final_weight: number
  entry_date: string
  exit_date: string
  value_per_animal: number
  status: 'active' | 'sold' | 'abated'
  headcount: number
  data_entrada?: string
  data_saida?: string
  dias_permanencia?: number
  peso_entrada_medio?: number
  peso_saida_medio?: number
  rendimento_carcaca_pct?: number
  peso_medio_atual?: number
  pasto_atual?: string
  // GMD Alvo & Gestão Pecuária Exagro
  gmd_alvo_g_dia?: number
  data_inicio_lote?: string
  fase_atual?: FaseLote
  frente?: FrenteLote
  is_arrendamento?: boolean
  created: string
  updated: string
}

export const getLots = async (filter?: string): Promise<LotRecord[]> => {
  return pb.collection('lots').getFullList({ filter, sort: '-created' })
}

export const getLot = async (id: string): Promise<LotRecord> => {
  return pb.collection('lots').getOne(id)
}

export const updateLot = async (id: string, data: Partial<LotRecord>): Promise<LotRecord> => {
  return await pb.collection('lots').update<LotRecord>(id, data)
}

export const createLot = async (
  data: Omit<LotRecord, 'id' | 'created' | 'updated'>,
): Promise<LotRecord> => {
  return await pb.collection('lots').create<LotRecord>(data)
}
