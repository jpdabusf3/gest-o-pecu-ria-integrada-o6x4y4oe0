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
