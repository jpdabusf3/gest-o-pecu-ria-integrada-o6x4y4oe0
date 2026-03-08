export type MarketTrend = 'up' | 'down' | 'stable'

export interface MarketIndicator {
  id: string
  label: string
  source: string
  price: number
  trend: MarketTrend
  change: string
}

export const marketIndicators: MarketIndicator[] = [
  {
    id: 'sp',
    label: 'Boi Gordo - SP (À vista)',
    source: 'Datagro',
    price: 245.5,
    trend: 'up',
    change: '+1.2%',
  },
  {
    id: 'mt',
    label: 'Boi Gordo - MT (À vista)',
    source: 'Datagro',
    price: 238.0,
    trend: 'down',
    change: '-0.5%',
  },
  {
    id: 'b3-mar',
    label: 'B3 - Contrato Mar/26',
    source: 'B3',
    price: 242.0,
    trend: 'stable',
    change: '0.0%',
  },
  {
    id: 'b3-abr',
    label: 'B3 - Contrato Abr/26',
    source: 'B3',
    price: 248.5,
    trend: 'up',
    change: '+2.1%',
  },
]

export const marketLastUpdate = '07/03/2026 14:30'
