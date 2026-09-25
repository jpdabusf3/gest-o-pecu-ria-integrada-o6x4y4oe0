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

export const getMarketPrices = async () => {
  try {
    return await pb.collection('market_prices').getFullList<MarketPrice>({
      sort: '-reference_date',
    })
  } catch (e) {
    console.warn('Erro ao carregar market_prices:', e)
    return []
  }
}

export const getLatestMarketPrices = async (): Promise<MarketPrice[]> => {
  try {
    const all = await pb.collection('market_prices').getFullList<MarketPrice>({
      sort: '-reference_date',
    })
    const latest = new Map<string, MarketPrice>()
    all.forEach((p) => {
      const key = `${p.indicator}|${p.region}`
      if (!latest.has(key)) latest.set(key, p)
    })
    return Array.from(latest.values())
  } catch (e) {
    console.warn('Erro ao carregar latest market_prices:', e)
    return []
  }
}

export const getMarketPricesByIndicator = async (indicator: string) => {
  try {
    return await pb.collection('market_prices').getFullList<MarketPrice>({
      filter: `indicator = "${indicator}"`,
      sort: 'reference_date',
    })
  } catch (e) {
    console.warn('Erro ao carregar market_prices por indicador:', e)
    return []
  }
}

export interface CotacaoB3BoiGordoVigente {
  preco: number
  dataReferencia: string
  origem: 'b3_real' | 'b3_futures' | 'fallback'
  regiao: string
  desatualizada: boolean
  diasAtraso: number
}

/**
 * Obtém a cotação B3 vigente do Boi Gordo.
 * Prioriza:
 * 1) Último registro da coleção `market_prices` onde region = 'B3' e indicator ~ 'Boi'
 * 2) Se não encontrar, tenta qualquer registro de boi gordo mais recente
 * 3) Fallback para cotação balizadora oficial (ex: 274.50 ou 270.50 da B3)
 * Sinaliza se a cotação está com mais de 7 dias ou indisponível.
 */
export const getCotacaoB3BoiGordoVigente = async (): Promise<CotacaoB3BoiGordoVigente> => {
  try {
    const list = await pb.collection('market_prices').getFullList<MarketPrice>({
      filter: "(indicator ~ 'Boi' || indicator ~ 'boi') && region = 'B3'",
      sort: '-reference_date',
      requestKey: null,
    })

    if (list && list.length > 0) {
      const maisRecente = list[0]
      const refDate = new Date(maisRecente.reference_date)
      const diffDias = Math.floor((Date.now() - refDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        preco: Number(maisRecente.price.toFixed(2)),
        dataReferencia: maisRecente.reference_date,
        origem: 'b3_real',
        regiao: maisRecente.region,
        desatualizada: diffDias > 7,
        diasAtraso: Math.max(0, diffDias),
      }
    }

    // Tentativa secundária: qualquer Boi Gordo da coleção market_prices
    const listGeral = await pb.collection('market_prices').getFullList<MarketPrice>({
      filter: "indicator ~ 'Boi' || indicator ~ 'boi'",
      sort: '-reference_date',
      requestKey: null,
    })

    if (listGeral && listGeral.length > 0) {
      const maisRecente = listGeral[0]
      const refDate = new Date(maisRecente.reference_date)
      const diffDias = Math.floor((Date.now() - refDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        preco: Number(maisRecente.price.toFixed(2)),
        dataReferencia: maisRecente.reference_date,
        origem: 'b3_real',
        regiao: maisRecente.region,
        desatualizada: diffDias > 7,
        diasAtraso: Math.max(0, diffDias),
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar cotação B3 vigente do Boi Gordo:', err)
  }

  // Fallback padrão seguro ancorado na cotação balizadora B3
  return {
    preco: 274.5,
    dataReferencia: new Date().toISOString(),
    origem: 'fallback',
    regiao: 'B3',
    desatualizada: false,
    diasAtraso: 0,
  }
}
