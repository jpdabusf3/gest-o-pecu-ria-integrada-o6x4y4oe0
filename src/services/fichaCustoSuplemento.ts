import { EstoqueInsumoRecord, LancamentoFinanceiroRecord } from './fechamento'
import { converterKgParaSaco } from './conciliacaoEstoque'

export type FonteComposicaoFicha =
  | 'lancamentos_fabrica_sem_insumos'
  | 'insumos_consumidos'
  | 'formula_fabrica'

export interface ItemFichaCusto {
  produto: string
  quantidadeConsumida: number
  unidadeOriginal: string
  quantidadeKg: number
  quantidadeSacos: number
  precoUnitario: number
  custoTotalRs: number
  custoPorArroba: number | null
  participacaoPct: number
}

export interface FichaCustoSuplementoResult {
  disponivel: boolean
  fonteComposicao: FonteComposicaoFicha
  fonteComposicaoLabel: string
  custoTotalRs: number
  custoTotalOriginal: number
  arrobasProduzidas: number
  temArrobasValidas: boolean
  custoPorArrobaTotal: number | null
  itens: ItemFichaCusto[]
  maiorPeso: ItemFichaCusto | null
  menorPeso: ItemFichaCusto | null
  baseCalculo: {
    formulaTexto: string
    fonteDados: string
    periodo: string
    premisas: string[]
  }
}

/**
 * FICHA DE CUSTO DO SUPLEMENTO
 * Decompõe o custo por @ produzida em ingredientes (ração, núcleo, sal, milho,
 * farelo, minerais etc.) a partir dos MESMOS dados que alimentam o card
 * "Custo por @ Produzida": centro de custo "fabrica_suplemento" (lancamentos_
 * financeiros) ou, em fallback, os insumos de nutrição apurados no
 * estoque_insumos. NUNCA inventa dados — sem consumo, `disponivel = false`.
 *
 * Regras canônicas: 1 @ (arroba) de peso vivo = 30 kg · 1 saco = 30 kg.
 */
export function montarFichaCustoSuplemento(params: {
  periodo: string
  lancamentosFinanceiros?: LancamentoFinanceiroRecord[]
  estoqueInsumos?: EstoqueInsumoRecord[]
  arrobasProduzidasTotal?: number
  kgGanhoAcumulado?: number
}): FichaCustoSuplementoResult {
  const {
    periodo,
    lancamentosFinanceiros = [],
    estoqueInsumos = [],
    arrobasProduzidasTotal = 0,
    kgGanhoAcumulado = 0,
  } = params

  // Base idêntica ao calcularCustoSuplementoPorArroba (prioridade A → B)
  const lancamentosFabrica = lancamentosFinanceiros.filter((l) => {
    const isFabrica = l.centro_custo === 'fabrica_suplemento'
    const isDespesaOuCusto = l.tipo === 'despesa' || l.classificacao === 'custo_variavel'
    return isFabrica && isDespesaOuCusto
  })
  const custoTotalLancamentos = lancamentosFabrica.reduce((acc, l) => acc + (l.valor || 0), 0)

  const itensNutricao = estoqueInsumos.filter(
    (e) => e.categoria === 'nutricao' || (!e.categoria && (e.saidas || 0) > 0),
  )
  const detalhesEstoque = itensNutricao.map((item) => {
    const qtdConsumida =
      item.saidas ||
      Math.max(0, (item.estoque_inicial || 0) + (item.entradas || 0) - (item.estoque_final || 0))
    const custo = item.custo_periodo || qtdConsumida * (item.preco_unitario || 0)
    return { item, qtdConsumida, custo }
  })
  const custoTotalInsumosEstoque = detalhesEstoque.reduce((acc, i) => acc + i.custo, 0)
  const usarLancamentos = custoTotalLancamentos > 0
  const custoTotalOriginal = usarLancamentos ? custoTotalLancamentos : custoTotalInsumosEstoque

  // Mesma apuração de @ do serviço existente (1 @ = 30 kg de peso vivo)
  let arrobas = arrobasProduzidasTotal
  if (arrobas <= 0 && kgGanhoAcumulado > 0) arrobas = kgGanhoAcumulado / 30
  arrobas = Number(arrobas.toFixed(2))
  const temArrobas = arrobas > 0
  const custoPorArrobaTotal = temArrobas ? Number((custoTotalOriginal / arrobas).toFixed(2)) : null

  // --- Decomposição por ingrediente -----------------------------------------
  const agrupado = new Map<string, { kg: number; custo: number }>()

  if (!usarLancamentos) {
    for (const d of detalhesEstoque) {
      const chave = normalizarIngrediente(d.item.produto)
      const prev = agrupado.get(chave) || { kg: 0, custo: 0 }
      const kg =
        (d.item.unidade || '').trim().toLowerCase() === 'saco' ||
        (d.item.unidade || '').toLowerCase() === 'sc'
          ? d.qtdConsumida * 30
          : d.qtdConsumida
      agrupado.set(chave, { kg: prev.kg + kg, custo: prev.custo + d.custo })
    }
  }

  const temComposicaoInsumos = custoTotalInsumosEstoque > 0
  let fonte: FonteComposicaoFicha
  let fonteLabel: string
  let fonteDados: string

  if (usarLancamentos && temComposicaoInsumos) {
    fonte = 'insumos_consumidos'
    fonteLabel = 'Decomposição por consumo de insumos (estoque de nutrição)'
    fonteDados =
      'estoque_insumos (categoria nutrição ou movimentação no período) — custo por ingrediente ' +
      'derivado do consumo apurado (Saídas ou Est. Inicial + Entradas − Est. Final × Preço Unit.). ' +
      `Custeio consolidado no centro de custo "fabrica_suplemento" (lancamentos_financeiros, ${lancamentosFabrica.length} lançamento(s)).`
  } else if (!usarLancamentos && temComposicaoInsumos) {
    fonte = 'insumos_consumidos'
    fonteLabel = 'Decomposição por consumo de insumos (estoque de nutrição)'
    fonteDados =
      'estoque_insumos (categoria nutrição ou movimentação no período) — custo por ingrediente ' +
      'derivado do consumo apurado (Saídas ou Est. Inicial + Entradas − Est. Final × Preço Unit.).'
  } else if (usarLancamentos) {
    fonte = 'lancamentos_fabrica_sem_insumos'
    fonteLabel = 'Custo consolidado da Fábrica de Suplemento (sem decomposição por ingrediente)'
    fonteDados =
      'lancamentos_financeiros (centro de custo "fabrica_suplemento"). Não há consumo de insumos ' +
      'de nutrição lançado no estoque do período, então a decomposição por ingrediente não é possível.'
  } else {
    fonte = 'insumos_consumidos'
    fonteLabel = 'Sem consumo de insumos no período'
    fonteDados =
      'Nenhum consumo de insumos de nutrição registrado no estoque_insumos e nenhum lançamento no ' +
      'centro de custo "fabrica_suplemento" para o período.'
  }

  const itens: ItemFichaCusto[] = Array.from(agrupado.entries())
    .map(([chave, v]) => ({
      produto: chave,
      quantidadeConsumida: Number(v.kg.toFixed(2)),
      unidadeOriginal: 'kg',
      quantidadeKg: Number(v.kg.toFixed(2)),
      quantidadeSacos: converterKgParaSaco(v.kg),
      precoUnitario: 0,
      custoTotalRs: Number(v.custo.toFixed(2)),
      custoPorArroba: temArrobas ? Number((v.custo / arrobas).toFixed(2)) : null,
      participacaoPct:
        custoTotalInsumosEstoque > 0 ? (v.custo / custoTotalInsumosEstoque) * 100 : 0,
    }))
    .sort((a, b) => b.custoTotalRs - a.custoTotalRs)

  const premisas = [
    '1 @ (arroba) de peso vivo = 30 kg — produção de @ reaproveitada do próprio fechamento.',
    '1 saco de insumo = 30 kg (conversão aplicada na coluna de kg).',
    'Custo do ingrediente = consumo apurado × preço unitário do insumo no estoque.',
    'Fonte idêntica ao card "Custo por @ Produzida" — a soma dos ingredientes reproduz o custo total do período.',
  ]

  return {
    disponivel: itens.length > 0,
    fonteComposicao: fonte,
    fonteComposicaoLabel: fonteLabel,
    custoTotalRs: Number(custoTotalInsumosEstoque.toFixed(2)),
    custoTotalOriginal: Number(custoTotalOriginal.toFixed(2)),
    arrobasProduzidas: arrobas,
    temArrobasValidas: temArrobas,
    custoPorArrobaTotal,
    itens,
    maiorPeso: itens[0] || null,
    menorPeso: itens.length > 1 ? itens[itens.length - 1] : null,
    baseCalculo: {
      formulaTexto:
        'Custo do ingrediente por @ = (consumo do ingrediente × preço unitário) ÷ @ produzidas do período.',
      fonteDados,
      periodo,
      premisas,
    },
  }
}

// Utilitário interno (não exportado propositalmente): normaliza nomes livres de
// insumos nos grupos canônicos de ingredientes (ração, núcleo, sal, milho…).
function normalizarIngrediente(nome: string): string {
  const n = (nome || '').toLowerCase()
  if (n.includes('racao') || n.includes('ração')) return 'Ração'
  if (n.includes('nucleo') || n.includes('núcleo')) return 'Núcleo'
  if (n.includes('sal')) return 'Sal'
  if (n.includes('milho')) return 'Milho'
  if (n.includes('farelo')) return 'Farelo'
  if (n.includes('mineral')) return 'Mineral'
  if (n.includes('ureia') || n.includes('urÉia')) return 'Ureia'
  if (n.includes('confin')) return 'Confinamento'
  return 'Outros'
}
