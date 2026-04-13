import pb from '@/lib/pocketbase/client'

export interface MarketPrice {
  id: string
  indicator: string
  region: string
  price: number
  reference_date: string
  created: string
  updated: string
}

export const getMarketPrices = () =>
  pb.collection('market_prices').getFullList<MarketPrice>({
    sort: '-reference_date',
  })
