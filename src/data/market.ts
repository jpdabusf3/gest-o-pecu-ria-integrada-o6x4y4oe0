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

export const historicalMarketData = [
  { month: 'Abr/25', sp: 215, mt: 205, b3: 220 },
  { month: 'Mai/25', sp: 218, mt: 208, b3: 222 },
  { month: 'Jun/25', sp: 220, mt: 210, b3: 225 },
  { month: 'Jul/25', sp: 222, mt: 215, b3: 228 },
  { month: 'Ago/25', sp: 225, mt: 218, b3: 230 },
  { month: 'Set/25', sp: 228, mt: 222, b3: 232 },
  { month: 'Out/25', sp: 230, mt: 225, b3: 235 },
  { month: 'Nov/25', sp: 235, mt: 228, b3: 240 },
  { month: 'Dez/25', sp: 238, mt: 230, b3: 242 },
  { month: 'Jan/26', sp: 240, mt: 235, b3: 241 },
  { month: 'Fev/26', sp: 242, mt: 237, b3: 245 },
  { month: 'Mar/26', sp: 245.5, mt: 238, b3: 242 },
]
