/**
 * Serviço do Robô Chicão — Ingestão de VENDA DE GADO
 *
 * Regras Pecuárias Integradas (invioláveis):
 * - 1 @ de peso vivo = 30 kg; 1 @ de carcaça = 15 kg
 * - peso em @ de carcaça = (peso vivo × % rendimento de carcaça) ÷ 15
 * - GMD é sempre kg/dia (nunca g/dia)
 * - Ágio = (R$/@ venda ÷ cotação − 1) × 100; cotação B3 ausente nunca é inventada
 *
 * Fluxo estrito em 5 etapas:
 *   1. Leitura → 2. Mapeamento → 3. Conferência (OBRIGATÓRIA) → 4. Aplicação → 5. Relatório
 *
 * Integração (sem estruturas paralelas):
 * - Rebanho: coleção `lots` (DECREMENTA headcount — nunca negativo)
 * - Movimentação: `movimentacoes_rebanho` tipo 'venda' (saída)
 * - Financeiro: `lancamentos_financeiros` tipo receita no centro de custo da frente
 * - Venda: `vendas` (coleção existente do fechamento)
 * - Margem: `maestro_compras_gado` (preço @ pago) vs preço @ venda
 * - Auditoria: `audit_log` append-only (via serviços/auditoria.ts)
 */

import pb from '@/lib/pocketbase/client'
import { getLots, updateLot, LotRecord } from './lots'
import {
  registrarMovimentacaoRebanho,
  registrarLancamentoFinanceiro,
  registrarVendaGado,
  getComprasGado,
  CompraGadoRecord,
} from './fechamento'
import { getCotacaoB3BoiGordoVigente } from './market'
import { registrarAuditLog } from './auditoria'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { downloadExcel } from '@/lib/exportUtils'
import type { ColunaCompraMapping } from './maestroCompraGado'

export type FrenteVenda = 'cria' | 'recria' | 'engorda' | 'confinamento' | 'arrendamento'
export type StatusLinhaVenda = 'atualizar' | 'ignorar'

export interface LinhaVendaNormalizada {
  idTemp: string
  linhaOrigem: number
  dadosOriginais: Record<string, any>
  dados: {
    lote_nome: string
    categoria: string
    sexo: 'macho' | 'femea'
    qtd_cabecas: number
    peso_medio_kg: number
    arrobas_totais: number
    preco_rs_cab: number
    preco_rs_at: number
    valor_total: number
    comprador: string
    documento: string
    data: string
    peso_arrobas_origem: boolean
    peso_carcaca: boolean
  }
  acao: StatusLinhaVenda
  motivoAcao: string
  loteDestinoId?: string
  loteCabecasExistentes?: number
  /** bloqueada se a venda supera o lote */
  bloqueada: boolean
  motivoBloqueio?: string
  /** custo de @ de origem e sua fonte */
  custoRsAt: number | null
  origemCusto: 'compra_registrada' | 'custo_medio' | 'desconhecido'
  margemRs: number | null
  margemPct: number | null
  agioPct: number | null
  conversoes: string[]
  alertas: string[]
  ignoradoPeloUsuario: boolean
  frenteEscolhida?: FrenteVenda
}

export interface ResultadoConferenciaVenda {
  linhas: LinhaVendaNormalizada[]
  cotacao: {
    preco: number
    dataReferencia: string
    origem: 'b3_vigente' | 'manual'
    desatualizada: boolean
    diasAtraso: number
  } | null
  avisoCotacao: string | null
  resumo: {
    totalLidos: number
    aAtualizar: number
    aIgnorar: number
    bloqueadas: number
    cabecasTotais: number
    pesoTotalKg: number
    arrobasTotais: number
    receitaTotalRs: number
    precoMedioRsAt: number
    agioMedioPct: number | null
    margemTotalRs: number | null
    margemPct: number | null
    conversoes: string[]
    alertas: string[]
  }
}

export interface ResultadoAplicacaoVenda {
  sucesso: boolean
  totalLidos: number
  atualizados: number
  ignorados: number
  detalhesIgnorados: { linha: number; motivo: string }[]
  entidadesAfetadas: string[]
  protocoloAuditId?: string
  timestamp: string
  cotacaoOrigem: 'b3_vigente' | 'manual' | 'nenhuma'
  cotacaoPreco: number | null
}

// ------------------------------------------------------------------
// Sinônimos de cabeçalho — VENDA DE GADO (mesmos da compra + comprador)
// ------------------------------------------------------------------

const SINONIMOS_VENDA: Record<string, string> = {
  // quantidade de cabeças
  quantidade: 'qtd_cabecas',
  cabecas: 'qtd_cabecas',
  qtd: 'qtd_cabecas',
  'quantidade de cabecas': 'qtd_cabecas',
  'qtd cabecas': 'qtd_cabecas',
  'n cabecas': 'qtd_cabecas',
  'nº de cabecas': 'qtd_cabecas',
  vendidos: 'qtd_cabecas',
  'animais vendidos': 'qtd_cabecas',

  // peso médio
  'peso medio': 'peso_medio_kg',
  'peso (kg)': 'peso_medio_kg',
  'peso kg': 'peso_medio_kg',
  pv: 'peso_medio_kg',
  'peso vivo': 'peso_medio_kg',
  'peso vivo (kg)': 'peso_medio_kg',
  'peso vivo kg': 'peso_medio_kg',
  'peso medio (kg)': 'peso_medio_kg',
  'peso medio kg': 'peso_medio_kg',
  'peso @': 'peso_medio_at',
  'peso em @': 'peso_medio_at',
  'peso arroba': 'peso_medio_at',
  'peso em arrobas': 'peso_medio_at',
  '@': 'peso_medio_at',
  // peso de carcaça — conversão usa 15 kg
  'peso de carcaca': 'peso_medio_at_carcaca',
  'peso carcaca': 'peso_medio_at_carcaca',
  'carcaca (kg)': 'peso_carcaca_kg',
  'peso carcaca kg': 'peso_carcaca_kg',

  // preços
  'preco por cabeca': 'preco_rs_cab',
  'preço por cabeça': 'preco_rs_cab',
  'r$/cabeca': 'preco_rs_cab',
  'r$ / cabeca': 'preco_rs_cab',
  'valor por cabeca': 'preco_rs_cab',
  'preco cabeca': 'preco_rs_cab',
  'r$/cab': 'preco_rs_cab',
  'preco por @': 'preco_rs_at',
  'preco por arroba': 'preco_rs_at',
  'preço por arroba': 'preco_rs_at',
  'r$/@': 'preco_rs_at',
  'r$ @': 'preco_rs_at',
  'r$ / @': 'preco_rs_at',
  'preco @': 'preco_rs_at',
  'preco arroba': 'preco_rs_at',
  'r$/arroba': 'preco_rs_at',

  // comprador
  comprador: 'comprador',
  cliente: 'comprador',
  'nome do comprador': 'comprador',
  'parte compradora': 'comprador',

  // documento (NF / nota fiscal / recibo)
  documento: 'documento',
  'nº documento': 'documento',
  'nota fiscal': 'documento',
  nf: 'documento',
  recibo: 'documento',

  // data
  'data da venda': 'data',
  data: 'data',
  'data de venda': 'data',
  'data de saida': 'data',

  // lote de origem
  lote: 'lote_nome',
  'nome do lote': 'lote_nome',
  'lote origem': 'lote_nome',
  'lote de origem': 'lote_nome',

  // categoria e sexo
  categoria: 'categoria',
  'faixa etaria': 'categoria',
  sexo: 'sexo',
  genero: 'sexo',

  // frente
  frente: 'frente',
  'centro de custo': 'frente',
}

function normalizar(str: string): string {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Reconhece cabeçalhos de planilha/PDF/DOCX de venda de gado.
 * Usa os mesmos sinônimos do fluxo de compra, acrescidos de comprador/documento.
 */
export function reconhecerColunasVendaGado(headers: string[]): ColunaCompraMapping[] {
  return headers.map((header) => {
    const norm = normalizar(header)
    if (SINONIMOS_VENDA[norm]) {
      return { colunaOrigem: header, campoDestino: SINONIMOS_VENDA[norm], confianca: 95 }
    }
    for (const [key, campo] of Object.entries(SINONIMOS_VENDA)) {
      if (norm.includes(key) || key.includes(norm)) {
        return { colunaOrigem: header, campoDestino: campo, confianca: 80 }
      }
    }
    return { colunaOrigem: header, campoDestino: 'ignorar', confianca: 30 }
  })
}

/** Um preço (por cabeça ou por @) ou quantidade identificável basta para o fluxo */
export function isDocumentoVendaGado(mappings: ColunaCompraMapping[]): boolean {
  const campos = new Set(mappings.map((m) => m.campoDestino))
  return (
    campos.has('qtd_cabecas') ||
    campos.has('peso_medio_kg') ||
    campos.has('peso_medio_at') ||
    campos.has('preco_rs_cab') ||
    campos.has('preco_rs_at')
  )
}

// ------------------------------------------------------------------
// Parsing de valores (mesmos helpers do fluxo de compra)
// ------------------------------------------------------------------

function parseNumero(val: any): number | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  if (!s) return null
  let cleaned = s.replace(/r\$|@|kg|reais|s/gi, '').trim()
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.')
  }
  const num = parseFloat(cleaned.replace(/[^\d.-]/g, ''))
  return isNaN(num) ? null : num
}

function parseDataVenda(val: any): string | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (s.includes('/')) {
    const parts = s.split('/')
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0')
      const m = parts[1].padStart(2, '0')
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
      const iso = `${y}-${m}-${d}`
      const dt = new Date(iso)
      return isNaN(dt.getTime()) ? null : iso
    }
  }
  const dt = new Date(s)
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
  return null
}

function normalizarCategoria(raw: string): string {
  const c = normalizar(raw)
  if (c.includes('bezerro') || c.includes('bezerra')) return 'Bezerros (0-12m)'
  if (c.includes('garrote') || c.includes('novilho') || c.includes('novilha'))
    return 'Recria (12-24m)'
  if (c.includes('boi') || c.includes('vaca') || c.includes('touro') || c.includes('matriz'))
    return 'Engorda (>24m)'
  return raw.trim()
}

function normalizarSexo(raw: string): 'macho' | 'femea' {
  const s = normalizar(raw)
  if (s.startsWith('f') || s.includes('femea') || s.includes('vaca') || s.includes('novilha'))
    return 'femea'
  return 'macho'
}

// ------------------------------------------------------------------
// Cotação B3 — nunca inventada; se ausente/desatualizada > 7 dias, aviso
// ------------------------------------------------------------------

export async function obterCotacaoReferenciaVenda(): Promise<{
  cotacao: ResultadoConferenciaVenda['cotacao']
  aviso: string | null
}> {
  try {
    const c = await getCotacaoB3BoiGordoVigente()
    if (c && c.origem !== 'fallback' && c.preco > 0) {
      return {
        cotacao: {
          preco: c.preco,
          dataReferencia: c.dataReferencia,
          origem: 'b3_vigente',
          desatualizada: c.desatualizada,
          diasAtraso: c.diasAtraso,
        },
        aviso: c.desatualizada
          ? `Cotação B3 do boi gordo desatualizada (${c.diasAtraso} dias desde ${new Date(c.dataReferencia).toLocaleDateString('pt-BR')}). Informe manualmente o preço de referência na conferência se preferir — nenhum preço será inventado.`
          : null,
      }
    }
    if (c && c.origem === 'fallback' && c.preco > 0) {
      return {
        cotacao: {
          preco: c.preco,
          dataReferencia: c.dataReferencia,
          origem: 'b3_vigente',
          desatualizada: false,
          diasAtraso: 0,
        },
        aviso:
          'Cotação B3 do boi gordo não encontrada nas tabelas registradas. O valor de fallback é apenas uma referência genérica — informe manualmente o preço de referência na conferência.',
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar cotação B3:', err)
  }
  return {
    cotacao: null,
    aviso:
      'Sem cotação B3 do boi gordo registrada no sistema. Informe manualmente o preço de referência da @ na conferência para calcular o ágio — nada será inventado.',
  }
}

// ------------------------------------------------------------------
// Custo de origem por lote (de maestro_compras_gado — nunca inventado)
// ------------------------------------------------------------------

interface CustoLoteInfo {
  custoRsAt: number | null
  origem: 'compra_registrada' | 'custo_medio' | 'desconhecido'
  loteIdOrigem?: string
}

/**
 * Busca o preço de @ PAGADO na compra do lote indicado.
 * - Lote vinculado a uma compra do Chicão → preço/@ daquela compra (mais recente)
 * - Lote sem compra registrada → custo médio de reposição das compras da safra,
 *   sinalizado explicitamente na conferência
 * - Nada é inventado: sem dados, custo = null
 */
async function obterCustoLote(lote: LotRecord | undefined): Promise<CustoLoteInfo> {
  let compras: CompraGadoRecord[] = []
  try {
    compras = await getComprasGado()
  } catch {
    compras = []
  }

  if (lote && compras.length > 0) {
    const comprasDoLote = compras
      .filter(
        (c) => c.lote_id === lote.id || normalizar(c.fornecedor || '') === normalizar(lote.name),
      )
      .filter((c) => c.preco_rs_at && c.preco_rs_at > 0)
      .sort((a, b) => (a.data < b.data ? 1 : -1))
    if (comprasDoLote.length > 0) {
      return {
        custoRsAt: comprasDoLote[0].preco_rs_at!,
        origem: 'compra_registrada',
        loteIdOrigem: comprasDoLote[0].lote_id || lote.id,
      }
    }
  }

  // Custo médio de reposição das compras registradas (sinalizado, nunca apresentado como custo real do lote)
  const comprasComPreco = compras.filter((c) => c.preco_rs_at && c.preco_rs_at > 0)
  if (comprasComPreco.length > 0) {
    const totalAt = comprasComPreco.reduce((acc, c) => {
      const at = (c.qtd_cabecas * (c.peso_medio || 0)) / 30
      return acc + (at > 0 ? at : 0)
    }, 0)
    const totalRs = comprasComPreco.reduce((acc, c) => acc + (c.valor_total || 0), 0)
    if (totalAt > 0) {
      return { custoRsAt: Number((totalRs / totalAt).toFixed(2)), origem: 'custo_medio' }
    }
  }

  return { custoRsAt: null, origem: 'desconhecido' }
}

/**
 * Margem real por lote vendido:
 *   margem R$ = (preço @ venda − preço @ compra) × @ vendidas
 *   margem % = margem R$ ÷ (preço @ compra × @ vendidas) × 100
 */
export function calcularMargemLote(
  precoVendaAt: number,
  custoCompraAt: number | null,
  arrobasVendidas: number,
): { margemRs: number | null; margemPct: number | null } {
  if (custoCompraAt === null || custoCompraAt <= 0 || arrobasVendidas <= 0) {
    return { margemRs: null, margemPct: null }
  }
  const margemRs = Number(((precoVendaAt - custoCompraAt) * arrobasVendidas).toFixed(2))
  const custoTotal = custoCompraAt * arrobasVendidas
  const margemPct = custoTotal > 0 ? Number(((margemRs / custoTotal) * 100).toFixed(1)) : null
  return { margemRs, margemPct }
}

// ------------------------------------------------------------------
// Compilação de linhas (Etapa 3 — Conferência)
// ------------------------------------------------------------------

export async function compilarLinhasVendaGado(
  rows: Record<string, any>[],
  mappings: ColunaCompraMapping[],
  cotacaoManual?: { preco: number } | null,
): Promise<ResultadoConferenciaVenda> {
  const [{ cotacao: cotacaoAuto, aviso: avisoAuto }] = await Promise.all([
    obterCotacaoReferenciaVenda(),
  ])

  let cotacao = cotacaoAuto
  let avisoCotacao = avisoAuto
  if (cotacaoManual && cotacaoManual.preco > 0) {
    cotacao = {
      preco: cotacaoManual.preco,
      dataReferencia: new Date().toISOString(),
      origem: 'manual',
      desatualizada: false,
      diasAtraso: 0,
    }
    avisoCotacao = null
  }

  const lotesExistentes: LotRecord[] = await getLots().catch(() => [])
  const linhas: LinhaVendaNormalizada[] = []

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]
    const conversoes: string[] = []
    const alertas: string[] = []

    const raw: Record<string, string> = {}
    mappings.forEach((m) => {
      if (m.campoDestino === 'ignorar') return
      const v = row[m.colunaOrigem]
      if (v === undefined || v === null || String(v).trim() === '') return
      raw[m.campoDestino] = String(v).trim()
    })

    const comprador = raw['comprador'] || ''
    const documento = raw['documento'] || ''
    const dataVenda = parseDataVenda(raw['data']) || new Date().toISOString().slice(0, 10)
    const loteNome = raw['lote_nome'] || ''
    const categoriaRaw = raw['categoria'] || ''
    const sexoRaw = raw['sexo'] || ''
    const frenteRaw = raw['frente'] || ''

    const qtdRaw = parseNumero(raw['qtd_cabecas'])
    const qtd = qtdRaw !== null ? Math.max(0, Math.round(qtdRaw)) : 0

    // Peso médio: @ vivo ×30, @ carcaça ×15, kg direto
    let pesoMedioKg: number | null = null
    let pesoVeioArrobas = false
    let pesoCarcaca = false
    if (raw['peso_medio_at_carcaca']) {
      const at = parseNumero(raw['peso_medio_at_carcaca'])
      if (at !== null && at > 0) {
        pesoVeioArrobas = true
        pesoCarcaca = true
        pesoMedioKg = at * 15
        conversoes.push(
          `${at} @ de carcaça convertidas para ${at * 15} kg (regra 1 @ carcaça = 15 kg)`,
        )
      }
    }
    if (pesoMedioKg === null && raw['peso_medio_at']) {
      const at = parseNumero(raw['peso_medio_at'])
      if (at !== null && at > 0) {
        pesoVeioArrobas = true
        pesoMedioKg = at * 30
        conversoes.push(`${at} @ convertidas para ${at * 30} kg (regra 1 @ vivo = 30 kg)`)
      }
    }
    if (pesoMedioKg === null && raw['peso_carcaca_kg']) {
      const kg = parseNumero(raw['peso_carcaca_kg'])
      if (kg !== null && kg > 0) {
        pesoCarcaca = true
        pesoMedioKg = kg
        conversoes.push('Peso de carcaça (kg) informado diretamente')
      }
    }
    if (pesoMedioKg === null && raw['peso_medio_kg']) {
      const kg = parseNumero(raw['peso_medio_kg'])
      if (kg !== null && kg > 0) pesoMedioKg = kg
    }
    if (pesoMedioKg !== null) {
      if (pesoMedioKg < 0) alertas.push(`Peso negativo (${pesoMedioKg} kg)`)
      else if (pesoMedioKg > 1200) alertas.push(`Peso atípico muito alto (${pesoMedioKg} kg)`)
      else if (pesoMedioKg < 60)
        alertas.push(`Peso muito baixo para gado adulto (${pesoMedioKg} kg)`)
    }

    // Preços
    let precoCab = parseNumero(raw['preco_rs_cab'])
    let precoAt = parseNumero(raw['preco_rs_at'])
    if (precoCab === null && precoAt !== null && pesoMedioKg && pesoMedioKg > 0) {
      precoCab = precoAt * (pesoMedioKg / 30)
      conversoes.push(
        `Preço por cabeça derivado: R$ ${precoAt.toFixed(2)}/@ × (${pesoMedioKg} kg ÷ 30) = R$ ${precoCab.toFixed(2)}`,
      )
    } else if (precoAt === null && precoCab !== null && pesoMedioKg && pesoMedioKg > 0) {
      precoAt = precoCab / (pesoMedioKg / 30)
      conversoes.push(
        `Preço por @ derivado: R$ ${precoCab.toFixed(2)} ÷ (${pesoMedioKg} kg ÷ 30) = R$ ${precoAt.toFixed(2)}/@`,
      )
    }
    if (precoCab !== null && precoCab < 0) alertas.push('Preço por cabeça negativo')
    if (precoAt !== null && precoAt < 0) alertas.push('Preço por @ negativo')
    if (precoAt !== null && precoAt > 900)
      alertas.push(`Preço por @ atípico (R$ ${precoAt.toFixed(2)}/@) — confira`)
    if (precoCab === null && precoAt === null) {
      alertas.push('Preço ausente: nem preço por cabeça nem por @ informado — impossível derivar')
    }

    const hoje = new Date().toISOString().slice(0, 10)
    if (dataVenda > hoje) alertas.push(`Data futura (${dataVenda})`)
    if (qtd <= 0) alertas.push('Quantidade zerada ou não informada')

    // Arrobas totais vendidas (peso vivo) = kg ÷ 30 × cabeças
    const arrobasTotais = pesoMedioKg && qtd > 0 ? Number(((pesoMedioKg * qtd) / 30).toFixed(2)) : 0

    // Receita
    let valorTotal = 0
    if (qtd > 0 && precoCab !== null) valorTotal = qtd * precoCab
    else if (arrobasTotais > 0 && precoAt !== null) valorTotal = arrobasTotais * precoAt

    // Ágio: (preço @ venda ÷ cotação vigente − 1) × 100
    let agioPct: number | null = null
    if (cotacao && cotacao.preco > 0 && precoAt !== null && precoAt > 0) {
      agioPct = Number(((precoAt / cotacao.preco - 1) * 100).toFixed(1))
    } else if (!cotacao) {
      alertas.push('Ágio não calculado: sem cotação de referência (informe manualmente)')
    }

    // Lote de origem
    let loteDestino: LotRecord | undefined
    if (loteNome) {
      loteDestino = lotesExistentes.find((l) => normalizar(l.name) === normalizar(loteNome))
    }
    if (!loteDestino) {
      alertas.push('Lote de origem não encontrado pelo nome — escolha o lote na conferência')
    }

    // Bloqueio: venda não pode tornar o lote negativo
    let bloqueada = false
    let motivoBloqueio: string | undefined
    if (loteDestino && qtd > 0 && qtd > loteDestino.headcount) {
      bloqueada = true
      motivoBloqueio = `A venda de ${qtd} cabeças supera o lote "${loteDestino.name}" (${loteDestino.headcount} cab.) — corrija a quantidade ou confirme a saída parcial`
    } else if (!loteDestino && qtd > 0) {
      bloqueada = true
      motivoBloqueio = 'Sem lote de origem definido — escolha o lote na conferência'
    }

    // Custo de origem e margem real
    const custoInfo = await obterCustoLote(loteDestino)
    if (custoInfo.origem === 'custo_medio') {
      alertas.push(
        `Lote sem compra registrada no Chicão — margem usa o custo médio de reposição (R$ ${custoInfo.custoRsAt?.toFixed(2)}/@)`,
      )
    } else if (custoInfo.origem === 'desconhecido') {
      alertas.push('Sem custo de origem disponível — margem não calculada (nada foi inventado)')
    }
    const { margemRs, margemPct } = calcularMargemLote(
      precoAt || 0,
      custoInfo.custoRsAt,
      arrobasTotais,
    )

    const acao: StatusLinhaVenda =
      qtd <= 0 || (precoCab === null && precoAt === null) || bloqueada ? 'ignorar' : 'atualizar'
    let motivoAcao = ''
    if (bloqueada) motivoAcao = motivoBloqueio || 'Linha bloqueada — corrija na conferência'
    else if (qtd <= 0 || (precoCab === null && precoAt === null))
      motivoAcao = 'Linha sem quantidade válida e sem preço derivável'
    else
      motivoAcao = `Lote "${loteDestino?.name || loteNome}" (${loteDestino?.headcount ?? 0} cab.) será DECREMENTADO em ${qtd} cabeças — não sobrescrito`

    const frenteCandidata = frenteRaw ? (frenteRaw.toLowerCase() as FrenteVenda) : undefined

    linhas.push({
      idTemp: `venda_${idx}_${Date.now()}`,
      linhaOrigem: idx + 1,
      dadosOriginais: row,
      dados: {
        lote_nome: loteNome || '',
        categoria: categoriaRaw ? normalizarCategoria(categoriaRaw) : '',
        sexo: sexoRaw ? normalizarSexo(sexoRaw) : 'macho',
        qtd_cabecas: qtd,
        peso_medio_kg: pesoMedioKg || 0,
        arrobas_totais: arrobasTotais,
        preco_rs_cab: precoCab || 0,
        preco_rs_at: precoAt || 0,
        valor_total: Number(valorTotal.toFixed(2)),
        comprador,
        documento,
        data: dataVenda,
        peso_arrobas_origem: pesoVeioArrobas,
        peso_carcaca: pesoCarcaca,
      },
      acao,
      motivoAcao,
      loteDestinoId: loteDestino?.id,
      loteCabecasExistentes: loteDestino?.headcount,
      bloqueada,
      motivoBloqueio,
      custoRsAt: custoInfo.custoRsAt,
      origemCusto: custoInfo.origem,
      margemRs,
      margemPct,
      agioPct,
      conversoes,
      alertas,
      ignoradoPeloUsuario: acao === 'ignorar',
      frenteEscolhida:
        frenteCandidata &&
        ['cria', 'recria', 'engorda', 'confinamento', 'arrendamento'].includes(frenteCandidata)
          ? frenteCandidata
          : undefined,
    })
  }

  const ativos = linhas.filter((l) => l.acao === 'atualizar' && !l.ignoradoPeloUsuario)
  const cabecasTotais = ativos.reduce((a, l) => a + l.dados.qtd_cabecas, 0)
  const pesoTotalKg = ativos.reduce((a, l) => a + l.dados.qtd_cabecas * l.dados.peso_medio_kg, 0)
  const arrobasTotais = ativos.reduce((a, l) => a + l.dados.arrobas_totais, 0)
  const receitaTotalRs = Number(ativos.reduce((a, l) => a + l.dados.valor_total, 0).toFixed(2))
  const precoMedioRsAt = arrobasTotais > 0 ? Number((receitaTotalRs / arrobasTotais).toFixed(2)) : 0
  const agiosValidos = ativos.map((l) => l.agioPct).filter((v): v is number => v !== null)
  const agioMedioPct =
    agiosValidos.length > 0
      ? Number((agiosValidos.reduce((a, b) => a + b, 0) / agiosValidos.length).toFixed(1))
      : null
  const margensValidas = ativos.filter((l) => l.margemRs !== null)
  const margemTotalRs =
    margensValidas.length > 0
      ? Number(margensValidas.reduce((a, l) => a + (l.margemRs || 0), 0).toFixed(2))
      : null
  const custoTotalOrigem = margensValidas.reduce(
    (a, l) => a + (l.custoRsAt || 0) * l.dados.arrobas_totais,
    0,
  )
  const margemPct =
    custoTotalOrigem > 0 && margemTotalRs !== null
      ? Number(((margemTotalRs / custoTotalOrigem) * 100).toFixed(1))
      : null

  const alertasGlobal: string[] = []
  if (!cotacao) {
    alertasGlobal.push(
      '⚠️ Cotação B3 ausente/desatualizada — informe o preço de referência manualmente na conferência',
    )
  } else if (cotacao.desatualizada) {
    alertasGlobal.push(
      `⚠️ Cotação B3 desatualizada (${cotacao.diasAtraso} dias) — confira o ágio calculado`,
    )
  }
  const bloqueadas = linhas.filter((l) => l.bloqueada).length
  if (bloqueadas > 0) {
    alertasGlobal.push(
      `🚫 ${bloqueadas} linha(s) bloqueada(s): a quantidade vendida supera o lote de origem — corrija ou confirme`,
    )
  }

  return {
    linhas,
    cotacao,
    avisoCotacao,
    resumo: {
      totalLidos: linhas.length,
      aAtualizar: ativos.length,
      aIgnorar: linhas.filter((l) => l.acao === 'ignorar' || l.ignoradoPeloUsuario).length,
      bloqueadas,
      cabecasTotais,
      pesoTotalKg: Number(pesoTotalKg.toFixed(1)),
      arrobasTotais: Number(arrobasTotais.toFixed(2)),
      receitaTotalRs,
      precoMedioRsAt,
      agioMedioPct,
      margemTotalRs,
      margemPct,
      conversoes: [],
      alertas: alertasGlobal,
    },
  }
}

// ------------------------------------------------------------------
// Aplicação (Etapa 4 — apenas após conferência aprovada)
// ------------------------------------------------------------------

export async function aplicarVendaGadoConfirmada(
  linhasValidadas: LinhaVendaNormalizada[],
  origemArquivo: { nome: string; formato: string },
  usuarioAtual: { id: string; nome: string; perfil: string },
  cotacaoUsada: ResultadoConferenciaVenda['cotacao'],
): Promise<ResultadoAplicacaoVenda> {
  const result: ResultadoAplicacaoVenda = {
    sucesso: true,
    totalLidos: linhasValidadas.length,
    atualizados: 0,
    ignorados: 0,
    detalhesIgnorados: [],
    entidadesAfetadas: [],
    timestamp: new Date().toISOString(),
    cotacaoOrigem: cotacaoUsada?.origem || 'nenhuma',
    cotacaoPreco: cotacaoUsada?.preco || null,
  }

  const itemsAudit: { criados: any[]; ignorados: { linha: number; motivo: string }[] } = {
    criados: [],
    ignorados: [],
  }

  let lotes: LotRecord[] = await getLots().catch(() => [])
  const decrementosNestaImportacao = new Map<string, number>()

  const ativos = linhasValidadas.filter((l) => l.acao === 'atualizar' && !l.ignoradoPeloUsuario)

  let cabecasTotais = 0
  let pesoTotalKg = 0
  let arrobasTotais = 0
  let receitaTotal = 0
  const agios: number[] = []
  const compradores = new Set<string>()

  for (const linha of ativos) {
    const { dados } = linha
    cabecasTotais += dados.qtd_cabecas
    pesoTotalKg += dados.qtd_cabecas * dados.peso_medio_kg
    arrobasTotais += dados.arrobas_totais
    receitaTotal += dados.valor_total
    if (dados.comprador) compradores.add(dados.comprador)
    if (linha.agioPct !== null) agios.push(linha.agioPct)

    const frente: FrenteVenda = linha.frenteEscolhida || 'engorda'

    try {
      // ------------------------------------------------------------
      // 1. LOTE: DECREMENTO (nunca negativo, nunca sobrescrito)
      // ------------------------------------------------------------
      const loteId = linha.loteDestinoId || ''
      const lote = lotes.find((l) => l.id === loteId)
      const jaDecrementado = decrementosNestaImportacao.get(loteId) || 0
      const cabAtuais = (lote?.headcount ?? linha.loteCabecasExistentes ?? 0) - jaDecrementado

      if (dados.qtd_cabecas > cabAtuais) {
        result.ignorados++
        const motivo = `Venda de ${dados.qtd_cabecas} cab. supera o lote "${lote?.name || loteId}" (${cabAtuais} cab. disponíveis) — linha bloqueada`
        result.detalhesIgnorados.push({ linha: linha.linhaOrigem, motivo })
        itemsAudit.ignorados.push({ linha: linha.linhaOrigem, motivo })
        continue
      }

      const novoTotal = cabAtuais - dados.qtd_cabecas
      await updateLot(loteId, {
        headcount: novoTotal,
        ...(novoTotal === 0 ? { status: 'sold' as const } : {}),
      })
      decrementosNestaImportacao.set(loteId, jaDecrementado + dados.qtd_cabecas)
      result.atualizados++
      itemsAudit.criados.push({
        tipo: 'lote',
        id: loteId,
        nome: lote?.name || '',
        cabecas_antes: cabAtuais,
        cabecas_depois: novoTotal,
        origem: `Venda de gado — ${dados.comprador || 'comprador não informado'} em ${dados.data}`,
      })
      if (!result.entidadesAfetadas.includes('Rebanho (Lotes)'))
        result.entidadesAfetadas.push('Rebanho (Lotes)')

      // ------------------------------------------------------------
      // 2. MOVIMENTAÇÃO DE REBANHO (saída tipo 'venda')
      // ------------------------------------------------------------
      await registrarMovimentacaoRebanho({
        data: dados.data,
        frente,
        lote_id: loteId || undefined,
        tipo: 'venda',
        qtd_cabecas: dados.qtd_cabecas,
        peso_total_kg: Number((dados.qtd_cabecas * dados.peso_medio_kg).toFixed(1)),
        valor_total_rs: dados.valor_total,
        documento: documentoTexto(dados, origemArquivo.nome),
        sexo: dados.sexo,
        observacoes: `Importado via Robô Chicão (${origemArquivo.nome}) — comprador: ${dados.comprador || 'não informado'}; preço R$ ${dados.preco_rs_at.toFixed(2)}/@; ágio ${linha.agioPct !== null ? `${linha.agioPct.toFixed(1)}%` : 's/ cotação'}`,
      })
      if (!result.entidadesAfetadas.includes('Movimentações de Rebanho'))
        result.entidadesAfetadas.push('Movimentações de Rebanho')

      // ------------------------------------------------------------
      // 3. VENDA na coleção do fechamento (vendas)
      // ------------------------------------------------------------
      const vendaRec = await registrarVendaGado({
        data: dados.data,
        lote_id: loteId || undefined,
        frente,
        sexo: dados.sexo,
        qtd_cabecas: dados.qtd_cabecas,
        peso_vivo_total: Number((dados.qtd_cabecas * dados.peso_medio_kg).toFixed(1)),
        preco_rs_at: dados.preco_rs_at || undefined,
        receita_total: dados.valor_total,
        comprador: dados.comprador || 'Não informado',
      })
      itemsAudit.criados.push({
        tipo: 'venda_gado',
        id: vendaRec.id,
        comprador: dados.comprador,
        qtd: dados.qtd_cabecas,
        receita_total: dados.valor_total,
        data: dados.data,
      })
      if (!result.entidadesAfetadas.includes('Vendas de Gado (Fechamento)'))
        result.entidadesAfetadas.push('Vendas de Gado (Fechamento)')

      // ------------------------------------------------------------
      // 4. LANÇAMENTO FINANCEIRO — RECEITA no centro de custo da frente
      // ------------------------------------------------------------
      const lanc = await registrarLancamentoFinanceiro({
        data: dados.data,
        centro_custo: frente as any,
        plano_contas: 'Venda de Gado',
        classificacao: 'desembolso',
        tipo: 'receita',
        valor: dados.valor_total,
        descricao: `Venda de ${dados.qtd_cabecas} cab. — comprador: ${dados.comprador || 'não informado'} — R$ ${dados.preco_rs_at ? dados.preco_rs_at.toFixed(2) : '—'}/@ — ágio ${linha.agioPct !== null ? `${linha.agioPct.toFixed(1)}%` : 's/ cotação'} — doc: ${documentoTexto(dados, origemArquivo.nome)}`,
        lote_id: loteId || undefined,
      })
      itemsAudit.criados.push({
        tipo: 'lancamento_financeiro',
        id: lanc.id,
        centro_custo: frente,
        valor: dados.valor_total,
        data: dados.data,
      })
      if (!result.entidadesAfetadas.includes('Financeiro (Centro de Custo)'))
        result.entidadesAfetadas.push('Financeiro (Centro de Custo)')
    } catch (err: any) {
      console.warn('Erro ao aplicar linha de venda da planilha:', err)
      result.ignorados++
      const motivo = `Erro de gravação: ${err?.message || 'falha ao salvar'}`
      result.detalhesIgnorados.push({ linha: linha.linhaOrigem, motivo })
      itemsAudit.ignorados.push({ linha: linha.linhaOrigem, motivo })
    }
  }

  linhasValidadas
    .filter((l) => l.acao === 'ignorar' || l.ignoradoPeloUsuario)
    .forEach((l) => {
      result.ignorados++
      result.detalhesIgnorados.push({
        linha: l.linhaOrigem,
        motivo: l.motivoAcao || 'Ignorado pelo usuário na conferência',
      })
      itemsAudit.ignorados.push({
        linha: l.linhaOrigem,
        motivo: l.motivoAcao || 'Ignorado pelo usuário na conferência',
      })
    })

  result.sucesso = result.atualizados > 0 || result.ignorados === linhasValidadas.length

  // ------------------------------------------------------------
  // 5. TRILHA DE AUDITORIA (append-only)
  // ------------------------------------------------------------
  const audit = await registrarAuditLog({
    tipo_evento: 'criacao',
    usuario_id: usuarioAtual.id,
    usuario_nome: usuarioAtual.nome,
    perfil: usuarioAtual.perfil,
    origem: 'online',
    referencia_tipo: 'maestro_venda_gado',
    motivo:
      `Robô Chicão importou ${linhasValidadas.length} linhas de VENDA DE GADO do arquivo "${origemArquivo.nome}". ` +
      `Aplicados: ${result.atualizados}, Ignorados: ${result.ignorados}. ` +
      `Comprador(es): ${Array.from(compradores).join(', ') || 'não informado'}. ` +
      `Total: ${cabecasTotais} cabeças / ${arrobasTotais.toFixed(2)} @ / R$ ${receitaTotal.toFixed(2)}. ` +
      `Ágio médio: ${agios.length > 0 ? `${(agios.reduce((a, b) => a + b, 0) / agios.length).toFixed(1)}%` : 'não calculado'} ` +
      `com cotação ${cotacaoUsada ? (cotacaoUsada.origem === 'b3_vigente' ? 'B3 vigente' : 'manual') : 'ausente'} de R$ ${cotacaoUsada?.preco?.toFixed(2) ?? '—'}/@.`,
    payload_antes: {
      arquivo_nome: origemArquivo.nome,
      arquivo_formato: origemArquivo.formato,
      compradores: Array.from(compradores),
      documentos: Array.from(new Set(ativos.map((l) => l.dados.documento).filter(Boolean))),
      total_lidos: linhasValidadas.length,
    },
    payload_depois: {
      criados: itemsAudit.criados,
      ignorados: itemsAudit.ignorados,
      entidadesAfetadas: result.entidadesAfetadas,
      totais: {
        cabecas: cabecasTotais,
        arrobas: Number(arrobasTotais.toFixed(2)),
        receita_rs: Number(receitaTotal.toFixed(2)),
        preco_medio_rs_at:
          arrobasTotais > 0 ? Number((receitaTotal / arrobasTotais).toFixed(2)) : 0,
        agio_medio_pct:
          agios.length > 0
            ? Number((agios.reduce((a, b) => a + b, 0) / agios.length).toFixed(1))
            : null,
      },
      cotacao_referencia: cotacaoUsada
        ? {
            origem: cotacaoUsada.origem,
            preco: cotacaoUsada.preco,
            data: cotacaoUsada.dataReferencia,
          }
        : null,
    },
  })
  if (audit) result.protocoloAuditId = audit.evento_id

  // ------------------------------------------------------------
  // 6. REGISTRO CONSOLIDADO (maestro_vendas_gado — append-only)
  // ------------------------------------------------------------
  try {
    await pb.collection('maestro_vendas_gado').create({
      arquivo_nome: origemArquivo.nome,
      formato: origemArquivo.formato,
      comprador: Array.from(compradores).join(', ') || 'Não informado',
      data_venda: ativos[0]?.dados.data || new Date().toISOString().slice(0, 10),
      frente: ativos[0]?.frenteEscolhida || 'engorda',
      total_registros_lidos: linhasValidadas.length,
      total_criados: 0,
      total_atualizados: result.atualizados,
      total_ignorados: result.ignorados,
      total_cabecas: cabecasTotais,
      peso_total_kg: Number(pesoTotalKg.toFixed(1)),
      arrobas_totais: Number(arrobasTotais.toFixed(2)),
      receita_total_rs: Number(receitaTotal.toFixed(2)),
      preco_medio_rs_at: arrobasTotais > 0 ? Number((receitaTotal / arrobasTotais).toFixed(2)) : 0,
      agio_medio_pct:
        agios.length > 0
          ? Number((agios.reduce((a, b) => a + b, 0) / agios.length).toFixed(1))
          : null,
      cotacao_origem: cotacaoUsada?.origem || 'manual',
      cotacao_preco_rs: cotacaoUsada?.preco || null,
      cotacao_data_referencia: cotacaoUsada?.dataReferencia || '',
      cotacao_desatualizada: Boolean(cotacaoUsada?.desatualizada),
      linhas: linhasValidadas.map((l) => ({
        linha: l.linhaOrigem,
        acao: l.acao,
        dados: l.dados,
        agio_pct: l.agioPct,
        margem_rs: l.margemRs,
        margem_pct: l.margemPct,
        custo_rs_at: l.custoRsAt,
        origem_custo: l.origemCusto,
        frente: l.frenteEscolhida || null,
        motivo: l.motivoAcao,
        conversoes: l.conversoes,
        alertas: l.alertas,
      })),
      protocolo_audit_id: audit?.evento_id || '',
      usuario_id: usuarioAtual.id,
      usuario_nome: usuarioAtual.nome,
      perfil: usuarioAtual.perfil,
      timestamp_dispositivo: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('Erro ao gravar registro consolidado em maestro_vendas_gado:', err)
  }

  return result
}

function documentoTexto(dados: LinhaVendaNormalizada['dados'], fallback: string): string {
  return dados.documento || fallback
}

// ------------------------------------------------------------------
// Relatório PDF e exportação (Etapa 5)
// ------------------------------------------------------------------

export function gerarRelatorioVendaGadoPDF(
  aplicacaoResult: ResultadoAplicacaoVenda,
  origemArquivo: { nome: string; formato: string },
  linhas: LinhaVendaNormalizada[],
  usuarioNome: string,
  cotacaoUsada: ResultadoConferenciaVenda['cotacao'],
) {
  const doc = new jsPDF()

  doc.setFillColor(24, 76, 44)
  doc.rect(0, 0, 210, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PECUÁRIA F3 - ROBÔ CHICÃO', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório Oficial de Ingestão — VENDA DE GADO', 14, 18)

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(10)
  doc.text(`Arquivo de Origem: ${origemArquivo.nome} (${origemArquivo.formato})`, 14, 32)
  doc.text(`Responsável pela Aprovação: ${usuarioNome}`, 14, 38)
  doc.text(`Data / Horário: ${new Date(aplicacaoResult.timestamp).toLocaleString('pt-BR')}`, 14, 44)
  if (aplicacaoResult.protocoloAuditId) {
    doc.text(`Protocolo de Auditoria (append-only): ${aplicacaoResult.protocoloAuditId}`, 14, 50)
  }

  const cotaTxt = cotacaoUsada
    ? `R$ ${cotacaoUsada.preco.toFixed(2)}/@ (${cotacaoUsada.origem === 'b3_vigente' ? 'B3 vigente' : 'manual'}, ${new Date(cotacaoUsada.dataReferencia).toLocaleDateString('pt-BR')})`
    : 'Sem cotação — ágio não calculado'
  doc.setFontSize(9)
  doc.text(`Cotação de referência do ágio: ${cotaTxt}`, 14, 56)

  autoTable(doc, {
    startY: 62,
    head: [['Total Lido', 'Saídas Aplicadas', 'Ignorados', 'Status']],
    body: [
      [
        String(aplicacaoResult.totalLidos),
        String(aplicacaoResult.atualizados),
        String(aplicacaoResult.ignorados),
        aplicacaoResult.sucesso ? 'Sucesso / Aplicado' : 'Falha Parcial',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [40, 90, 50] },
  })

  const tableData = linhas.map((l) => [
    String(l.linhaOrigem),
    l.acao.toUpperCase(),
    `${l.dados.qtd_cabecas} cab.`,
    `${l.dados.peso_medio_kg} kg (${l.dados.arrobas_totais} @)`,
    l.dados.preco_rs_at ? `R$ ${l.dados.preco_rs_at.toFixed(2)}/@` : '-',
    l.custoRsAt !== null ? `R$ ${l.custoRsAt.toFixed(2)}/@ (${l.origemCusto})` : '-',
    l.margemRs !== null ? `R$ ${l.margemRs.toFixed(2)}` : '-',
    l.agioPct !== null ? `${l.agioPct.toFixed(1)}%` : 's/ cotação',
    l.dados.comprador || '-',
    l.dados.documento || '-',
    l.dados.data,
    l.alertas.join('; ') || (l.ignoradoPeloUsuario ? 'Ignorado manual' : 'OK'),
  ])

  autoTable(doc, {
    startY: (doc as any).lastAutoTable!.finalY + 8,
    head: [
      [
        'Linha',
        'Ação',
        'Cabeças',
        'Peso',
        'R$/@ Venda',
        'R$/@ Custo',
        'Margem R$',
        'Ágio',
        'Comprador',
        'Documento',
        'Data',
        'Alertas',
      ],
    ],
    body: tableData.slice(0, 100),
    theme: 'striped',
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: { fillColor: [24, 76, 44] },
  })

  doc.save(`relatorio_chicao_venda_gado_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportarVendaGadoExcel(linhas: LinhaVendaNormalizada[], filename: string) {
  const dados = linhas.map((l) => ({
    Linha: l.linhaOrigem,
    Ação: l.acao,
    Aplicado: l.ignoradoPeloUsuario ? 'NÃO' : 'SIM',
    Lote: l.dados.lote_nome || '(não identificado)',
    Categoria: l.dados.categoria,
    Sexo: l.dados.sexo,
    'Qtd (cabeças)': l.dados.qtd_cabecas,
    'Peso médio (kg)': l.dados.peso_medio_kg,
    'Arrobas (@)': l.dados.arrobas_totais,
    'Preço R$/cabeça': l.dados.preco_rs_cab,
    'Preço R$/@ venda': l.dados.preco_rs_at,
    'Custo R$/@ origem': l.custoRsAt ?? 's/ custo',
    'Origem do custo': l.origemCusto,
    'Margem (R$)': l.margemRs ?? 's/ custo',
    'Margem (%)': l.margemPct ?? 's/ custo',
    'Ágio (%)': l.agioPct !== null ? l.agioPct : 's/ cotação',
    Comprador: l.dados.comprador,
    Documento: l.dados.documento,
    'Data da venda': l.dados.data,
    'Frente/Centro de Custo': l.frenteEscolhida || '',
    Conversões: l.conversoes.join(' | '),
    Alertas: l.alertas.join(' | '),
    Motivo: l.motivoAcao,
  }))
  downloadExcel(dados, filename)
}

// ------------------------------------------------------------------
// Modelo oficial (.xlsx) — "Modelo Venda de Gado"
// ------------------------------------------------------------------

export function baixarModeloVendaGadoXlsx() {
  const hoje = new Date().toISOString().slice(0, 10)
  const dados = [
    {
      Quantidade: 40,
      'Peso Médio': '15 @',
      'Preço por Cabeça': 4350,
      'Preço por @': '—',
      Comprador: 'Frigorífico Vale Verde S/A',
      Documento: 'NF 1234',
      'Data da Venda': hoje,
      'Lote Origem': 'Lote Compra Engorda B',
      Categoria: 'Boi',
      Sexo: 'Macho',
      Frente: 'engorda',
      Observações:
        'Peso em @ vivo: 15 @ × 30 kg = 450 kg. Preço/@ derivado se apenas cabeça informado.',
    },
    {
      Quantidade: 25,
      'Peso Médio': '420 kg',
      'Preço por Cabeça': '—',
      'Preço por @': 300,
      Comprador: 'Comercial Bovino Central',
      Documento: 'NF 1235',
      'Data da Venda': hoje,
      'Lote Origem': 'Lote Compra Recria A',
      Categoria: 'Garrote',
      Sexo: 'Macho',
      Frente: 'recria',
      Observações: 'Preço por cabeça derivado de R$/@ × (kg ÷ 30).',
    },
  ]
  downloadExcel(dados, 'modelo_oficial_venda_de_gado')
}

// ------------------------------------------------------------------
// Exemplo rápido (banco zerado de dados operacionais)
// ------------------------------------------------------------------

export function gerarExemploRapidoVendaGado(): File {
  const hoje = new Date().toISOString().slice(0, 10)
  const csvExemplo = `Quantidade;Peso Médio;Preço por Cabeça;Preço por @;Comprador;Documento;Data da Venda;Lote Origem;Categoria;Sexo;Frente
40;15 @;4350;;Frigorífico Vale Verde S/A;NF 1234;${hoje};Lote Compra Engorda B;Boi;Macho;engorda
25;420 kg;;300;Comercial Bovino Central;NF 1235;${hoje};Lote Compra Recria A;Garrote;Macho;recria
10;16 @;3080;;Atacado Carnes Sul;NF 1236;${hoje};;Novilho;Macho;engorda`
  const blob = new Blob([csvExemplo], { type: 'text/csv' })
  return new File([blob], 'exemplo_venda_de_gado.csv', { type: 'text/csv' })
}

// ------------------------------------------------------------------
// Comprovante de WhatsApp (mensagem copiável)
// ------------------------------------------------------------------

export function gerarMensagemWhatsAppVenda(
  linhas: LinhaVendaNormalizada[],
  protocolo?: string,
): string {
  const ativos = linhas.filter((l) => l.acao === 'atualizar' && !l.ignoradoPeloUsuario)
  if (ativos.length === 0) return ''
  const cabecas = ativos.reduce((a, l) => a + l.dados.qtd_cabecas, 0)
  const arrobas = ativos.reduce((a, l) => a + l.dados.arrobas_totais, 0)
  const receita = ativos.reduce((a, l) => a + l.dados.valor_total, 0)
  const linhasTxt = ativos
    .map(
      (l) =>
        `• ${l.dados.qtd_cabecas} cab. — ${l.dados.arrobas_totais} @ — R$ ${l.dados.valor_total.toFixed(2)} — ${l.dados.comprador || 'comprador s/ info'}${l.dados.documento ? ` (doc ${l.dados.documento})` : ''}`,
    )
    .join('\n')
  return (
    `PECUÁRIA F3 — Venda de Gado (Robô Chicão)\n` +
    `${linhasTxt}\n` +
    `Total: ${cabecas} cabeças / ${arrobas.toFixed(2)} @ / R$ ${receita.toFixed(2)}\n` +
    (protocolo ? `Protocolo de auditoria: ${protocolo}\n` : '') +
    `Lançado via conferência do Robô Chicão.`
  )
}
