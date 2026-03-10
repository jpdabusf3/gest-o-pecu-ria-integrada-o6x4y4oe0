export interface PastoIntervention {
  id: string
  data: string
  tipo: string
  descricao: string
}

export interface Pasto {
  id: number | string
  nome: string
  sector: string
  area: number
  cultivar: string
  estacao: string
  lotacaoProjetada: number
  lotacaoExecutada: number
  alturaEntradaAlvo: number
  alturaSaidaAlvo: number
  alturaAtual: number
  pesoMedioAtual: number
  pesoMedioHistorico: number
  status: string
  ndvi: number
  score: number
  daysOfRest: number
  optimalRestDuration: number
  recommendedLotSize: number
  interventions: PastoIntervention[]
  ocupanteAtual: string | null
}
