import { LancamentoFinanceiroRecord, EstoqueInsumoRecord } from './fechamento'
import { ConfigBenchmarkRecord, getConfigBenchmarks } from './configBenchmark'
import { MetasSafraMap, getMetasSafra } from './metasSafra'

export interface CustoSuplementoArrobaResult {
  custoTotalSuplementoRs: number
  arrobasProduzidasTotal: number
  kgGanhoAcumulado: number
  custoPorArrobaProduzida: number | null // null se arrobas <= 0
  temArrobasValidas: boolean
  detalhamentoInsumos: {
    produto: string
    quantidadeConsumida: number
    unidade: string
    precoUnitario: number
    custoTotalRs: number
  }[]
  detalhamentoLancamentos: {
    id: string
    data: string
    descricao: string
    valor: number
    plano_contas: string
  }[]
  referenciaMercadoRsArroba: number | null
  metaSafraRsArroba: number | null
  statusComparativo: 'abaixo_meta' | 'alinhado' | 'acima_meta' | 'sem_meta'
  baseCalculo: {
    formulaTexto: string
    periodo: string
    centroCusto: string
    premisaArroba: string
    custoFonte: string
  }
}

export interface CalcularCustoSuplementoParams {
  periodo: string
  anoSafra?: string
  lancamentosFinanceiros?: LancamentoFinanceiroRecord[]
  estoqueInsumos?: EstoqueInsumoRecord[]
  arrobasProduzidasTotal?: number
  kgGanhoAcumulado?: number
  benchmarks?: ConfigBenchmarkRecord[]
  metasSafra?: MetasSafraMap
}

/**
 * Calcula o custo do suplemento por @ produzida no período.
 * 1 @ de peso vivo = 30 kg; 1 @ de carcaça = 15 kg.
 * Reaproveita a produção de @ do fechamento e os insumos do centro de custo 'fabrica_suplemento'
 * ou da categoria 'nutricao' consumidos no período.
 */
export async function calcularCustoSuplementoPorArroba(
  params: CalcularCustoSuplementoParams,
): Promise<CustoSuplementoArrobaResult> {
  const {
    periodo,
    anoSafra,
    lancamentosFinanceiros = [],
    estoqueInsumos = [],
    arrobasProduzidasTotal = 0,
    kgGanhoAcumulado = 0,
  } = params

  // 1. Apurar custo total de insumos da fábrica de suplemento
  // Prioridade A: lançamentos financeiros no centro de custo 'fabrica_suplemento'
  const lancamentosFabrica = lancamentosFinanceiros.filter((l) => {
    const isFabrica = l.centro_custo === 'fabrica_suplemento'
    const isDespesaOuCusto = l.tipo === 'despesa' || l.classificacao === 'custo_variavel'
    return isFabrica && isDespesaOuCusto
  })

  let custoTotalLancamentos = lancamentosFabrica.reduce((acc, l) => acc + (l.valor || 0), 0)

  // Prioridade B: se não houver lançamentos específicos de fábrica, somar insumos de nutrição consumidos no estoque_insumos
  const itensNutricao = estoqueInsumos.filter(
    (e) => e.categoria === 'nutricao' || (!e.categoria && (e.saidas || 0) > 0),
  )

  const detalhamentoInsumos = itensNutricao.map((item) => {
    const qtdConsumida =
      item.saidas ||
      Math.max(0, (item.estoque_inicial || 0) + (item.entradas || 0) - (item.estoque_final || 0))
    const custo = item.custo_periodo || qtdConsumida * (item.preco_unitario || 0)
    return {
      produto: item.produto,
      quantidadeConsumida: Number(qtdConsumida.toFixed(2)),
      unidade: item.unidade || 'kg',
      precoUnitario: item.preco_unitario || 0,
      custoTotalRs: Number(custo.toFixed(2)),
    }
  })

  const custoTotalInsumosEstoque = detalhamentoInsumos.reduce((acc, i) => acc + i.custoTotalRs, 0)

  // Se houver lançamentos de fábrica, usa eles; senão, usa os insumos de nutrição do estoque apurados
  const usarLancamentos = custoTotalLancamentos > 0
  const custoTotalSuplementoRs = usarLancamentos ? custoTotalLancamentos : custoTotalInsumosEstoque

  // 2. Apuração das @ produzidas
  // Se arrobasProduzidasTotal for informada, usa diretamente. Se houver kgGanhoAcumulado, calcula kg / 30
  let arrobasFinais = arrobasProduzidasTotal
  if (arrobasFinais <= 0 && kgGanhoAcumulado > 0) {
    arrobasFinais = Number((kgGanhoAcumulado / 30).toFixed(2))
  }

  const temArrobasValidas = arrobasFinais > 0
  const custoPorArrobaProduzida = temArrobasValidas
    ? Number((custoTotalSuplementoRs / arrobasFinais).toFixed(2))
    : null

  // 3. Obter Benchmark lido dinamicamente da config_benchmark (nunca fixo)
  let referenciaMercadoRsArroba: number | null = null
  try {
    const bms = params.benchmarks || (await getConfigBenchmarks())
    const bmCusto = bms.find((b) => b.codigo === 'custo_arroba_produzida_engorda')
    if (bmCusto && bmCusto.valor_referencia) {
      referenciaMercadoRsArroba = bmCusto.valor_referencia
    }
  } catch (e) {
    console.warn('Erro ao carregar benchmark para custo/@ suplemento:', e)
  }

  // 4. Obter Meta da Safra lida da coleção metas_safra
  let metaSafraRsArroba: number | null = null
  try {
    const safraKey = anoSafra || '2025/2026'
    const metasMap = params.metasSafra || (await getMetasSafra(safraKey))
    if (metasMap && metasMap.custo_arroba && metasMap.custo_arroba.valor_alvo) {
      metaSafraRsArroba = metasMap.custo_arroba.valor_alvo
    }
  } catch (e) {
    console.warn('Erro ao carregar meta de safra para custo/@ suplemento:', e)
  }

  // 5. Comparativo (status semafórico)
  let statusComparativo: 'abaixo_meta' | 'alinhado' | 'acima_meta' | 'sem_meta' = 'sem_meta'
  const balizador = metaSafraRsArroba || referenciaMercadoRsArroba
  if (custoPorArrobaProduzida !== null && balizador !== null) {
    if (custoPorArrobaProduzida <= balizador * 0.95) {
      statusComparativo = 'abaixo_meta' // Ótimo, gastou menos que a meta por arroba
    } else if (custoPorArrobaProduzida <= balizador * 1.05) {
      statusComparativo = 'alinhado' // Dentro da margem de ±5%
    } else {
      statusComparativo = 'acima_meta' // Alerta: custo por arroba excedeu a meta
    }
  }

  return {
    custoTotalSuplementoRs: Number(custoTotalSuplementoRs.toFixed(2)),
    arrobasProduzidasTotal: Number(arrobasFinais.toFixed(2)),
    kgGanhoAcumulado: Number(kgGanhoAcumulado.toFixed(2)),
    custoPorArrobaProduzida,
    temArrobasValidas,
    detalhamentoInsumos,
    detalhamentoLancamentos: lancamentosFabrica.map((l) => ({
      id: l.id,
      data: l.data,
      descricao: l.descricao || '',
      valor: l.valor,
      plano_contas: l.plano_contas || '',
    })),
    referenciaMercadoRsArroba,
    metaSafraRsArroba,
    statusComparativo,
    baseCalculo: {
      formulaTexto:
        'Custo de Suplemento por @ = Custo Total do Período (Fábrica/Nutrição) ÷ Produção de @ do Rebanho',
      periodo,
      centroCusto: usarLancamentos
        ? 'Centro de Custo "fabrica_suplemento" (Lançamentos Financeiros)'
        : 'Insumos de Nutrição Apurados (Estoque & Consumo)',
      premisaArroba:
        '1 @ de peso vivo = 30 kg | 1 @ de carcaça = 15 kg (desfrute oficial do fechamento)',
      custoFonte: usarLancamentos
        ? `${lancamentosFabrica.length} lançamento(s) financeiro(s) registrado(s)`
        : `${detalhamentoInsumos.length} insumo(s) com movimentação no estoque`,
    },
  }
}
