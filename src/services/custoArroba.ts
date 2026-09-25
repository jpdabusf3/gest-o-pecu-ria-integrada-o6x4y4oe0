import { useMemo } from 'react'
import { LotRecord } from '@/services/lots'
import { PesagemRecord } from '@/services/pesagens'
import useFinanceStore, { LedgerEntry } from '@/stores/useFinanceStore'

export interface CustoArrobaPorLote {
  loteId: string
  loteNome: string
  setor: string
  fase: string
  frente: string
  isArrendamento: boolean
  sexo: string
  headcount: number
  // Pesos
  pesoEntradaKg: number
  pesoSaidaKg: number
  pesoEntradaTotalKg: number
  pesoSaidaTotalKg: number
  temFechamentoValido: boolean // True se tem pesagem de entrada e saída
  // Arrobas produzidas
  arrobasProduzidasTotal: number
  arrobasProduzidasPorCabeca: number
  // Custos do período do lote
  custoNutricao: number
  custoSanidade: number
  custoManejoOperacional: number
  custoOutros: number
  custoTotal: number
  // Indicadores
  custoPorArroba: number | null // custoTotal / arrobasProduzidasTotal
  custoPorCabeca: number
  custoNutricaoPorArroba: number | null
  custoSanidadePorArroba: number | null
}

export interface CustoArrobaConsolidado {
  totalLotesValidos: number
  totalLotesMonitorados: number
  totalCabecas: number
  totalArrobasProduzidas: number
  custoTotalConsolidado: number
  custoNutricaoConsolidado: number
  custoSanidadeConsolidado: number
  custoOperacionalConsolidado: number
  custoMedioPorArroba: number | null
  custoMedioPorCabeca: number
  loteMaisEficiente: CustoArrobaPorLote | null
  loteMaiorCusto: CustoArrobaPorLote | null
}

/**
 * Função utilitária para calcular o Custo por Arroba Produzida para um lote e suas pesagens reais + despesas reais.
 * Conforme diretriz Exagro:
 * 1. O lote precisa ter pesagem de entrada e saída (ou pesagem inicial e atual/saída com ganho real) para ter @ produzidas.
 * 2. Arroba (@) = 15 kg.
 * 3. @ produzidas = (peso total saída - peso total entrada) / 15
 * 4. Custo / @ produzida = Custos do período / @ produzidas
 */
export function calcularCustoArrobaLote(
  lot: LotRecord,
  pesagensDoLote: PesagemRecord[],
  ledgerEntries: LedgerEntry[],
): CustoArrobaPorLote {
  const headcount = lot.headcount || 1

  // 1. Determinar peso de entrada e saída a partir das pesagens reais
  const pesagensOrdenadas = [...pesagensDoLote].sort(
    (a, b) => new Date(a.data_pesagem).getTime() - new Date(b.data_pesagem).getTime(),
  )

  let pesoEntradaKg = lot.peso_entrada_medio || lot.initial_weight || 0
  let pesoSaidaKg = lot.peso_saida_medio || lot.final_weight || lot.peso_medio_atual || 0

  if (pesagensOrdenadas.length >= 2) {
    pesoEntradaKg = pesagensOrdenadas[0].peso_medio_kg || pesoEntradaKg
    pesoSaidaKg = pesagensOrdenadas[pesagensOrdenadas.length - 1].peso_medio_kg || pesoSaidaKg
  } else if (pesagensOrdenadas.length === 1) {
    if (pesoEntradaKg > 0 && pesagensOrdenadas[0].peso_medio_kg > pesoEntradaKg) {
      pesoSaidaKg = pesagensOrdenadas[0].peso_medio_kg
    } else {
      pesoEntradaKg = pesagensOrdenadas[0].peso_medio_kg
    }
  }

  // Verificar se o lote tem pesagem de entrada e saída com ganho positivo
  const temFechamentoValido = pesoEntradaKg > 0 && pesoSaidaKg > pesoEntradaKg

  const pesoEntradaTotalKg = pesoEntradaKg * headcount
  const pesoSaidaTotalKg = pesoSaidaKg * headcount

  // Regra técnica:
  // Peso em @ de carcaça = (peso vivo * % rendimento de carcaça) / 15
  // Arrobas (@) de carcaça produzidas = ((peso vivo saída * rendimento) - (peso vivo entrada * 50%)) / 15
  const rendimentoSaidaPct = lot.rendimento_carcaca_pct || 53.5
  const rendimentoEntradaPct = 50.0 // Padrão bezerro/garrote de entrada
  const carcacaSaidaTotalKg = pesoSaidaTotalKg * (rendimentoSaidaPct / 100)
  const carcacaEntradaTotalKg = pesoEntradaTotalKg * (rendimentoEntradaPct / 100)

  const arrobasProduzidasTotal = temFechamentoValido
    ? Number(((carcacaSaidaTotalKg - carcacaEntradaTotalKg) / 15).toFixed(2))
    : 0

  const arrobasProduzidasPorCabeca =
    headcount > 0 ? Number((arrobasProduzidasTotal / headcount).toFixed(2)) : 0

  // 2. Custos do período do lote a partir do ledger financeiro
  // Relaciona despesas pelo ID do lote ou pelo nome do lote (ex: LEN-01, Lote EN-01, y2tb4dew3rtov5d)
  const despesasLote = ledgerEntries.filter((e) => {
    if (e.type !== 'expense') return false
    if (!e.loteId) return false
    return (
      e.loteId === lot.id ||
      e.loteId === lot.name ||
      lot.name.toLowerCase().includes(e.loteId.toLowerCase()) ||
      e.loteId.toLowerCase().includes(lot.name.toLowerCase())
    )
  })

  let custoNutricao = 0
  let custoSanidade = 0
  let custoManejoOperacional = 0
  let custoOutros = 0

  despesasLote.forEach((entry) => {
    const cat = entry.category?.toLowerCase() || ''
    const desc = entry.description?.toLowerCase() || ''

    if (
      cat.includes('nutri') ||
      cat.includes('ração') ||
      desc.includes('ração') ||
      desc.includes('suplemento')
    ) {
      custoNutricao += entry.amount
    } else if (
      cat.includes('sani') ||
      cat.includes('vacina') ||
      desc.includes('vacina') ||
      desc.includes('remédio')
    ) {
      custoSanidade += entry.amount
    } else if (
      cat.includes('mão') ||
      cat.includes('manejo') ||
      cat.includes('operacion') ||
      desc.includes('manejo')
    ) {
      custoManejoOperacional += entry.amount
    } else {
      custoOutros += entry.amount
    }
  })

  // Se não houver despesa vinculada no ledger local para este lote específico mas o lote estiver ativo/abated,
  // calcular estimativa proporcional baseada no período de permanência e na fase zootécnica para compor a análise
  const custoTotal = custoNutricao + custoSanidade + custoManejoOperacional + custoOutros

  const custoPorArroba =
    arrobasProduzidasTotal > 0 && custoTotal > 0
      ? Number((custoTotal / arrobasProduzidasTotal).toFixed(2))
      : null

  const custoPorCabeca = headcount > 0 ? Number((custoTotal / headcount).toFixed(2)) : 0

  const custoNutricaoPorArroba =
    arrobasProduzidasTotal > 0 && custoNutricao > 0
      ? Number((custoNutricao / arrobasProduzidasTotal).toFixed(2))
      : null

  const custoSanidadePorArroba =
    arrobasProduzidasTotal > 0 && custoSanidade > 0
      ? Number((custoSanidade / arrobasProduzidasTotal).toFixed(2))
      : null

  return {
    loteId: lot.id,
    loteNome: lot.name,
    setor: lot.sector || 'geral',
    fase: lot.fase_atual || lot.sector || 'recria',
    frente: lot.frente || (lot.is_arrendamento ? 'arrendamento' : 'recria'),
    isArrendamento: Boolean(lot.is_arrendamento),
    sexo: lot.sex || 'outro',
    headcount,
    pesoEntradaKg,
    pesoSaidaKg,
    pesoEntradaTotalKg,
    pesoSaidaTotalKg,
    temFechamentoValido,
    arrobasProduzidasTotal,
    arrobasProduzidasPorCabeca,
    custoNutricao,
    custoSanidade,
    custoManejoOperacional,
    custoOutros,
    custoTotal,
    custoPorArroba,
    custoPorCabeca,
    custoNutricaoPorArroba,
    custoSanidadePorArroba,
  }
}

/**
 * Consolida custos e arrobas de uma lista de lotes
 */
export function consolidarCustosArroba(analises: CustoArrobaPorLote[]): CustoArrobaConsolidado {
  const lotesValidos = analises.filter((a) => a.temFechamentoValido && a.arrobasProduzidasTotal > 0)
  const totalLotesValidos = lotesValidos.length
  const totalLotesMonitorados = analises.length

  const totalCabecas = lotesValidos.reduce((acc, curr) => acc + curr.headcount, 0)
  const totalArrobasProduzidas = lotesValidos.reduce(
    (acc, curr) => acc + curr.arrobasProduzidasTotal,
    0,
  )
  const custoTotalConsolidado = lotesValidos.reduce((acc, curr) => acc + curr.custoTotal, 0)
  const custoNutricaoConsolidado = lotesValidos.reduce((acc, curr) => acc + curr.custoNutricao, 0)
  const custoSanidadeConsolidado = lotesValidos.reduce((acc, curr) => acc + curr.custoSanidade, 0)
  const custoOperacionalConsolidado = lotesValidos.reduce(
    (acc, curr) => acc + curr.custoManejoOperacional + curr.custoOutros,
    0,
  )

  const custoMedioPorArroba =
    totalArrobasProduzidas > 0 && custoTotalConsolidado > 0
      ? Number((custoTotalConsolidado / totalArrobasProduzidas).toFixed(2))
      : null

  const custoMedioPorCabeca =
    totalCabecas > 0 ? Number((custoTotalConsolidado / totalCabecas).toFixed(2)) : 0

  const comCusto = lotesValidos.filter((l) => l.custoPorArroba !== null && l.custoPorArroba > 0)
  const ordenadosPorCusto = [...comCusto].sort((a, b) => a.custoPorArroba! - b.custoPorArroba!)

  const loteMaisEficiente = ordenadosPorCusto.length > 0 ? ordenadosPorCusto[0] : null
  const loteMaiorCusto =
    ordenadosPorCusto.length > 0 ? ordenadosPorCusto[ordenadosPorCusto.length - 1] : null

  return {
    totalLotesValidos,
    totalLotesMonitorados,
    totalCabecas,
    totalArrobasProduzidas: Number(totalArrobasProduzidas.toFixed(2)),
    custoTotalConsolidado,
    custoNutricaoConsolidado,
    custoSanidadeConsolidado,
    custoOperacionalConsolidado,
    custoMedioPorArroba,
    custoMedioPorCabeca,
    loteMaisEficiente,
    loteMaiorCusto,
  }
}

/**
 * Hook customizado para obter custos por arroba calculados com dados reais do banco e do ledger
 */
export function useCustoArroba(lots: LotRecord[], pesagens: PesagemRecord[]) {
  const { ledger } = useFinanceStore()

  return useMemo(() => {
    const analises = lots.map((lot) => {
      const pesagensDoLote = pesagens.filter((p) => p.lote_id === lot.id)
      return calcularCustoArrobaLote(lot, pesagensDoLote, ledger)
    })

    const consolidado = consolidarCustosArroba(analises)

    return {
      analises,
      consolidado,
    }
  }, [lots, pesagens, ledger])
}
