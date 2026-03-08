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
    id: 'boi-gordo-mt',
    label: 'Boi Gordo - MT (À vista)',
    source: 'Indicador do Boi',
    price: 265.5,
    trend: 'up',
    change: '+1.2%',
  },
  {
    id: 'novilha-mt',
    label: 'Novilha Gorda - MT',
    source: 'Indicador do Boi',
    price: 250.0,
    trend: 'stable',
    change: '0.0%',
  },
  {
    id: 'vaca-mt',
    label: 'Vaca Gorda - MT',
    source: 'Indicador do Boi',
    price: 235.0,
    trend: 'down',
    change: '-0.5%',
  },
]

export const replacementIndicators: MarketIndicator[] = [
  {
    id: 'rep-boi-magro',
    label: 'Boi Magro (12@) - MT',
    source: 'Datagro',
    price: 3450,
    trend: 'up',
    change: '+2.0%',
  },
  {
    id: 'rep-garrote',
    label: 'Garrote (9,5@) - MT',
    source: 'Datagro',
    price: 2850,
    trend: 'up',
    change: '+1.5%',
  },
  {
    id: 'rep-bezerro',
    label: 'Bezerro (8 a 12m) - MT',
    source: 'Datagro',
    price: 2650,
    trend: 'stable',
    change: '0.0%',
  },
  {
    id: 'rep-novilha',
    label: 'Novilha (13 a 18m) - MT',
    source: 'Datagro',
    price: 2450,
    trend: 'down',
    change: '-1.0%',
  },
  {
    id: 'rep-bezerra',
    label: 'Bezerra (8 a 12m) - MT',
    source: 'Datagro',
    price: 2150,
    trend: 'stable',
    change: '0.0%',
  },
]

export const commodityIndicators: MarketIndicator[] = [
  {
    id: 'milho-mt',
    label: 'Milho - MT (sc 60kg)',
    source: 'Físico',
    price: 55.5,
    trend: 'down',
    change: '-1.2%',
  },
  {
    id: 'milho-b3',
    label: 'Milho - B3 (sc 60kg)',
    source: 'B3',
    price: 68.2,
    trend: 'up',
    change: '+0.8%',
  },
  {
    id: 'soja-mt',
    label: 'Soja - MT (sc 60kg)',
    source: 'Físico',
    price: 125.0,
    trend: 'stable',
    change: '0.0%',
  },
  {
    id: 'soja-b3',
    label: 'Soja - B3 (sc 60kg)',
    source: 'B3',
    price: 140.5,
    trend: 'up',
    change: '+1.5%',
  },
]

export const b3FuturesData: Record<
  string,
  { ticker: string; month: string; price: number; trend: MarketTrend; change: string }[]
> = {
  'boi-gordo': [
    { ticker: 'BGIK26', month: 'Mai/26', price: 270.5, trend: 'up', change: '+0.5%' },
    { ticker: 'BGIV26', month: 'Out/26', price: 275.0, trend: 'up', change: '+1.2%' },
    { ticker: 'BGIZ26', month: 'Dez/26', price: 280.0, trend: 'up', change: '+1.5%' },
  ],
  milho: [
    { ticker: 'CCMK26', month: 'Mai/26', price: 69.5, trend: 'down', change: '-0.2%' },
    { ticker: 'CCMU26', month: 'Set/26', price: 72.0, trend: 'up', change: '+1.0%' },
    { ticker: 'CCMX26', month: 'Nov/26', price: 75.0, trend: 'up', change: '+1.8%' },
  ],
  soja: [
    { ticker: 'SJCJ26', month: 'Abr/26', price: 142.0, trend: 'stable', change: '0.0%' },
    { ticker: 'SJCN26', month: 'Jul/26', price: 145.5, trend: 'up', change: '+0.8%' },
  ],
}

export const marketLastUpdate = '07/03/2026 14:30'

export const historicalMarketData = [
  { month: 'Abr/25', sp: 265, mt: 255, b3: 270 },
  { month: 'Mai/25', sp: 268, mt: 258, b3: 272 },
  { month: 'Jun/25', sp: 270, mt: 260, b3: 275 },
  { month: 'Jul/25', sp: 272, mt: 265, b3: 278 },
  { month: 'Ago/25', sp: 275, mt: 268, b3: 280 },
  { month: 'Set/25', sp: 278, mt: 272, b3: 282 },
  { month: 'Out/25', sp: 280, mt: 275, b3: 285 },
  { month: 'Nov/25', sp: 285, mt: 278, b3: 290 },
  { month: 'Dez/25', sp: 288, mt: 280, b3: 292 },
  { month: 'Jan/26', sp: 290, mt: 285, b3: 291 },
  { month: 'Fev/26', sp: 292, mt: 287, b3: 295 },
  { month: 'Mar/26', sp: 295.5, mt: 265.5, b3: 270.5 },
]
