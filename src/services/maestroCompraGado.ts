/**
 * Serviço do Robô Maestro — Ingestão de COMPRA DE GADO
 *
 * Regras Pecuárias Integradas (invioláveis):
 * - 1 @ de peso vivo = 30 kg; 1 @ de carcaça = 15 kg
 * - peso em @ de carcaça = (peso vivo × % rendimento de carcaça) ÷ 15
 * - GMD é sempre kg/dia (nunca g/dia)
 *
 * Fluxo estrito do Maestro em 5 etapas:
 *   1. Leitura → 2. Mapeamento → 3. Conferência (OBRIGATÓRIA) → 4. Aplicação → 5. Relatório
 * Nenhuma linha é gravada no banco sem passar pela conferência do usuário.
 *
 * Integração (sem estruturas paralelas):
 * - Rebanho: coleção `lots` (cria/atualiza lote, incrementa headcount)
 * - Movimentação: `movimentacoes_rebanho` tipo 'compra' (entrada)
 * - Financeiro: `lancamentos_financeiros` no centro de custo da frente
 * - Compra: `compras_gado` (coleção existente do fechamento)
 * - Auditoria: `audit_log` append-only (via serviços/auditoria.ts)
 * - Cotação: `market_prices` B3 (via services/market.ts)
 * - Ágio: benchmark `config_benchmark.codigo = 'preco_arroba_compra_benchmark'` quando existir
 *
 * Auditoria: APPEND-ONLY — correção nunca é edição; exclusão é sempre lógica.
 */

import pb from '@/lib/pocketbase/client'
import { getLots, updateLot, createLot, LotRecord } from './lots'
import {
  registrarMovimentacaoRebanho,
  registrarLancamentoFinanceiro,
  registrarCompraGado,
} from './fechamento'
import { getCotacaoB3BoiGordoVigente } from './market'
import { getConfigBenchmarks, ConfigBenchmarkRecord } from './configBenchmark'
import { registrarAuditLog } from './auditoria'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { downloadExcel } from '@/lib/exportUtils'

// ------------------------------------------------------------------
// Tipos públicos
// ------------------------------------------------------------------

export type FrenteCompra = 'cria' | 'recria' | 'engorda' | 'confinamento' | 'arrendamento'

export type StatusLinhaCompra = 'criar' | 'atualizar' | 'ignorar'

export interface LinhaCompraNormalizada {
  idTemp: string
  linhaOrigem: number
  /** valores crus da planilha */
  dadosOriginais: Record<string, any>
  /** valores normalizados (kg, R$/@, R$/cabeça, datas ISO...) */
  dados: {
    lote_nome: string
    categoria: string
    sexo: 'macho' | 'femea'
    pasto_destino: string
    qtd_cabecas: number
    peso_medio_kg: number
    arrobas_totais: number // peso vivo em @ (kg ÷ 30 × cabeças)
    preco_rs_cab: number
    preco_rs_at: number
    valor_total: number
    fornecedor: string
    data: string // YYYY-MM-DD
    peso_arrobas_origem: boolean // veio em @ na planilha
  }
  acao: StatusLinhaCompra
  motivoAcao: string
  loteExistenteId?: string
  /** lote já existia: quantidade será INCREMENTADA (nunca sobrescrita) */
  loteExistenteCabecas?: number
  loteExistentePesoMedio?: number
  /** novo peso médio combinado (média ponderada) quando lote já existe */
  pesoMedioCombinado?: number
  agioPct: number | null
  conversoes: string[]
  alertas: string[]
  ignoradoPeloUsuario: boolean
  /** centro de custo / frente escolhido pelo usuário na conferência */
  frenteEscolhida?: FrenteCompra
}

export interface CotacaoReferencia {
  preco: number
  dataReferencia: string
  origem: 'b3_vigente' | 'manual'
  desatualizada: boolean
  diasAtraso: number
}

export interface BenchmarkPrecoAt {
  existe: boolean
  precoReferencia?: number // valor_referencia do benchmark (R$/@)
  precoMedia?: number
  precoTop?: number
}

export interface ResultadoConferenciaCompra {
  linhas: LinhaCompraNormalizada[]
  cotacao: CotacaoReferencia | null
  avisoCotacao: string | null
  benchmark: BenchmarkPrecoAt
  resumo: {
    totalLidos: number
    aCriar: number
    aAtualizar: number
    aIgnorar: number
    cabecasTotais: number
    pesoTotalKg: number
    arrobasTotais: number
    investimentoTotalRs: number
    precoMedioRsAt: number
    agioMedioPct: number | null
    conversoes: string[]
    alertas: string[]
  }
}

export interface ResultadoAplicacaoCompra {
  sucesso: boolean
  totalLidos: number
  criados: number
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
// Sinônimos de cabeçalho para documentos de COMPRA DE GADO
// ------------------------------------------------------------------

const SINONIMOS_COMPRA: Record<string, string> = {
  // quantidade de cabeças
  quantidade: 'qtd_cabecas',
  cabecas: 'qtd_cabecas',
  qtd: 'qtd_cabecas',
  'quantidade de cabecas': 'qtd_cabecas',
  'qtd cabecas': 'qtd_cabecas',
  'n cabecas': 'qtd_cabecas',
  'nº de cabecas': 'qtd_cabecas',

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

  // fornecedor / vendedor
  fornecedor: 'fornecedor',
  vendedor: 'fornecedor',
  origem: 'fornecedor',
  'fornecedor / vendedor': 'fornecedor',

  // data
  'data da compra': 'data',
  data: 'data',
  entrada: 'data',
  'data de entrada': 'data',

  // lote
  lote: 'lote_nome',
  'nome do lote': 'lote_nome',
  'lote destino': 'lote_nome',

  // categoria e sexo (mesmo vocabulário do fluxo de animais)
  categoria: 'categoria',
  'faixa etaria': 'categoria',
  sexo: 'sexo',
  genero: 'sexo',

  // destino (frente / pasto)
  pasto: 'pasto_destino',
  piquete: 'pasto_destino',
  frente: 'pasto_destino',
  'frente destino': 'pasto_destino',
  destino: 'pasto_destino',
}

export interface ColunaCompraMapping {
  colunaOrigem: string
  campoDestino: string
  confianca: number
}

/** Normaliza texto para busca de sinônimos (sem acento, minúsculo) */
function normalizar(str: string): string {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Reconhece cabeçalhos de planilha/PDF/DOCX de compra de gado.
 * Pelo menos UM dos dois preços deve ser identificável.
 */
export function reconhecerColunasCompraGado(headers: string[]): ColunaCompraMapping[] {
  return headers.map((header) => {
    const norm = normalizar(header)

    // Match exato
    if (SINONIMOS_COMPRA[norm]) {
      return { colunaOrigem: header, campoDestino: SINONIMOS_COMPRA[norm], confianca: 95 }
    }
    // Match parcial (contém)
    for (const [key, campo] of Object.entries(SINONIMOS_COMPRA)) {
      if (norm.includes(key) || key.includes(norm)) {
        return { colunaOrigem: header, campoDestino: campo, confianca: 80 }
      }
    }
    return { colunaOrigem: header, campoDestino: 'ignorar', confianca: 30 }
  })
}

/**
 * Valida se um documento foi reconhecido como compra de gado
 * (quantidade OU peso OU preço presente — suficiente para fluxo)
 */
export function isDocumentoCompraGado(mappings: ColunaCompraMapping[]): boolean {
  const campos = new Set(mappings.map((m) => m.campoDestino))
  const temEssenciais =
    campos.has('qtd_cabecas') ||
    campos.has('peso_medio_kg') ||
    campos.has('peso_medio_at') ||
    campos.has('preco_rs_cab') ||
    campos.has('preco_rs_at')
  return temEssenciais
}

// ------------------------------------------------------------------
// Parsing de valores
// ------------------------------------------------------------------

function parseNumero(val: any): number | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  if (!s) return null
  // Remove R$, @, kg, espaços e separadores de milhar pt-BR
  let cleaned = s.replace(/r\$|@|kg|reais|s/gi, '').trim()
  // Formato "1.234,56" → "1234.56"
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.')
  }
  const num = parseFloat(cleaned.replace(/[^\d.-]/g, ''))
  return isNaN(num) ? null : num
}

function parseDataCompra(val: any): string | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  if (!s) return null
  // ISO já
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // dd/mm/yyyy ou d/m/yy
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
  // "12-mar", "12 de março" etc — não inventa
  const dt = new Date(s)
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
  return null
}

function normalizarCategoria(raw: string): string {
  const c = normalizar(raw)
  if (c.includes('bezerro') || c.includes('bezerra') || c.includes('bezerros'))
    return 'Bezerros (0-12m)'
  if (c.includes('garrote') || c.includes('garrotes')) return 'Recria (12-24m)'
  if (c.includes('novilho') || c.includes('novilha') || c.includes('novilhos'))
    return 'Recria (12-24m)'
  if (c.includes('boi') || c.includes('vaca') || c.includes('touro')) return 'Engorda (>24m)'
  if (c.includes('matriz')) return 'Engorda (>24m)'
  return raw.trim()
}

function normalizarSexo(raw: string): 'macho' | 'femea' {
  const s = normalizar(raw)
  if (s.startsWith('f') || s.includes('femea') || s.includes('vaca') || s.includes('novilha'))
    return 'femea'
  return 'macho'
}

/** Detecta frentes a partir de texto livre (pasto/destino) */
function detectarFrenteDoTexto(texto: string): FrenteCompra | null {
  const t = normalizar(texto)
  if (!t) return null
  if (t.includes('confin') || t.includes('curral engorda') || t.includes('cocho'))
    return 'confinamento'
  if (t.includes('arrend') || t.includes('arrendada')) return 'arrendamento'
  if (t.includes('recria')) return 'recria'
  if (t.includes('engorda')) return 'engorda'
  if (t.includes('cria') || t.includes('matriz') || t.includes('bezerro')) return 'cria'
  return null
}

// ------------------------------------------------------------------
// Cotação B3 vigente e benchmark de preço/@
// ------------------------------------------------------------------

/**
 * Busca a cotação B3 vigente do boi gordo registrada no sistema.
 * Se ausente ou desatualizada (> 7 dias), retorna aviso e NÃO inventa preço.
 * O usuário pode informar manualmente o preço de referência na conferência.
 */
export async function obterCotacaoReferenciaCompra(): Promise<{
  cotacao: CotacaoReferencia | null
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
          ? `Cotação B3 do boi gordo desatualizada (${c.diasAtraso} dias desde a referência de ${new Date(c.dataReferencia).toLocaleDateString('pt-BR')}). Informe manualmente o preço de referência na conferência se preferir — nenhum preço será inventado.`
          : null,
      }
    }
    if (c && c.origem === 'fallback' && c.preco > 0) {
      // Fallback do serviço de mercado: ainda é um valor registrável, mas sinalizamos
      return {
        cotacao: {
          preco: c.preco,
          dataReferencia: c.dataReferencia,
          origem: 'b3_vigente',
          desatualizada: false,
          diasAtraso: 0,
        },
        aviso:
          'Cotação B3 do boi gordo não encontrada nas tabelas registradas. Valor de fallback usado é uma referência genérica — informe manualmente o preço de referência na conferência.',
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

/**
 * Procura benchmark de preço/@ de compra no config_benchmark.
 * Se não existir, usa faixas simples (≤ 0% verde, 0–10% amarelo, >10% vermelho).
 */
export async function obterBenchmarkPrecoArrobaCompra(): Promise<BenchmarkPrecoAt> {
  try {
    const benchmarks: ConfigBenchmarkRecord[] = await getConfigBenchmarks()
    const alvo = benchmarks.find(
      (b) =>
        b.codigo === 'preco_arroba_compra_benchmark' ||
        b.codigo === 'preco_arroba_benchmark' ||
        (b.unidade === 'R$ / @' && normalizar(b.indicador).includes('compra')),
    )
    if (alvo) {
      return {
        existe: true,
        precoReferencia: alvo.valor_referencia,
        precoMedia: alvo.valor_media,
        precoTop: alvo.valor_top,
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar benchmark de preço de compra:', err)
  }
  return { existe: false }
}

/** Semáforo do ágio — usa benchmark se existir, senão faixas simples */
export function classificarAgioCompra(
  agioPct: number,
  benchmark: BenchmarkPrecoAt,
): { cor: 'verde' | 'amarelo' | 'vermelho'; label: string } {
  if (benchmark.existe && benchmark.precoReferencia && benchmark.precoTop) {
    // Com benchmark: compara preço/@ pago vs referência e top do benchmark
    // agio negativo (compra com desconto) → verde
    // agio entre 0 e distância até "top" → amarelo
    // acima do top → vermelho
    const topPct =
      ((benchmark.precoTop - benchmark.precoReferencia) /
        Math.max(benchmark.precoReferencia, 0.01)) *
      100
    if (agioPct <= 0) return { cor: 'verde', label: 'Compra com desconto/bom preço' }
    if (agioPct <= Math.max(topPct, 10)) return { cor: 'amarelo', label: 'Ágio moderado' }
    return { cor: 'vermelho', label: 'Ágio alto' }
  }
  if (agioPct <= 0) return { cor: 'verde', label: 'Compra com desconto/ágio baixo' }
  if (agioPct <= 10) return { cor: 'amarelo', label: 'Ágio moderado' }
  return { cor: 'vermelho', label: 'Ágio alto' }
}

// ------------------------------------------------------------------
// Compilação de linhas (Etapa 3 — Conferência)
// ------------------------------------------------------------------

/**
 * Compila as linhas da planilha em registros de compra de gado normalizados.
 * - Converte @ vivo → kg (× 30) explicitamente
 * - Deriva preço/@ ↔ preço/cabeça quando apenas um vem informado (mostra a derivação)
 * - Calcula o ágio: (preço @ compra ÷ preço @ venda vigente − 1) × 100
 * - Detecta lote existente (por nome/código + categoria/sexo/pasto) e sugere atualização INCREMENTANDO cabeças
 * - Agrupa por fornecedor+data quando múltiplas linhas compartilham
 */
export async function compilarLinhasCompraGado(
  rows: Record<string, any>[],
  mappings: ColunaCompraMapping[],
  cotacaoManual?: { preco: number } | null,
): Promise<ResultadoConferenciaCompra> {
  const [{ cotacao: cotacaoAuto, aviso: avisoAuto }, benchmark] = await Promise.all([
    obterCotacaoReferenciaCompra(),
    obterBenchmarkPrecoArrobaCompra(),
  ])

  // Prioriza manual se informado
  let cotacao: CotacaoReferencia | null = cotacaoAuto
  let avisoCotacao: string | null = avisoAuto
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
  const linhas: LinhaCompraNormalizada[] = []

  rows.forEach((row, idx) => {
    const conversoes: string[] = []
    const alertas: string[] = []

    // Extração bruta por campo destino
    const raw: Record<string, string> = {}
    mappings.forEach((m) => {
      if (m.campoDestino === 'ignorar') return
      const v = row[m.colunaOrigem]
      if (v === undefined || v === null || String(v).trim() === '') return
      raw[m.campoDestino] = String(v).trim()
    })

    const fornecedor = raw['fornecedor'] || ''
    const dataCompra = parseDataCompra(raw['data']) || new Date().toISOString().slice(0, 10)
    const loteNome = raw['lote_nome'] || ''
    const pastoDestino = raw['pasto_destino'] || ''
    const categoriaRaw = raw['categoria'] || ''
    const sexoRaw = raw['sexo'] || ''

    // Quantidade
    const qtdRaw = parseNumero(raw['qtd_cabecas'])
    const qtd = qtdRaw !== null ? Math.max(0, Math.round(qtdRaw)) : 0

    // Peso médio em kg (ou em @ → × 30)
    let pesoMedioKg: number | null = null
    let pesoVeioArrobas = false
    if (raw['peso_medio_at']) {
      const at = parseNumero(raw['peso_medio_at'])
      if (at !== null && at > 0) {
        pesoVeioArrobas = true
        pesoMedioKg = at * 30
        conversoes.push(`${at} @ convertidas para ${at * 30} kg (regra 1 @ vivo = 30 kg)`)
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
    let derivacaoPreco: string | null = null
    if (precoCab === null && precoAt !== null && pesoMedioKg && pesoMedioKg > 0) {
      precoCab = precoAt * (pesoMedioKg / 30)
      derivacaoPreco = `Preço por cabeça derivado: R$ ${precoAt.toFixed(2)}/@ × (${pesoMedioKg} kg ÷ 30) = R$ ${precoCab.toFixed(2)}`
      conversoes.push(derivacaoPreco)
    } else if (precoAt === null && precoCab !== null && pesoMedioKg && pesoMedioKg > 0) {
      precoAt = precoCab / (pesoMedioKg / 30)
      derivacaoPreco = `Preço por @ derivado: R$ ${precoCab.toFixed(2)} ÷ (${pesoMedioKg} kg ÷ 30) = R$ ${precoAt.toFixed(2)}/@`
      conversoes.push(derivacaoPreco)
    }
    if (precoCab !== null && precoCab < 0) alertas.push(`Preço por cabeça negativo`)
    if (precoAt !== null && precoAt < 0) alertas.push(`Preço por @ negativo`)
    if (precoAt !== null && precoAt > 900)
      alertas.push(`Preço por @ atípico (R$ ${precoAt.toFixed(2)}/@) — confira`)
    if (precoCab === null && precoAt === null) {
      alertas.push('Preço ausente: nem preço por cabeça nem por @ informado — impossível derivar')
    }

    // Data futura
    const hoje = new Date().toISOString().slice(0, 10)
    if (dataCompra > hoje) alertas.push(`Data futura (${dataCompra})`)
    if (qtd <= 0 && pesoMedioKg === null && precoCab === null && precoAt === null) {
      alertas.push('Quantidade zerada e sem preço/peso — linha não aplicável')
    } else if (qtd <= 0) {
      alertas.push('Quantidade zerada ou não informada')
    }

    // Arrobas totais (peso vivo) = kg ÷ 30 × cabeças
    const arrobasTotais = pesoMedioKg && qtd > 0 ? Number(((pesoMedioKg * qtd) / 30).toFixed(2)) : 0

    // Valor total (R$): quantidade × preço por cabeça (ou equivalente via @)
    let valorTotal = 0
    if (qtd > 0 && precoCab !== null) valorTotal = qtd * precoCab
    else if (arrobasTotais > 0 && precoAt !== null) valorTotal = arrobasTotais * precoAt

    // Ágio: (preço @ compra ÷ preço @ venda vigente − 1) × 100
    let agioPct: number | null = null
    if (cotacao && cotacao.preco > 0 && precoAt !== null && precoAt > 0) {
      agioPct = Number(((precoAt / cotacao.preco - 1) * 100).toFixed(1))
    } else if (!cotacao) {
      alertas.push('Ágio não calculado: sem cotação de referência (informe manualmente)')
    }

    // Correspondência de lote existente (por nome/código; se veio categoria/sexo, refina)
    let loteExistente: LotRecord | undefined
    if (loteNome) {
      loteExistente = lotesExistentes.find((l) => normalizar(l.name) === normalizar(loteNome))
    }
    if (!loteExistente && pastoDestino) {
      loteExistente = lotesExistentes.find(
        (l) => l.pasto_atual && normalizar(l.pasto_atual) === normalizar(pastoDestino),
      )
    }
    // Se existir mas categoria/sexo divergirem, NÃO agrupa — cria novo (mesmo fluxo de animais)
    if (loteExistente) {
      const sexoNorm = sexoRaw ? normalizarSexo(sexoRaw) : null
      const catNorm = categoriaRaw ? normalizarCategoria(categoriaRaw) : null
      const mesmoPerfil =
        (sexoNorm ? loteExistente.sex === sexoNorm : true) &&
        (catNorm ? normalizar(loteExistente.category) === normalizar(catNorm) : true)
      if (!mesmoPerfil) {
        alertas.push(
          `Lote "${loteExistente.name}" existe com categoria/sexo diferente — nova entrada será cadastrada separadamente`,
        )
        loteExistente = undefined
      }
    }

    let acao: StatusLinhaCompra = 'criar'
    let motivoAcao = ''
    let loteExistenteId: string | undefined
    let loteExistenteCabecas: number | undefined
    let loteExistentePesoMedio: number | undefined
    let pesoMedioCombinado: number | undefined

    if (qtd <= 0 || (precoCab === null && precoAt === null)) {
      acao = 'ignorar'
      motivoAcao = 'Linha sem quantidade válida e sem preço derivável'
    } else if (loteExistente) {
      acao = 'atualizar'
      loteExistenteId = loteExistente.id
      loteExistenteCabecas = loteExistente.headcount
      loteExistentePesoMedio = loteExistente.peso_medio_atual || loteExistente.peso_entrada_medio
      const pesoAtual = loteExistentePesoMedio || pesoMedioKg || 0
      const totalCab = (loteExistenteCabecas || 0) + qtd
      pesoMedioCombinado =
        totalCab > 0
          ? Number(
              (
                (pesoAtual * (loteExistenteCabecas || 0) + (pesoMedioKg || 0) * qtd) /
                totalCab
              ).toFixed(1),
            )
          : undefined
      motivoAcao =
        `Lote existente "${loteExistente.name}" (${loteExistenteCabecas || 0} cab.) será INCREMENTADO em ${qtd} cabeças — não sobrescrito` +
        (pesoMedioCombinado !== undefined
          ? `; novo peso médio combinado: ${pesoMedioCombinado} kg (média ponderada com ${loteExistenteCabecas || 0} cab. existentes @ ${pesoAtual} kg)`
          : '')
    } else {
      motivoAcao =
        `Novo lote de compra será criado com ${qtd} cabeças` +
        (loteNome ? ` com nome "${loteNome}"` : ' (nome será gerado pelo sistema)')
    }

    linhas.push({
      idTemp: `compra_${idx}_${Date.now()}`,
      linhaOrigem: idx + 1,
      dadosOriginais: row,
      dados: {
        lote_nome: loteNome || '',
        categoria: categoriaRaw ? normalizarCategoria(categoriaRaw) : '',
        sexo: sexoRaw ? normalizarSexo(sexoRaw) : 'macho',
        pasto_destino: pastoDestino,
        qtd_cabecas: qtd,
        peso_medio_kg: pesoMedioKg || 0,
        arrobas_totais: arrobasTotais,
        preco_rs_cab: precoCab || 0,
        preco_rs_at: precoAt || 0,
        valor_total: Number(valorTotal.toFixed(2)),
        fornecedor,
        data: dataCompra,
        peso_arrobas_origem: pesoVeioArrobas,
      },
      acao,
      motivoAcao,
      loteExistenteId,
      loteExistenteCabecas,
      loteExistentePesoMedio,
      pesoMedioCombinado,
      agioPct,
      conversoes,
      alertas,
      ignoradoPeloUsuario: acao === 'ignorar',
    })
  })

  // Agrupamento por fornecedor+data quando faz sentido (apenas visual)
  const gruposFornecedorData = new Map<string, number>()
  linhas.forEach((l) => {
    const chave = `${normalizar(l.dados.fornecedor)}|${l.dados.data}`
    gruposFornecedorData.set(chave, (gruposFornecedorData.get(chave) || 0) + 1)
  })
  const conversoesGlobal: string[] = []
  gruposFornecedorData.forEach((count, chave) => {
    if (count > 1) {
      const [forn, data] = chave.split('|')
      conversoesGlobal.push(
        `${count} linhas agrupadas por fornecedor "${forn || 'não informado'}" e data ${data} (lote único por fornecedor+dia)`,
      )
    }
  })

  const ativos = linhas.filter((l) => l.acao !== 'ignorar' && !l.ignoradoPeloUsuario)
  const cabecasTotais = ativos.reduce((a, l) => a + l.dados.qtd_cabecas, 0)
  const pesoTotalKg = ativos.reduce((a, l) => a + l.dados.qtd_cabecas * l.dados.peso_medio_kg, 0)
  const arrobasTotais = ativos.reduce((a, l) => a + l.dados.arrobas_totais, 0)
  const investimentoTotalRs = Number(ativos.reduce((a, l) => a + l.dados.valor_total, 0).toFixed(2))
  const precoMedioRsAt =
    arrobasTotais > 0 ? Number((investimentoTotalRs / arrobasTotais).toFixed(2)) : 0
  const agiosValidos = ativos.map((l) => l.agioPct).filter((v): v is number => v !== null)
  const agioMedioPct =
    agiosValidos.length > 0
      ? Number((agiosValidos.reduce((a, b) => a + b, 0) / agiosValidos.length).toFixed(1))
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

  return {
    linhas,
    cotacao,
    avisoCotacao,
    benchmark,
    resumo: {
      totalLidos: linhas.length,
      aCriar: linhas.filter((l) => l.acao === 'criar' && !l.ignoradoPeloUsuario).length,
      aAtualizar: linhas.filter((l) => l.acao === 'atualizar' && !l.ignoradoPeloUsuario).length,
      aIgnorar: linhas.filter((l) => l.acao === 'ignorar' || l.ignoradoPeloUsuario).length,
      cabecasTotais,
      pesoTotalKg: Number(pesoTotalKg.toFixed(1)),
      arrobasTotais: Number(arrobasTotais.toFixed(2)),
      investimentoTotalRs,
      precoMedioRsAt,
      agioMedioPct,
      conversoes: conversoesGlobal,
      alertas: alertasGlobal,
    },
  }
}

// ------------------------------------------------------------------
// Aplicação (Etapa 4 — apenas após conferência aprovada)
// ------------------------------------------------------------------

/**
 * Aplica as linhas CONFIRMADAS pelo usuário:
 * 1. Cria/atualiza lote no rebanho (incrementa headcount, calcula peso médio combinado)
 * 2. Registra movimentação de rebanho tipo 'compra' (entrada)
 * 3. Registra compra na coleção `compras_gado` do fechamento
 * 4. Lança despesa no financeiro no centro de custo da frente escolhida
 * 5. Registra trilha append-only na auditoria (fornecedor, documento, quem importou, timestamps)
 * 6. Grava registro consolidado em `maestro_compras_gado` (append-only)
 *
 * ATENÇÃO: nunca chamar sem passar pela Etapa 3 (conferência obrigatória).
 */
export async function aplicarCompraGadoConfirmada(
  linhasValidadas: LinhaCompraNormalizada[],
  origemArquivo: { nome: string; formato: string },
  usuarioAtual: { id: string; nome: string; perfil: string },
  cotacaoUsada: CotacaoReferencia | null,
): Promise<ResultadoAplicacaoCompra> {
  const result: ResultadoAplicacaoCompra = {
    sucesso: true,
    totalLidos: linhasValidadas.length,
    criados: 0,
    atualizados: 0,
    ignorados: 0,
    detalhesIgnorados: [],
    entidadesAfetadas: [],
    timestamp: new Date().toISOString(),
    cotacaoOrigem: cotacaoUsada?.origem || 'nenhuma',
    cotacaoPreco: cotacaoUsada?.preco || null,
  }

  const itemsAudit: {
    criados: any[]
    atualizados: any[]
    ignorados: { linha: number; motivo: string }[]
  } = { criados: [], atualizados: [], ignorados: [] }

  // Estado corrente dos lotes para cálculo de incrementos na mesma importação
  let lotes: LotRecord[] = await getLots().catch(() => [])
  const lotesAtualizadosNestaImportacao = new Map<string, { cabecas: number; pesoMedio: number }>()

  const ativos = linhasValidadas.filter((l) => l.acao !== 'ignorar' && !l.ignoradoPeloUsuario)

  // Totais consolidados para o registro append-only
  let cabecasTotais = 0
  let pesoTotalKg = 0
  let arrobasTotais = 0
  let investimentoTotal = 0
  const agios: number[] = []
  const fornecedores = new Set<string>()
  const datasCompra = new Set<string>()

  for (const linha of ativos) {
    const { dados } = linha
    cabecasTotais += dados.qtd_cabecas
    pesoTotalKg += dados.qtd_cabecas * dados.peso_medio_kg
    arrobasTotais += dados.arrobas_totais
    investimentoTotal += dados.valor_total
    if (dados.fornecedor) fornecedores.add(dados.fornecedor)
    datasCompra.add(dados.data)
    if (linha.agioPct !== null) agios.push(linha.agioPct)

    // Frente/centro de custo: SEMPRE escolhida pelo usuário na conferência
    const frente: FrenteCompra =
      linha.frenteEscolhida || detectarFrenteDoTexto(dados.pasto_destino) || 'recria'

    try {
      // ------------------------------------------------------------
      // 1. LOTE: criar ou atualizar (incremento, nunca sobrescrita)
      // ------------------------------------------------------------
      const nomeLote = dados.lote_nome || `Compra ${dados.fornecedor || 'Gado'} ${dados.data}`
      const estadoAnterior = lotesAtualizadosNestaImportacao.get(linha.loteExistenteId || '')
      let loteId = linha.loteExistenteId || ''
      let acaoLote: 'criar' | 'atualizar' =
        linha.acao === 'atualizar' && loteId ? 'atualizar' : 'criar'

      const catCategoria = dados.categoria || 'Recria'
      const faseMap: Record<string, 'cria' | 'recria' | 'engorda' | 'tip_rip' | 'confinamento'> = {
        'Bezerros (0-12m)': 'cria',
        'Recria (12-24m)': 'recria',
        'Engorda (>24m)': 'engorda',
      }
      const fase = faseMap[catCategoria] || 'recria'
      const frentesValidas: FrenteLoteSafe[] = ['cria', 'recria', 'engorda', 'arrendamento']
      const frenteLote = (
        frentesValidas.includes(frente as FrenteLoteSafe) ? frente : 'recria'
      ) as FrenteLoteSafe

      if (acaoLote === 'atualizar' && loteId) {
        // Busca estado atual (respeita múltiplas linhas no mesmo lote nesta importação)
        let cabAtuais: number
        let pesoAtual: number
        if (estadoAnterior) {
          cabAtuais = estadoAnterior.cabecas
          pesoAtual = estadoAnterior.pesoMedio
        } else {
          const lote = lotes.find((l) => l.id === loteId)
          cabAtuais = lote?.headcount || linha.loteExistenteCabecas || 0
          pesoAtual = lote?.peso_medio_atual || lote?.peso_entrada_medio || dados.peso_medio_kg
        }
        const totalCab = cabAtuais + dados.qtd_cabecas
        const pesoCombinado =
          totalCab > 0
            ? Number(
                (
                  (pesoAtual * cabAtuais + dados.peso_medio_kg * dados.qtd_cabecas) /
                  totalCab
                ).toFixed(1),
              )
            : dados.peso_medio_kg

        await updateLot(loteId, {
          headcount: totalCab,
          peso_medio_atual: pesoCombinado,
          final_weight: pesoCombinado,
          pasto_atual:
            dados.pasto_destino || (lotes.find((l) => l.id === loteId)?.pasto_atual ?? ''),
        })
        lotesAtualizadosNestaImportacao.set(loteId, { cabecas: totalCab, pesoMedio: pesoCombinado })
        result.atualizados++
        itemsAudit.atualizados.push({
          tipo: 'lote',
          id: loteId,
          nome: nomeLote,
          cabecas_antes: cabAtuais,
          cabecas_depois: totalCab,
          peso_medio_antes: pesoAtual,
          peso_medio_depois: pesoCombinado,
          origem: `Compra de gado — ${dados.fornecedor || 'fornecedor não informado'} em ${dados.data}`,
        })
        if (!result.entidadesAfetadas.includes('Rebanho (Lotes)'))
          result.entidadesAfetadas.push('Rebanho (Lotes)')
      } else {
        const novoLote = await createLot({
          name: nomeLote,
          sector: fase === 'cria' ? 'cria' : fase === 'engorda' ? 'engorda' : 'recria',
          sex: dados.sexo,
          category: catCategoria,
          initial_weight: dados.peso_medio_kg,
          final_weight: dados.peso_medio_kg,
          entry_date: dados.data,
          exit_date: '',
          value_per_animal:
            dados.qtd_cabecas > 0 ? Number((dados.valor_total / dados.qtd_cabecas).toFixed(2)) : 0,
          status: 'active',
          headcount: dados.qtd_cabecas,
          peso_entrada_medio: dados.peso_medio_kg,
          peso_medio_atual: dados.peso_medio_kg,
          pasto_atual: dados.pasto_destino || 'Pasto Geral',
          data_inicio_lote: dados.data,
          fase_atual: fase,
          frente: frenteLote,
          is_arrendamento: frente === 'arrendamento',
        })
        loteId = novoLote.id
        acaoLote = 'criar'
        lotes.push(novoLote)
        result.criados++
        itemsAudit.criados.push({
          tipo: 'lote',
          id: novoLote.id,
          nome: nomeLote,
          cabecas: dados.qtd_cabecas,
          peso_medio_kg: dados.peso_medio_kg,
          arrobas: dados.arrobas_totais,
          valor_total: dados.valor_total,
          fornecedor: dados.fornecedor,
          data_compra: dados.data,
          preco_rs_at: dados.preco_rs_at,
          agio_pct: linha.agioPct,
        })
        if (!result.entidadesAfetadas.includes('Rebanho (Lotes)'))
          result.entidadesAfetadas.push('Rebanho (Lotes)')
      }

      // ------------------------------------------------------------
      // 2. MOVIMENTAÇÃO DE REBANHO (entrada tipo 'compra')
      // ------------------------------------------------------------
      await registrarMovimentacaoRebanho({
        data: dados.data,
        frente,
        lote_id: loteId || undefined,
        tipo: 'compra',
        qtd_cabecas: dados.qtd_cabecas,
        peso_total_kg: Number((dados.qtd_cabecas * dados.peso_medio_kg).toFixed(1)),
        valor_total_rs: dados.valor_total,
        documento: origemArquivo.nome,
        sexo: dados.sexo,
        observacoes: `Importado via Robô Maestro (${origemArquivo.nome}) — fornecedor: ${dados.fornecedor || 'não informado'}; preço R$ ${dados.preco_rs_at.toFixed(2)}/@; ágio ${linha.agioPct !== null ? `${linha.agioPct.toFixed(1)}%` : 's/ cotação'}`,
      })
      if (!result.entidadesAfetadas.includes('Movimentações de Rebanho'))
        result.entidadesAfetadas.push('Movimentações de Rebanho')

      // ------------------------------------------------------------
      // 3. COMPRA na coleção do fechamento (compras_gado)
      // ------------------------------------------------------------
      const compraRec = await registrarCompraGado({
        data: dados.data,
        frente,
        lote_id: loteId || undefined,
        sexo: dados.sexo,
        qtd_cabecas: dados.qtd_cabecas,
        peso_medio: dados.peso_medio_kg,
        preco_rs_cab: dados.preco_rs_cab || undefined,
        preco_rs_at: dados.preco_rs_at || undefined,
        valor_total: dados.valor_total,
        agio_pct: linha.agioPct !== null ? linha.agioPct : undefined,
        fornecedor: dados.fornecedor || 'Não informado',
      })
      itemsAudit.criados.push({
        tipo: 'compra_gado',
        id: compraRec.id,
        fornecedor: dados.fornecedor,
        qtd: dados.qtd_cabecas,
        valor_total: dados.valor_total,
        agio_pct: linha.agioPct,
        data: dados.data,
      })
      if (!result.entidadesAfetadas.includes('Compras de Gado (Fechamento)'))
        result.entidadesAfetadas.push('Compras de Gado (Fechamento)')

      // ------------------------------------------------------------
      // 4. LANÇAMENTO FINANCEIRO no centro de custo da frente
      // ------------------------------------------------------------
      const centroCusto: any = frente // mesmos valores do select de lancamentos_financeiros
      const lanc = await registrarLancamentoFinanceiro({
        data: dados.data,
        centro_custo: centroCusto,
        plano_contas: 'Compra de Gado (Reposição)',
        classificacao: 'desembolso',
        tipo: 'despesa',
        valor: dados.valor_total,
        descricao: `Compra de ${dados.qtd_cabecas} cab. — ${dados.fornecedor || 'fornecedor não informado'} — R$ ${dados.preco_rs_at ? dados.preco_rs_at.toFixed(2) : '—'}/@ — ágio ${linha.agioPct !== null ? `${linha.agioPct.toFixed(1)}%` : 's/ cotação'} — doc: ${origemArquivo.nome}`,
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
      console.warn('Erro ao aplicar linha de compra da planilha:', err)
      result.ignorados++
      const motivo = `Erro de gravação: ${err?.message || 'falha ao salvar'}`
      result.detalhesIgnorados.push({ linha: linha.linhaOrigem, motivo })
      itemsAudit.ignorados.push({ linha: linha.linhaOrigem, motivo })
    }
  }

  // Linhas marcadas para ignorar na conferência
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

  result.sucesso =
    result.criados + result.atualizados > 0 || result.ignorados === linhasValidadas.length

  // ------------------------------------------------------------
  // 5. TRILHA DE AUDITORIA (append-only)
  // ------------------------------------------------------------
  const audit = await registrarAuditLog({
    tipo_evento: 'criacao',
    usuario_id: usuarioAtual.id,
    usuario_nome: usuarioAtual.nome,
    perfil: usuarioAtual.perfil,
    origem: 'online',
    referencia_tipo: 'maestro_compra_gado',
    motivo:
      `Robô Maestro importou ${linhasValidadas.length} linhas de COMPRA DE GADO do arquivo "${origemArquivo.nome}". ` +
      `Criados: ${result.criados}, Atualizados: ${result.atualizados}, Ignorados: ${result.ignorados}. ` +
      `Fornecedor(es): ${Array.from(fornecedores).join(', ') || 'não informado'}. ` +
      `Total: ${cabecasTotais} cabeças / ${arrobasTotais.toFixed(2)} @ / R$ ${investimentoTotal.toFixed(2)}. ` +
      `Ágio médio: ${agios.length > 0 ? `${(agios.reduce((a, b) => a + b, 0) / agios.length).toFixed(1)}%` : 'não calculado'} ` +
      `com cotação ${cotacaoUsada ? (cotacaoUsada.origem === 'b3_vigente' ? 'B3 vigente' : 'manual') : 'ausente'} de R$ ${cotacaoUsada?.preco?.toFixed(2) ?? '—'}/@ de ${cotacaoUsada ? new Date(cotacaoUsada.dataReferencia).toLocaleDateString('pt-BR') : '—'}.`,
    payload_antes: {
      arquivo_nome: origemArquivo.nome,
      arquivo_formato: origemArquivo.formato,
      fornecedores: Array.from(fornecedores),
      datas_compra: Array.from(datasCompra),
      total_lidos: linhasValidadas.length,
    },
    payload_depois: {
      criados: itemsAudit.criados,
      atualizados: itemsAudit.atualizados,
      ignorados: itemsAudit.ignorados,
      entidadesAfetadas: result.entidadesAfetadas,
      totais: {
        cabecas: cabecasTotais,
        arrobas: Number(arrobasTotais.toFixed(2)),
        investimento_rs: Number(investimentoTotal.toFixed(2)),
        preco_medio_rs_at:
          arrobasTotais > 0 ? Number((investimentoTotal / arrobasTotais).toFixed(2)) : 0,
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
  // 6. REGISTRO CONSOLIDADO (maestro_compras_gado — append-only)
  // ------------------------------------------------------------
  try {
    const dataPrincipal = Array.from(datasCompra)[0] || new Date().toISOString().slice(0, 10)
    const frentePrincipal = ativos[0]?.frenteEscolhida || 'recria'
    await pb.collection('maestro_compras_gado').create({
      arquivo_nome: origemArquivo.nome,
      formato: origemArquivo.formato,
      fornecedor: Array.from(fornecedores).join(', ') || 'Não informado',
      data_compra: dataPrincipal,
      frente: frentePrincipal,
      total_registros_lidos: linhasValidadas.length,
      total_criados: result.criados,
      total_atualizados: result.atualizados,
      total_ignorados: result.ignorados,
      total_cabecas: cabecasTotais,
      peso_total_kg: Number(pesoTotalKg.toFixed(1)),
      arrobas_totais: Number(arrobasTotais.toFixed(2)),
      investimento_total_rs: Number(investimentoTotal.toFixed(2)),
      preco_medio_rs_at:
        arrobasTotais > 0 ? Number((investimentoTotal / arrobasTotais).toFixed(2)) : 0,
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
    console.warn('Erro ao gravar registro consolidado em maestro_compras_gado:', err)
  }

  return result
}

type FrenteLoteSafe = 'cria' | 'recria' | 'engorda' | 'arrendamento'

// ------------------------------------------------------------------
// ESTOQUE DE GADO EM R$ (peso @ × valor @)
// ------------------------------------------------------------------

/**
 * Valoração do estoque de gado como o fechamento faz:
 * estoque R$ = peso em @ do lote (kg ÷ 30) × preço pago na compra (R$/@).
 * Não cria estrutura paralela — lê os lotes reais após a compra.
 */
export function calcularEstoqueGadoRs(
  lotes: LotRecord[],
  precoArrobaCompra: number,
): {
  loteId: string
  nome: string
  cabecas: number
  pesoKg: number
  arrobas: number
  valorRs: number
}[] {
  return lotes
    .filter((l) => l.status === 'active' && l.headcount > 0)
    .map((l) => {
      const pesoMedio = l.peso_medio_atual || l.peso_entrada_medio || l.final_weight || 0
      const pesoKg = Number((pesoMedio * l.headcount).toFixed(1))
      const arrobas = Number((pesoKg / 30).toFixed(2))
      return {
        loteId: l.id,
        nome: l.name,
        cabecas: l.headcount,
        pesoKg,
        arrobas,
        valorRs: Number((arrobas * precoArrobaCompra).toFixed(2)),
      }
    })
}

// ------------------------------------------------------------------
// Relatório PDF e exportação (Etapa 5)
// ------------------------------------------------------------------

export function gerarRelatorioCompraGadoPDF(
  aplicacaoResult: ResultadoAplicacaoCompra,
  origemArquivo: { nome: string; formato: string },
  linhas: LinhaCompraNormalizada[],
  usuarioNome: string,
  cotacaoUsada: CotacaoReferencia | null,
) {
  const doc = new jsPDF()

  doc.setFillColor(24, 76, 44)
  doc.rect(0, 0, 210, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PECUÁRIA F3 - ROBÔ MAESTRO', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório Oficial de Ingestão — COMPRA DE GADO', 14, 18)

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
    head: [['Total Lido', 'Lotes Criados', 'Lotes Atualizados', 'Ignorados', 'Status']],
    body: [
      [
        String(aplicacaoResult.totalLidos),
        String(aplicacaoResult.criados),
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
    l.dados.preco_rs_cab ? `R$ ${l.dados.preco_rs_cab.toFixed(2)}` : '-',
    `R$ ${l.dados.valor_total.toFixed(2)}`,
    l.agioPct !== null ? `${l.agioPct.toFixed(1)}%` : 's/ cotação',
    l.dados.fornecedor || '-',
    l.dados.data,
    l.conversoes.join(' | ') || '-',
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
        'R$/@',
        'R$/Cabeça',
        'Total R$',
        'Ágio',
        'Fornecedor',
        'Data',
        'Conversões',
        'Alertas',
      ],
    ],
    body: tableData.slice(0, 100),
    theme: 'striped',
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: { fillColor: [24, 76, 44] },
  })

  doc.save(`relatorio_maestro_compra_gado_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportarCompraGadoExcel(linhas: LinhaCompraNormalizada[], filename: string) {
  const dados = linhas.map((l) => ({
    Linha: l.linhaOrigem,
    Ação: l.acao,
    Aplicado: l.ignoradoPeloUsuario ? 'NÃO' : 'SIM',
    Lote: l.dados.lote_nome || '(novo)',
    Categoria: l.dados.categoria,
    Sexo: l.dados.sexo,
    'Pasto/Destino': l.dados.pasto_destino,
    'Qtd (cabeças)': l.dados.qtd_cabecas,
    'Peso médio (kg)': l.dados.peso_medio_kg,
    'Arrobas (@)': l.dados.arrobas_totais,
    'Preço R$/cabeça': l.dados.preco_rs_cab,
    'Preço R$/@': l.dados.preco_rs_at,
    'Valor total (R$)': l.dados.valor_total,
    'Ágio (%)': l.agioPct !== null ? l.agioPct : 's/ cotação',
    Fornecedor: l.dados.fornecedor,
    'Data da compra': l.dados.data,
    'Frente/Centro de Custo': l.frenteEscolhida || '',
    Conversões: l.conversoes.join(' | '),
    Alertas: l.alertas.join(' | '),
    Motivo: l.motivoAcao,
  }))
  downloadExcel(dados, filename)
}

// ------------------------------------------------------------------
// Modelo oficial (.xlsx) — "Modelo Compra de Gado"
// ------------------------------------------------------------------

export function baixarModeloCompraGadoXlsx() {
  const hoje = new Date().toISOString().slice(0, 10)
  const dados = [
    {
      Quantidade: 85,
      'Peso Médio': '12 @',
      'Preço por Cabeça': 3150,
      'Preço por @': '—',
      Fornecedor: 'Fazenda Boa Esperança Ltda',
      'Data da Compra': hoje,
      Lote: 'Lote Compra Recria A',
      Categoria: 'Garrote',
      Sexo: 'Macho',
      'Pasto Destino': 'Pasto 04 (Braquiarão)',
      Frente: 'recria',
      Observações:
        'Peso em @ vivo: 12 @ × 30 kg = 360 kg. Preço/@ derivado se apenas cabeça informado.',
    },
    {
      Quantidade: 60,
      'Peso Médio': '450 kg',
      'Preço por Cabeça': '—',
      'Preço por @': 290.5,
      Fornecedor: 'Comercial Leilões Norte S/A',
      'Data da Compra': hoje,
      Lote: 'Lote Compra Engorda B',
      Categoria: 'Boi',
      Sexo: 'Macho',
      'Pasto Destino': 'Pasto 07 (Mombaça)',
      Frente: 'engorda',
      Observações: 'Preço por cabeça derivado de R$/@ × (kg ÷ 30).',
    },
  ]
  // downloadExcel gera .xls compatível com Excel e com o parser do Maestro
  downloadExcel(dados, 'modelo_oficial_compra_de_gado')
}

// ------------------------------------------------------------------
// Exemplo rápido (banco zerado de dados operacionais)
// ------------------------------------------------------------------

export function gerarExemploRapidoCompraGado(): File {
  const hoje = new Date().toISOString().slice(0, 10)
  const csvExemplo = `Quantidade;Peso Médio;Preço por Cabeça;Preço por @;Fornecedor;Data da Compra;Lote;Categoria;Sexo;Pasto Destino;Frente
85;12 @;3150;;Fazenda Boa Esperança Ltda;${hoje};Lote Compra Recria A;Garrote;Macho;Pasto 04 (Braquiarão);recria
60;450 kg;;290.50;Comercial Leilões Norte S/A;${hoje};Lote Compra Engorda B;Boi;Macho;Pasto 07 (Mombaça);engorda
30;16 @;2900;;Parceiro Pecuária Central;${hoje};;Novilho;Macho;Confinamento Curral 02;confinamento`
  const blob = new Blob([csvExemplo], { type: 'text/csv' })
  return new File([blob], 'exemplo_compra_de_gado.csv', { type: 'text/csv' })
}
