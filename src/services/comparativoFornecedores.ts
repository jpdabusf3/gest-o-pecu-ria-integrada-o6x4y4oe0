/**
 * COMPARATIVO DE FORNECEDORES — Robô Chicão / Gestão Pecuária Integrada
 *
 * Ranking de ágio médio PONDERADO POR VOLUME (@ compradas) por fornecedor,
 * a partir dos registros REAIS de maestro_compras_gado (coleção append-only
 * do fluxo de compra de gado). Nenhum dado é inventado: sem compras na
 * safra, a seção exibe estado vazio explicativo.
 *
 * Ágio = (R$/@ compra ÷ cotação de referência − 1) × 100 (regra de projeto).
 * Registros sem cotação de referência entram no ranking de volume/investimento,
 * mas ficam fora do ágio (e sinalizados).
 */

import { getComprasGado, CompraGadoRecord } from './fechamento'

export interface EvolucaoAgioCompra {
  data: string
  arrobas: number
  precoRsAt: number
  cotacaoRsAt: number
  agioPct: number | null
  loteNome: string
}

export interface RankingFornecedor {
  fornecedor: string
  totalInvestidoRs: number
  totalCabecas: number
  totalArrobas: number
  numCompras: number
  primeiraCompra: string | null
  ultimaCompra: string | null
  precoMedioRsAt: number
  /** ágio médio PONDERADO por @ compradas */
  agioMedioPct: number | null
  comprasComAgio: number
  comprasSemAgio: number
  evolucao: EvolucaoAgioCompra[]
}

export interface SafraDisponivel {
  id: string
  label: string
  dataInicio: string
  dataFim: string
}

export interface ResultadoComparativoFornecedores {
  ranking: RankingFornecedor[]
  comprasPeriodo: number
  totalArrobas: number
  totalInvestidoRs: number
  comprasSemCotacao: number
  melhorFornecedor: string | null
  piorFornecedor: string | null
  periodo: { inicio: string; fim: string; label: string }
}

/** Safras-padrão pecuárias: safra atual (começa 1º de junho) e anterior */
function construirSafrasDisponiveis(): SafraDisponivel[] {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const inicioSafraAtual = new Date(anoAtual, 5, 1) // junho do ano corrente
  const anoInicioAtual = hoje >= inicioSafraAtual ? anoAtual : anoAtual - 1
  const anoInicioAnterior = anoInicioAtual - 1

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return [
    {
      id: `safra-${anoInicioAtual}/${anoInicioAtual + 1}`,
      label: `Safra ${anoInicioAtual}/${String(anoInicioAtual + 1).slice(2)}`,
      dataInicio: `${anoInicioAtual}-06-01`,
      dataFim: `${anoInicioAtual + 1}-05-31`,
    },
    {
      id: `safra-${anoInicioAnterior}/${anoInicioAtual}`,
      label: `Safra ${anoInicioAnterior}/${String(anoInicioAtual).slice(2)}`,
      dataInicio: `${anoInicioAnterior}-06-01`,
      dataFim: `${anoInicioAtual}-05-31`,
    },
  ]
}

export function getSafrasDisponiveis(): SafraDisponivel[] {
  return construirSafrasDisponiveis()
}

function arrobasDaCompra(c: CompraGadoRecord): number {
  if (c.arrobas_totais && c.arrobas_totais > 0) return c.arrobas_totais
  return ((c.qtd_cabecas || 0) * (c.peso_medio || 0)) / 30
}

/**
 * Monta o ranking de fornecedores para o período (safra ou customizado).
 * Usa APENAS registros reais de maestro_compras_gado via getComprasGado().
 */
export async function compararFornecedores(
  inicio: string,
  fim: string,
): Promise<ResultadoComparativoFornecedores> {
  const todas: CompraGadoRecord[] = await getComprasGado().catch(() => [])
  const compras = todas.filter((c) => {
    const d = c.data || ''
    return d >= inicio && d <= fim
  })

  const mapa = new Map<string, RankingFornecedor>()

  for (const c of compras) {
    const nome = (c.fornecedor || 'Fornecedor não informado').trim()
    if (!mapa.has(nome)) {
      mapa.set(nome, {
        fornecedor: nome,
        totalInvestidoRs: 0,
        totalCabecas: 0,
        totalArrobas: 0,
        numCompras: 0,
        primeiraCompra: null,
        ultimaCompra: null,
        precoMedioRsAt: 0,
        agioMedioPct: null,
        comprasComAgio: 0,
        comprasSemAgio: 0,
        evolucao: [],
      })
    }
    const f = mapa.get(nome)!
    const at = arrobasDaCompra(c)
    f.totalInvestidoRs += c.valor_total || 0
    f.totalCabecas += c.qtd_cabecas || 0
    f.totalArrobas += at
    f.numCompras += 1
    if (!f.primeiraCompra || (c.data && c.data < f.primeiraCompra)) f.primeiraCompra = c.data
    if (!f.ultimaCompra || (c.data && c.data > f.ultimaCompra)) f.ultimaCompra = c.data

    const precoAt = c.preco_rs_at || (at > 0 ? (c.valor_total || 0) / at : 0)
    // Ágio somente com cotação registrada — nunca inventada
    const cot = c.cotacao_referencia_rs || 0
    let agioPct: number | null = null
    if (cot > 0 && precoAt > 0) {
      agioPct = (precoAt / cot - 1) * 100
      f.comprasComAgio += 1
    } else {
      f.comprasSemAgio += 1
    }
    f.evolucao.push({
      data: c.data,
      arrobas: Number(at.toFixed(2)),
      precoRsAt: Number(precoAt.toFixed(2)),
      cotacaoRsAt: cot,
      agioPct: agioPct !== null ? Number(agioPct.toFixed(1)) : null,
      loteNome: c.lote_nome || '',
    })
  }

  const ranking = Array.from(mapa.values()).map((f) => {
    f.precoMedioRsAt =
      f.totalArrobas > 0 ? Number((f.totalInvestidoRs / f.totalArrobas).toFixed(2)) : 0
    // Ágio médio PONDERADO por @ compradas
    const comAgio = f.evolucao.filter((e) => e.agioPct !== null && e.arrobas > 0)
    if (comAgio.length > 0) {
      const somaAgioPond = comAgio.reduce((acc, e) => acc + (e.agioPct || 0) * e.arrobas, 0)
      const somaAt = comAgio.reduce((acc, e) => acc + e.arrobas, 0)
      f.agioMedioPct = Number((somaAgioPond / somaAt).toFixed(1))
    }
    f.evolucao.sort((a, b) => (a.data < b.data ? -1 : 1))
    return f
  })

  ranking.sort((a, b) => (b.agioMedioPct ?? -Infinity) - (a.agioMedioPct ?? -Infinity))

  const comAgio = ranking.filter((f) => f.agioMedioPct !== null)
  const melhorFornecedor = comAgio.length > 0 ? comAgio[comAgio.length - 1].fornecedor : null
  const piorFornecedor = comAgio.length > 0 ? comAgio[0].fornecedor : null

  return {
    ranking,
    comprasPeriodo: compras.length,
    totalArrobas: Number(compras.reduce((a, c) => a + arrobasDaCompra(c), 0).toFixed(2)),
    totalInvestidoRs: Number(compras.reduce((a, c) => a + (c.valor_total || 0), 0).toFixed(2)),
    comprasSemCotacao: compras.filter((c) => !c.cotacao_referencia_rs).length,
    melhorFornecedor,
    piorFornecedor,
    periodo: { inicio, fim, label: `${inicio} a ${fim}` },
  }
}
