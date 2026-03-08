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
    id: 'novilha-sp',
    label: 'Novilha Gorda - SP',
    source: 'Datagro',
    price: 235.0,
    trend: 'up',
    change: '+1.0%',
  },
  {
    id: 'vaca-sp',
    label: 'Vaca Gorda - SP',
    source: 'Datagro',
    price: 220.0,
    trend: 'stable',
    change: '0.0%',
  },
]

export const replacementIndicators: MarketIndicator[] = [
  {
    id: 'rep-boi-magro',
    label: 'Boi Magro (12@)',
    source: 'Datagro',
    price: 3100,
    trend: 'up',
    change: '+2.0%',
  },
  {
    id: 'rep-garrote',
    label: 'Garrote (9,5@)',
    source: 'Datagro',
    price: 2500,
    trend: 'up',
    change: '+1.5%',
  },
  {
    id: 'rep-bezerro',
    label: 'Bezerro (8 a 12m)',
    source: 'Datagro',
    price: 2200,
    trend: 'stable',
    change: '0.0%',
  },
  {
    id: 'rep-novilha',
    label: 'Novilha (13 a 18m)',
    source: 'Datagro',
    price: 2100,
    trend: 'down',
    change: '-1.0%',
  },
  {
    id: 'rep-bezerra',
    label: 'Bezerra (8 a 12m)',
    source: 'Datagro',
    price: 1800,
    trend: 'stable',
    change: '0.0%',
  },
]

export const commodityIndicators: MarketIndicator[] = [
  {
    id: 'milho-mt',
    label: 'Milho - MT (sc 60kg)',
    source: 'Físico',
    price: 45.5,
    trend: 'down',
    change: '-1.2%',
  },
  {
    id: 'milho-b3',
    label: 'Milho - B3 (sc 60kg)',
    source: 'B3',
    price: 58.2,
    trend: 'up',
    change: '+0.8%',
  },
  {
    id: 'soja-mt',
    label: 'Soja - MT (sc 60kg)',
    source: 'Físico',
    price: 115.0,
    trend: 'stable',
    change: '0.0%',
  },
  {
    id: 'soja-b3',
    label: 'Soja - B3 (sc 60kg)',
    source: 'B3',
    price: 130.5,
    trend: 'up',
    change: '+1.5%',
  },
]

export const b3FuturesData: Record<
  string,
  { ticker: string; month: string; price: number; trend: MarketTrend; change: string }[]
> = {
  'boi-gordo': [
    { ticker: 'BGIK26', month: 'Mai/26', price: 245.5, trend: 'up', change: '+0.5%' },
    { ticker: 'BGIV26', month: 'Out/26', price: 255.0, trend: 'up', change: '+1.2%' },
    { ticker: 'BGIZ26', month: 'Dez/26', price: 260.0, trend: 'up', change: '+1.5%' },
  ],
  milho: [
    { ticker: 'CCMK26', month: 'Mai/26', price: 59.5, trend: 'down', change: '-0.2%' },
    { ticker: 'CCMU26', month: 'Set/26', price: 62.0, trend: 'up', change: '+1.0%' },
    { ticker: 'CCMX26', month: 'Nov/26', price: 65.0, trend: 'up', change: '+1.8%' },
  ],
  soja: [
    { ticker: 'SJCJ26', month: 'Abr/26', price: 132.0, trend: 'stable', change: '0.0%' },
    { ticker: 'SJCN26', month: 'Jul/26', price: 135.5, trend: 'up', change: '+0.8%' },
  ],
}

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
