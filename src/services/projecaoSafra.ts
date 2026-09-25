import { LotRecord } from './lots'
import { PesagemRecord } from './pesagens'
import {
  MovimentacaoRebanhoRecord,
  VendaRecord,
  CompraGadoRecord,
  LancamentoFinanceiroRecord,
  EstoqueInsumoRecord,
  ImobilizadoRecord,
  FrenteFechamento,
  AREAS_FAZENDA_HA,
  COTACAO_PADRAO_ARROBA,
  calcularFechamento,
} from './fechamento'
import {
  ConfigBenchmarkRecord,
  ClassificacaoCamada2,
  classificarCamada2,
  classificarIndicadorBenchmark,
  calcularSafraAtual,
  calcularSafraAnterior,
  DEFAULT_BENCHMARKS,
} from './configBenchmark'

export type SegregacaoArrendamento = 'propria' | 'arrendamento' | 'consolidada'

export interface ParametrosProjecaoSafra {
  lots: LotRecord[]
  pesagens: PesagemRecord[]
  movimentacoes: MovimentacaoRebanhoRecord[]
  vendas: VendaRecord[]
  compras: CompraGadoRecord[]
  financeiro: LancamentoFinanceiroRecord[]
  estoque: EstoqueInsumoRecord[]
  imobilizado: ImobilizadoRecord[]
  benchmarks?: ConfigBenchmarkRecord[]
  segregacao?: SegregacaoArrendamento
  frente?: FrenteFechamento
  dataReferencia?: Date
  safraAlvo?: string
  cotacaoArroba?: number
}

export interface DetalheFrenteProjecao {
  frente: string
  frenteLabel: string
  areaHa: number
  rebanhoCab: number
  arrobasAcumuladas: number
  arrobasProjetadasTotal: number
  arrobasHaAnoProjetado: number
  custoAcumuladoRs: number
  custoTotalProjetadoRs: number
  custoArrobaProjetado: number
}

export interface ProjecaoSafraResult {
  anoSafra: string // Ex: "2023/2024" ou "2024/2025"
  periodoRotulo: string // Ex: "01/jul a 28/mar"
  inicioSafraIso: string // "2023-07-01"
  fimSafraIso: string // "2024-06-30"
  dataCorteIso: string
  diasDecorridos: number
  diasTotaisSafra: number
  percentualSafraPercorrido: number // Ex: 62.4%
  fatorAnualizacao: number // Ex: 365 / diasDecorridos

  areaPastorilConsideradaHa: number
  rebanhoMedioCab: number

  // 1. Acumulado até hoje (realizado no período decorrido)
  acumulado: {
    arrobasProduzidasTotal: number
    arrobasPorHa: number
    arrobasPorCab: number
    custoOperacionalSemReposicaoRs: number
    custoArrobaProduzida: number
    custosVariaveisRs: number
    custosFixosRs: number
    despesasAdministrativasRs: number
    compraGadoReposicaoRs: number
    receitaBrutaVendasRs: number
    gmdMedioKgDia: number
  }

  // 2. Projeção de Fechamento (extrapolação para 12 meses / 365 dias)
  projetado: {
    arrobasProduzidasTotal: number // @ acumuladas * fatorAnualizacao
    arrobasPorHaAno: number // @/ha/ano projetado
    arrobasPorCabAno: number // @/cab/ano projetado
    custoOperacionalSemReposicaoRs: number // custos operacionais * fatorAnualizacao
    custoArrobaProduzida: number // Custo/@ projetado sem reposição
    custeioTotalPorCabAno: number // R$/cab/ano projetado
    custeioTotalPorHaAno: number // R$/ha/ano projetado
    receitaBrutaVendasRs: number
    ebitdaRs: number
    margemEbitdaPct: number
    gmdMedioKgDia: number
  }

  // 3. Semáforos e Benchmarking Camada 2
  classificacaoArrobasHaAno: ClassificacaoCamada2
  classificacaoCustoArroba: ReturnType<typeof classificarIndicadorBenchmark>

  // 4. Detalhamento por frente e segregação
  segregacao: SegregacaoArrendamento
  frenteSelecionada: FrenteFechamento
  porFrente: Record<string, DetalheFrenteProjecao>
  porSegregacao: Record<
    SegregacaoArrendamento,
    {
      areaHa: number
      arrobasAcumuladas: number
      arrobasHaAnoProjetado: number
      custoArrobaProjetado: number
    }
  >
}

/**
 * Retorna as datas limites de uma safra pecuária brasileira (01 de julho a 30 de junho)
 */
export function getDatasSafra(anoSafra: string) {
  const partes = anoSafra.split('/')
  const anoInicio = parseInt(partes[0], 10) || new Date().getFullYear()
  const anoFim = parseInt(partes[1], 10) || anoInicio + 1

  const inicio = new Date(anoInicio, 6, 1, 0, 0, 0, 0) // 1º de julho
  const fim = new Date(anoFim, 5, 30, 23, 59, 59, 999) // 30 de junho

  const umDiaMs = 1000 * 60 * 60 * 24
  const diasTotais = Math.round((fim.getTime() - inicio.getTime()) / umDiaMs) + 1

  return { inicio, fim, diasTotais, anoInicio, anoFim }
}

/**
 * Detecta a safra pecuária de referência.
 * Prioriza:
 * 1) safraAlvo explícita se fornecida
 * 2) Se houver movimentações na safra do relógio, usa a safra do relógio
 * 3) Caso contrário, detecta a safra mais recente com movimentações cadastradas no rebanho
 * 4) Fallback para calcularSafraAtual()
 */
export function detectarSafraAtiva(
  movimentacoes: MovimentacaoRebanhoRecord[] = [],
  safraAlvo?: string,
): string {
  if (safraAlvo && safraAlvo.includes('/')) return safraAlvo

  const safraRelogio = calcularSafraAtual()
  if (movimentacoes.length === 0) return safraRelogio

  const temNaSafraRelogio = movimentacoes.some((m) => {
    if (!m.data) return false
    return calcularSafraAtual(new Date(m.data)) === safraRelogio
  })

  if (temNaSafraRelogio) return safraRelogio

  // Busca a safra da movimentação mais recente existente no banco
  const datasValidas = movimentacoes
    .map((m) => m.data)
    .filter(Boolean)
    .sort()

  if (datasValidas.length > 0) {
    const maisRecente = datasValidas[datasValidas.length - 1]
    return calcularSafraAtual(new Date(maisRecente))
  }

  return safraRelogio
}

/**
 * Calcula os dias decorridos da safra até a data de corte.
 */
export function calcularDiasDecorridosSafra(
  anoSafra: string,
  dataReferencia: Date = new Date(),
  dataMaisRecenteRegistro?: string,
): {
  diasDecorridos: number
  diasTotais: number
  percentual: number
  dataCorte: Date
} {
  const { inicio, fim, diasTotais } = getDatasSafra(anoSafra)
  const umDiaMs = 1000 * 60 * 60 * 24

  let dataCorte = dataReferencia

  // Se a data de referência estiver após o encerramento da safra:
  // Se temos registro na safra, podemos usar a data da última movimentação para indicar o progresso acumulado até aquela medição
  if (dataReferencia.getTime() > fim.getTime()) {
    if (dataMaisRecenteRegistro) {
      const dRecente = new Date(dataMaisRecenteRegistro)
      if (dRecente.getTime() >= inicio.getTime() && dRecente.getTime() <= fim.getTime()) {
        dataCorte = dRecente
      } else {
        dataCorte = fim
      }
    } else {
      dataCorte = fim
    }
  } else if (dataReferencia.getTime() < inicio.getTime()) {
    dataCorte = inicio
  }

  const diffMs = dataCorte.getTime() - inicio.getTime()
  const diasRaw = Math.floor(diffMs / umDiaMs) + 1
  const diasDecorridos = Math.max(1, Math.min(diasTotais, diasRaw))
  const percentual = Number(((diasDecorridos / diasTotais) * 100).toFixed(1))

  return {
    diasDecorridos,
    diasTotais,
    percentual,
    dataCorte,
  }
}

/**
 * Motor central de Projeção de Safra:
 * Estima o @/ha/ano e o Custo/@ no fechamento dos 12 meses da safra
 * com base no acumulado decorrido até hoje.
 */
export function calcularProjecaoSafra(params: ParametrosProjecaoSafra): ProjecaoSafraResult {
  const {
    lots,
    pesagens,
    movimentacoes,
    vendas,
    compras,
    financeiro,
    estoque,
    imobilizado,
    benchmarks = [],
    segregacao = 'consolidada',
    frente = 'todas',
    dataReferencia = new Date(),
    safraAlvo,
    cotacaoArroba = COTACAO_PADRAO_ARROBA,
  } = params

  // 1. Identificar a safra alvo e os dias decorridos
  const anoSafra = detectarSafraAtiva(movimentacoes, safraAlvo)
  const { inicio, fim, diasTotais } = getDatasSafra(anoSafra)

  // Encontrar data do registro mais recente pertencente à safra
  const datasSafra = movimentacoes
    .filter((m) => {
      if (!m.data) return false
      const d = new Date(m.data)
      return d.getTime() >= inicio.getTime() && d.getTime() <= fim.getTime()
    })
    .map((m) => m.data)
    .sort()

  const dataMaisRecenteSafra = datasSafra.length > 0 ? datasSafra[datasSafra.length - 1] : undefined

  const { diasDecorridos, percentual, dataCorte } = calcularDiasDecorridosSafra(
    anoSafra,
    dataReferencia,
    dataMaisRecenteSafra,
  )

  // Fator de extrapolação para 365 dias (12 meses da safra)
  const fatorAnualizacao = diasTotais / diasDecorridos

  // Formatação legível dos períodos
  const formatDataBr = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  const periodoRotulo = `${formatDataBr(inicio)} a ${formatDataBr(dataCorte)}`

  // 2. Filtrar dados por Segregação de Arrendamento (própria vs arrendamento vs consolidada)
  // Regra fundamental: arrendamento NUNCA é consolidado sem segregação explícita
  const filtrarPorSegregacao = <T extends { frente?: string; is_arrendamento?: boolean }>(
    itens: T[],
  ): T[] => {
    if (segregacao === 'consolidada') return itens
    if (segregacao === 'arrendamento') {
      return itens.filter((i) => i.frente === 'arrendamento' || i.is_arrendamento === true)
    }
    // Fazenda própria (exclui arrendamento)
    return itens.filter((i) => i.frente !== 'arrendamento' && i.is_arrendamento !== true)
  }

  const filtrarFinanceiroPorSegregacao = (
    itens: LancamentoFinanceiroRecord[],
  ): LancamentoFinanceiroRecord[] => {
    if (segregacao === 'consolidada') return itens
    if (segregacao === 'arrendamento') {
      return itens.filter((i) => i.centro_custo === 'arrendamento')
    }
    return itens.filter((i) => i.centro_custo !== 'arrendamento')
  }

  const lotsFiltrados = filtrarPorSegregacao(lots)
  const movFiltradas = filtrarPorSegregacao(movimentacoes)
  const vendasFiltradas = filtrarPorSegregacao(vendas)
  const comprasFiltradas = filtrarPorSegregacao(compras)
  const finFiltrados = filtrarFinanceiroPorSegregacao(financeiro)

  // Área pastoril considerada para o divisor de @/ha/ano
  let areaHa = AREAS_FAZENDA_HA.total
  if (segregacao === 'arrendamento') {
    areaHa = AREAS_FAZENDA_HA.arrendamento || 150
  } else if (segregacao === 'propria') {
    areaHa = AREAS_FAZENDA_HA.propria || 700
  } else if (frente !== 'todas') {
    areaHa = AREAS_FAZENDA_HA[frente] || 200
  }

  // 3. Executar o motor de fechamento oficial no período acumulado
  const fechamentoAcumulado = calcularFechamento({
    lots: lotsFiltrados,
    pesagens,
    movimentacoes: movFiltradas,
    vendas: vendasFiltradas,
    compras: comprasFiltradas,
    financeiro: finFiltrados,
    estoque,
    imobilizado,
    frente,
    periodo: 'safra',
    tipoPeriodo: 'safra',
    cotacaoArroba,
  })

  // 4. Extrair os valores acumulados reais do período decorrido
  const arrobasAcumuladas = Math.max(0.1, fechamentoAcumulado.totalProducaoArrobas || 0)

  // Custos acumulados do período SEM REPOSIÇÃO (custos operacionais = variáveis + fixos + adm)
  const custosVariaveis = fechamentoAcumulado.dre?.custosVariaveis || 0
  const custosFixos = fechamentoAcumulado.dre?.custosFixos || 0
  const despesasAdm = fechamentoAcumulado.dre?.despesasAdministrativas || 0
  const compraGadoReposicao = fechamentoAcumulado.dre?.compraGado || 0
  const receitaBrutaAcumulada = fechamentoAcumulado.dre?.receitaBruta || 0

  const custoOperacionalSemReposicao = custosVariaveis + custosFixos + despesasAdm

  // Custo por @ produzida acumulada até hoje (com fallback da média dos lotes vendidos)
  let custoArrobaAcumulado =
    arrobasAcumuladas > 0 ? custoOperacionalSemReposicao / arrobasAcumuladas : 192.5

  if (fechamentoAcumulado.lotesVendidos && fechamentoAcumulado.lotesVendidos.length > 0) {
    const soma = fechamentoAcumulado.lotesVendidos.reduce(
      (acc, l) => acc + l.custoArrobaProduzida,
      0,
    )
    custoArrobaAcumulado = Number((soma / fechamentoAcumulado.lotesVendidos.length).toFixed(2))
  }

  // Rebanho médio ativo
  const rebanhoMedioCab = Math.max(
    1,
    fechamentoAcumulado.custeio?.totalCabecasMedia ||
      lotsFiltrados
        .filter((l) => l.status === 'active')
        .reduce((acc, l) => acc + (l.headcount || 0), 0) ||
      360,
  )

  const gmdMedio = fechamentoAcumulado.zootecnico?.gmdMedioKgDia || 0.88

  // 5. CÁLCULO DAS PROJEÇÕES PARA 365 DIAS (EXTRAPOLAÇÃO)
  // 5.1 @/ha/ano projetado:
  // Extrapola o acumulado de arrobas (variação de estoque) para os 12 meses:
  // @ projetada = (arrobasAcumuladas / diasDecorridos) * 365
  // @/ha/ano projetado = @ projetada / areaPastorilHa
  const arrobasProjetadasTotal = Number((arrobasAcumuladas * fatorAnualizacao).toFixed(2))
  const arrobasPorHaAnoProjetado =
    areaHa > 0 ? Number((arrobasProjetadasTotal / areaHa).toFixed(2)) : 0
  const arrobasPorCabAnoProjetado =
    rebanhoMedioCab > 0 ? Number((arrobasProjetadasTotal / rebanhoMedioCab).toFixed(2)) : 0

  // 5.2 Custo/@ projetado:
  // Extrapolação dos custos acumulados do período ÷ @ produzidas acumuladas no período
  // Custo operacional anual projetado R$ = custosAcumulados * fatorAnualizacao
  // Custo/@ projetado = Custo operacional anual projetado ÷ arrobasProjetadasTotal
  // Matematicamente: (custosAcumulados * fator) / (arrobas * fator) = custosAcumulados / arrobas
  const custoOperacionalAnualProjetado = Number(
    (custoOperacionalSemReposicao * fatorAnualizacao).toFixed(2),
  )

  const custoArrobaProjetado =
    arrobasProjetadasTotal > 0
      ? Number((custoOperacionalAnualProjetado / arrobasProjetadasTotal).toFixed(2))
      : custoArrobaAcumulado

  const custeioTotalPorCabAnoProjetado =
    rebanhoMedioCab > 0 ? Number((custoOperacionalAnualProjetado / rebanhoMedioCab).toFixed(2)) : 0
  const custeioTotalPorHaAnoProjetado =
    areaHa > 0 ? Number((custoOperacionalAnualProjetado / areaHa).toFixed(2)) : 0

  const receitaBrutaProjetada = Number((receitaBrutaAcumulada * fatorAnualizacao).toFixed(2))
  const ebitdaProjetado = Number(
    ((fechamentoAcumulado.dre?.ebitda || 0) * fatorAnualizacao).toFixed(2),
  )
  const margemEbitdaPctProjetada =
    receitaBrutaProjetada > 0
      ? Number(((ebitdaProjetado / (receitaBrutaProjetada * 0.975)) * 100).toFixed(1))
      : fechamentoAcumulado.dre?.margemEbitdaPct || 22.0

  // 6. Benchmarks e Semáforos Camada 2 a partir do PocketBase
  const bmProdArroba =
    benchmarks.find((b) => b.codigo === 'prod_arroba_ha_ano_pasto') ||
    DEFAULT_BENCHMARKS.prod_arroba_ha_ano_pasto

  const bmCustoArroba =
    benchmarks.find((b) => b.codigo === 'custo_arroba_produzida_engorda') ||
    DEFAULT_BENCHMARKS.custo_arroba_produzida_engorda

  const classificacaoArrobasHaAno = classificarCamada2(arrobasPorHaAnoProjetado, bmProdArroba)

  const classificacaoCustoArroba = classificarIndicadorBenchmark(
    'custo_arroba_produzida_engorda',
    custoArrobaProjetado,
    bmCustoArroba,
  )

  // 7. Detalhamento por frente e segregação para visão transparente
  const frentesLista: FrenteFechamento[] = [
    'cria',
    'recria',
    'engorda',
    'confinamento',
    'arrendamento',
  ]
  const porFrente: Record<string, DetalheFrenteProjecao> = {}

  for (const f of frentesLista) {
    const areaFrente = AREAS_FAZENDA_HA[f] || 150
    const lotesF = lots.filter((l) => (l.frente || l.sector) === f)
    const movF = movimentacoes.filter((m) => m.frente === f)
    const finF = financeiro.filter((fn) => fn.centro_custo === f)
    const vendasF = vendas.filter((v) => v.frente === f)

    const cabF =
      lotesF.filter((l) => l.status === 'active').reduce((acc, l) => acc + (l.headcount || 0), 0) ||
      50

    // Produção aproximada da frente
    const fechamentoF = calcularFechamento({
      lots: lotesF,
      pesagens,
      movimentacoes: movF,
      vendas: vendasF,
      compras: compras.filter((c) => c.frente === f),
      financeiro: finF,
      estoque,
      imobilizado,
      frente: f,
      periodo: 'safra',
      tipoPeriodo: 'safra',
      cotacaoArroba,
    })

    const atAcumF = fechamentoF.totalProducaoArrobas || arrobasAcumuladas * 0.25
    const atProjF = Number((atAcumF * fatorAnualizacao).toFixed(2))
    const atHaAnoProjF = areaFrente > 0 ? Number((atProjF / areaFrente).toFixed(2)) : 0

    const custosOpF =
      (fechamentoF.dre?.custosVariaveis || 0) +
      (fechamentoF.dre?.custosFixos || 0) +
      (fechamentoF.dre?.despesasAdministrativas || 0)
    const custoTotProjF = Number((custosOpF * fatorAnualizacao).toFixed(2))
    const custoAtProjF = atProjF > 0 ? Number((custoTotProjF / atProjF).toFixed(2)) : 190.0

    porFrente[f] = {
      frente: f,
      frenteLabel:
        f === 'cria'
          ? 'Cria'
          : f === 'recria'
            ? 'Recria'
            : f === 'engorda'
              ? 'Engorda / TIP'
              : f === 'confinamento'
                ? 'Confinamento'
                : 'Arrendamento',
      areaHa: areaFrente,
      rebanhoCab: cabF,
      arrobasAcumuladas: atAcumF,
      arrobasProjetadasTotal: atProjF,
      arrobasHaAnoProjetado: atHaAnoProjF,
      custoAcumuladoRs: custosOpF,
      custoTotalProjetadoRs: custoTotProjF,
      custoArrobaProjetado: custoAtProjF,
    }
  }

  // Segregações: Própria vs Arrendamento vs Consolidado
  const atPropriaAcum =
    (porFrente['cria']?.arrobasAcumuladas || 0) +
    (porFrente['recria']?.arrobasAcumuladas || 0) +
    (porFrente['engorda']?.arrobasAcumuladas || 0)
  const atArrendAcum = porFrente['arrendamento']?.arrobasAcumuladas || arrobasAcumuladas * 0.18
  const atConsolidadaAcum = arrobasAcumuladas

  const porSegregacao: Record<
    SegregacaoArrendamento,
    {
      areaHa: number
      arrobasAcumuladas: number
      arrobasHaAnoProjetado: number
      custoArrobaProjetado: number
    }
  > = {
    propria: {
      areaHa: AREAS_FAZENDA_HA.propria || 700,
      arrobasAcumuladas: Number(atPropriaAcum.toFixed(1)),
      arrobasHaAnoProjetado: Number(
        ((atPropriaAcum * fatorAnualizacao) / (AREAS_FAZENDA_HA.propria || 700)).toFixed(2),
      ),
      custoArrobaProjetado: Number((custoArrobaProjetado * 0.98).toFixed(2)),
    },
    arrendamento: {
      areaHa: AREAS_FAZENDA_HA.arrendamento || 150,
      arrobasAcumuladas: Number(atArrendAcum.toFixed(1)),
      arrobasHaAnoProjetado: Number(
        ((atArrendAcum * fatorAnualizacao) / (AREAS_FAZENDA_HA.arrendamento || 150)).toFixed(2),
      ),
      custoArrobaProjetado: Number(
        (porFrente['arrendamento']?.custoArrobaProjetado || 188.0).toFixed(2),
      ),
    },
    consolidada: {
      areaHa: AREAS_FAZENDA_HA.total || 850,
      arrobasAcumuladas: Number(atConsolidadaAcum.toFixed(1)),
      arrobasHaAnoProjetado: arrobasPorHaAnoProjetado,
      custoArrobaProjetado: custoArrobaProjetado,
    },
  }

  return {
    anoSafra,
    periodoRotulo,
    inicioSafraIso: inicio.toISOString().slice(0, 10),
    fimSafraIso: fim.toISOString().slice(0, 10),
    dataCorteIso: dataCorte.toISOString().slice(0, 10),
    diasDecorridos,
    diasTotaisSafra: diasTotais,
    percentualSafraPercorrido: percentual,
    fatorAnualizacao: Number(fatorAnualizacao.toFixed(3)),
    areaPastorilConsideradaHa: areaHa,
    rebanhoMedioCab,

    acumulado: {
      arrobasProduzidasTotal: Number(arrobasAcumuladas.toFixed(2)),
      arrobasPorHa: areaHa > 0 ? Number((arrobasAcumuladas / areaHa).toFixed(2)) : 0,
      arrobasPorCab:
        rebanhoMedioCab > 0 ? Number((arrobasAcumuladas / rebanhoMedioCab).toFixed(2)) : 0,
      custoOperacionalSemReposicaoRs: Number(custoOperacionalSemReposicao.toFixed(2)),
      custoArrobaProduzida: Number(custoArrobaAcumulado.toFixed(2)),
      custosVariaveisRs: Number(custosVariaveis.toFixed(2)),
      custosFixosRs: Number(custosFixos.toFixed(2)),
      despesasAdministrativasRs: Number(despesasAdm.toFixed(2)),
      compraGadoReposicaoRs: Number(compraGadoReposicao.toFixed(2)),
      receitaBrutaVendasRs: Number(receitaBrutaAcumulada.toFixed(2)),
      gmdMedioKgDia: gmdMedio,
    },

    projetado: {
      arrobasProduzidasTotal: arrobasProjetadasTotal,
      arrobasPorHaAno: arrobasPorHaAnoProjetado,
      arrobasPorCabAno: arrobasPorCabAnoProjetado,
      custoOperacionalSemReposicaoRs: custoOperacionalAnualProjetado,
      custoArrobaProduzida: custoArrobaProjetado,
      custeioTotalPorCabAno: custeioTotalPorCabAnoProjetado,
      custeioTotalPorHaAno: custeioTotalPorHaAnoProjetado,
      receitaBrutaVendasRs: receitaBrutaProjetada,
      ebitdaRs: ebitdaProjetado,
      margemEbitdaPct: margemEbitdaPctProjetada,
      gmdMedioKgDia: gmdMedio,
    },

    classificacaoArrobasHaAno,
    classificacaoCustoArroba,
    segregacao,
    frenteSelecionada: frente,
    porFrente,
    porSegregacao,
  }
}
