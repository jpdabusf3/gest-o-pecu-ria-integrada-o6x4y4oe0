export interface AnimalRegistro {
  id: string
  tipoRegistro: 'individual' | 'lote'
  quantidade: number
  pesoMedio: number
  sexo: 'Macho' | 'Fêmea'
  raca: string
  categoria: 'Corte' | 'Reprodução'
  faixaEtaria: string
  idadeMeses?: number
  origem: 'Compra' | 'Nativo'
  precoCompraPorCabeca?: number
  fazendaOrigem?: string
  nomeVendedor?: string
  leiloeiro?: string
  custoFrete?: number
  comissao?: number
  impostos?: number
  fazendaDestinoId: string
  custoTotalPorCabeca: number
  custoTotalLote: number
  dataRegistro: string
}
