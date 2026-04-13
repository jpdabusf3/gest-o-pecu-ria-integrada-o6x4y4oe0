import pb from '@/lib/pocketbase/client'

export interface HedgeOperation {
  id: string
  lot_id: string
  contract_code: string
  type: 'put' | 'call' | 'future' | 'collar'
  status: 'open' | 'closed' | 'simulated'
  strike_price?: number
  premium_paid?: number
  premium_received?: number
  quantity_arrobas: number
  entry_date: string
  expiry_date: string
  closing_price?: number
  closing_date?: string
  basis_at_entry?: number
  created: string
  updated: string
  expand?: {
    lot_id?: { name: string }
  }
}

export const getHedgeOperations = () =>
  pb.collection('hedge_operations').getFullList<HedgeOperation>({
    expand: 'lot_id',
    sort: '-created',
  })
