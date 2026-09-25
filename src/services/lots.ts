import pb from '@/lib/pocketbase/client'

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
  return pb.collection('lots').update(id, data)
}
