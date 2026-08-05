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

export const getLatestMarketPrices = async (): Promise<MarketPrice[]> => {
  const all = await pb.collection('market_prices').getFullList<MarketPrice>({
    sort: '-reference_date',
  })
  const latest = new Map<string, MarketPrice>()
  all.forEach((p) => {
    const key = `${p.indicator}|${p.region}`
    if (!latest.has(key)) latest.set(key, p)
  })
  return Array.from(latest.values())
}

export const getMarketPricesByIndicator = (indicator: string) =>
  pb.collection('market_prices').getFullList<MarketPrice>({
    filter: `indicator = "${indicator}"`,
    sort: 'reference_date',
  })
