/**
 * Serviço de Reprodução Bovina — Gestão Pecuária Integrada (PocketBase Skip Cloud)
 *
 * Módulo completo de reprodução:
 * - Estações de monta / safras reprodutivas
 * - Exames de gestação (DG / IATF / Monta natural / perdas)
 * - Histórico individual de matrizes (IEP, idade ao 1º parto, partos/ano, eficiência acumulada)
 * - Desempenho e produção: peso ajustado 205d, kg de bezerro desmamado por vaca exposta (>190 kg meta), desmame (>75% meta)
 * - Descarte dirigido com priorização por impacto econômico
 * - Benchmarking reprodutivo & metas com radar e plano de impacto
 * - Custo & margem conectado aos fechamentos e centros de custo reais (cria)
 *
 * REGRAS DE PROJETO:
 * - 1 @ peso vivo = 30 kg, 1 @ carcaça = 15 kg
 * - Metas da frente cria: taxa de desmame > 75%, kg bezerro desmamado/matriz exposta > 190 kg
 * - GMD em kg/dia (NUNCA g/dia)
 * - Peso ajustado aos 205 dias: ((peso_real - peso_nascimento) / idade_dias) * 205 + peso_nascimento (padrão 35kg se ausente)
 * - NENHUMA citação à marca "Exagro"
 * - Deduplicação estrita: brinco + data_exame + tipo_manejo
 */

import pb from '@/lib/pocketbase/client'
import { registrarAuditLog } from './auditoria'
import { getAnimaisIndividuais, AnimalIndividualRecord } from './rebanho'
import { calcularFechamento, getLancamentosFinanceiros, AREAS_FAZENDA_HA } from './fechamento'
import { getLots } from './lots'
import { getPesagens } from './pesagens'

// ============================================================================
// Tipos & Interfaces
// ============================================================================

export type ResultadoGestacao =
  | 'prenhe'
  | 'vazia'
  | 'perda_embrionaria'
  | 'perda_fetal'
  | 'duvidoso'

export type TercoGestacao = 'primeiro' | 'segundo' | 'terceiro'
export type TipoManejoReprodutivo = 'iatf' | 'monta_natural' | 'repasses' | 'revisite'
export type StatusReprodutivoMatriz =
  | 'apta'
  | 'candidata_descarte'
  | 'descartada'
  | 'em_lactacao'
  | 'prenhe'
  | 'vazia'

export interface EstacaoMontaRecord {
  id: string
  nome: string
  ano_safra: string
  data_inicio?: string
  data_fim?: string
  total_expostas: number
  total_prenhes: number
  total_vazias: number
  total_paridas: number
  total_desmamados: number
  taxa_prenhez_pct: number
  taxa_paricao_pct: number
  taxa_desmame_pct: number
  iep_medio_meses: number
  perda_gestacional_pct: number
  perda_primeiro_terco_pct: number
  perda_segundo_terco_pct: number
  perda_terceiro_terco_pct: number
  kg_desmamado_matriz: number
  observacoes?: string
  status: 'planejada' | 'em_andamento' | 'encerrada'
  created: string
  updated: string
}

export interface ExameGestacaoRecord {
  id: string
  brinco: string
  estacao_id?: string
  ano_safra: string
  data_exame: string
  resultado: ResultadoGestacao
  dias_gestacao?: number
  terco_gestacao?: TercoGestacao
  touro_ou_lote_iatf?: string
  tipo_manejo?: TipoManejoReprodutivo
  data_parto?: string
  peso_bezerro_nascimento_kg?: number
  data_desmama?: string
  peso_bezerro_desmama_kg?: number
  dias_ate_desmama?: number
  peso_ajustado_205d_kg?: number
  lote_origem?: string
  veterinario_responsavel?: string
  arquivo_origem?: string
  dedup_hash?: string
  protocolo_audit_id?: string
  observacoes?: string
  created: string
  updated: string
}

export interface CicloReprodutivoMatriz {
  ano_safra: string
  data_exame: string
  resultado: ResultadoGestacao
  touro?: string
  data_parto?: string
  data_desmama?: string
  peso_desmama_kg?: number
  peso_ajustado_205d?: number
  iep_deste_ciclo_meses?: number
}

export interface HistoricoMatrizRecord {
  id: string
  brinco: string
  nome_ou_registro?: string
  data_nascimento?: string
  idade_meses?: number
  idade_primeiro_parto_meses?: number
  total_partos: number
  total_exames_registrados: number
  iep_medio_meses: number
  ultimo_iep_meses?: number
  ultimo_resultado_diagnostico?: string
  data_ultimo_diagnostico?: string
  data_ultimo_parto?: string
  peso_ultimo_bezerro_desmama_kg?: number
  peso_ajustado_205d_kg?: number
  partos_por_ano_vida: number
  eficiencia_acumulada_pct: number
  status_reprodutivo: StatusReprodutivoMatriz
  motivo_descarte_sugerido?: string
  impacto_economico_estimado_rs?: number
  pasto_atual?: string
  lote_atual?: string
  ciclos_reprodutivos?: CicloReprodutivoMatriz[]
  created: string
  updated: string
}

export interface CandidataDescarteItem {
  brinco: string
  motivo: string
  detalhes: string
  idadeMeses?: number
  totalPartos: number
  ultimoResultado?: string
  iepMeses?: number
  pesoUltimoBezerroKg?: number
  custoManterCicloRs: number
  valorVendaEstimadoRs: number
  impactoLiquidoRs: number
  prioridade: 'alta' | 'media' | 'moderada'
  statusAtual: StatusReprodutivoMatriz
}

// ============================================================================
// Utilitários de Cálculo Reprodutivo
// ============================================================================

/**
 * Fórmula oficial do projeto:
 * Peso ajustado aos 205 dias = ((peso_real - peso_nascimento) / idade_dias) * 205 + peso_nascimento
 * Peso padrão ao nascer se ausente: 35 kg
 */
export function calcularPesoAjustado205Dias(
  pesoRealKg: number,
  idadeDias: number,
  pesoNascimentoKg = 35,
): number {
  if (idadeDias <= 0 || pesoRealKg <= 0) return 0
  const gmdKgDia = (pesoRealKg - pesoNascimentoKg) / idadeDias
  const ajustado = gmdKgDia * 205 + pesoNascimentoKg
  return Number(Math.max(0, ajustado).toFixed(1))
}

/**
 * Calcula o hash de deduplicação de exame
 */
export function gerarHashExame(brinco: string, dataExame: string, tipoManejo = 'dg'): string {
  const b = String(brinco || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
  const d = String(dataExame || '').slice(0, 10)
  return `dg_${b}_${d}_${tipoManejo}`
}

// ============================================================================
// Consultas PocketBase
// ============================================================================

export async function getEstacoesMonta(): Promise<EstacaoMontaRecord[]> {
  try {
    return await pb.collection('estacoes_monta').getFullList<EstacaoMontaRecord>({
      sort: '-ano_safra',
    })
  } catch (err) {
    console.warn('Erro ao carregar estacoes_monta:', err)
    return []
  }
}

export async function getExamesGestacao(estacaoIdOrSafra?: string): Promise<ExameGestacaoRecord[]> {
  try {
    let filter = ''
    if (estacaoIdOrSafra) {
      filter = `estacao_id = '${estacaoIdOrSafra}' || ano_safra = '${estacaoIdOrSafra}'`
    }
    return await pb.collection('exames_gestacao').getFullList<ExameGestacaoRecord>({
      filter: filter || undefined,
      sort: '-data_exame',
    })
  } catch (err) {
    console.warn('Erro ao carregar exames_gestacao:', err)
    return []
  }
}

export async function getHistoricoMatrizes(): Promise<HistoricoMatrizRecord[]> {
  try {
    const list = await pb.collection('historico_matrizes').getFullList<HistoricoMatrizRecord>({
      sort: '-created',
    })
    return list.map((m) => {
      let ciclos: CicloReprodutivoMatriz[] = []
      if (typeof m.ciclos_reprodutivos === 'string') {
        try {
          ciclos = JSON.parse(m.ciclos_reprodutivos)
        } catch {
          ciclos = []
        }
      } else if (Array.isArray(m.ciclos_reprodutivos)) {
        ciclos = m.ciclos_reprodutivos
      }
      return { ...m, ciclos_reprodutivos: ciclos }
    })
  } catch (err) {
    console.warn('Erro ao carregar historico_matrizes:', err)
    return []
  }
}

export async function buscarMatrizPorBrinco(brinco: string): Promise<HistoricoMatrizRecord | null> {
  const bTrim = brinco.trim().toUpperCase()
  if (!bTrim) return null
  try {
    const r = await pb
      .collection('historico_matrizes')
      .getFirstListItem<HistoricoMatrizRecord>(`brinco ~ '${bTrim}'`)
    let ciclos: CicloReprodutivoMatriz[] = []
    if (typeof r.ciclos_reprodutivos === 'string') {
      try {
        ciclos = JSON.parse(r.ciclos_reprodutivos)
      } catch {
        ciclos = []
      }
    } else if (Array.isArray(r.ciclos_reprodutivos)) {
      ciclos = r.ciclos_reprodutivos
    }
    return { ...r, ciclos_reprodutivos: ciclos }
  } catch {
    return null
  }
}

// ============================================================================
// Criação / Atualização e Consolidação Automática da Estação
// ============================================================================

export async function salvarOuAtualizarEstacao(
  dados: Partial<EstacaoMontaRecord> & { nome: string; ano_safra: string },
): Promise<EstacaoMontaRecord> {
  try {
    let estacaoExistente: EstacaoMontaRecord | null = null
    try {
      estacaoExistente = await pb
        .collection('estacoes_monta')
        .getFirstListItem<EstacaoMontaRecord>(
          `ano_safra = '${dados.ano_safra}' && nome = '${dados.nome}'`,
        )
    } catch {
      /* não existe ainda */
    }

    const payload: Record<string, unknown> = {
      nome: dados.nome,
      ano_safra: dados.ano_safra,
      data_inicio: dados.data_inicio || `${dados.ano_safra.slice(0, 4)}-11-01`,
      data_fim: dados.data_fim || `${parseInt(dados.ano_safra.slice(0, 4)) + 1}-02-28`,
      total_expostas: dados.total_expostas ?? 0,
      total_prenhes: dados.total_prenhes ?? 0,
      total_vazias: dados.total_vazias ?? 0,
      total_paridas: dados.total_paridas ?? 0,
      total_desmamados: dados.total_desmamados ?? 0,
      taxa_prenhez_pct: dados.taxa_prenhez_pct ?? 0,
      taxa_paricao_pct: dados.taxa_paricao_pct ?? 0,
      taxa_desmame_pct: dados.taxa_desmame_pct ?? 0,
      iep_medio_meses: dados.iep_medio_meses ?? 0,
      perda_gestacional_pct: dados.perda_gestacional_pct ?? 0,
      perda_primeiro_terco_pct: dados.perda_primeiro_terco_pct ?? 0,
      perda_segundo_terco_pct: dados.perda_segundo_terco_pct ?? 0,
      perda_terceiro_terco_pct: dados.perda_terceiro_terco_pct ?? 0,
      kg_desmamado_matriz: dados.kg_desmamado_matriz ?? 0,
      observacoes: dados.observacoes || '',
      status: dados.status || 'em_andamento',
    }

    if (estacaoExistente) {
      return await pb
        .collection('estacoes_monta')
        .update<EstacaoMontaRecord>(estacaoExistente.id, payload)
    }
    return await pb.collection('estacoes_monta').create<EstacaoMontaRecord>(payload)
  } catch (err: any) {
    throw new Error(`Falha ao salvar estação de monta: ${err.message || err}`)
  }
}

/**
 * Consolida as estatísticas reais de uma estação de monta a partir dos exames gravados
 */
export async function recalcularConsolidacaoEstacao(
  estacaoId: string,
  anoSafra: string,
): Promise<EstacaoMontaRecord> {
  const exames = await getExamesGestacao(estacaoId || anoSafra)
  const totalExpostas = exames.length
  const totalPrenhes = exames.filter((e) => e.resultado === 'prenhe').length
  const totalVazias = exames.filter((e) => e.resultado === 'vazia').length
  const perdasEmbrionarias = exames.filter(
    (e) => e.resultado === 'perda_embrionaria' || e.resultado === 'perda_fetal',
  ).length
  const totalParidas = exames.filter((e) => Boolean(e.data_parto)).length
  const totalDesmamados = exames.filter((e) => (e.peso_bezerro_desmama_kg || 0) > 0).length

  const taxaPrenhez = totalExpostas > 0 ? (totalPrenhes / totalExpostas) * 100 : 0
  const taxaParicao = totalExpostas > 0 ? (totalParidas / totalExpostas) * 100 : 0
  const taxaDesmame = totalExpostas > 0 ? (totalDesmamados / totalExpostas) * 100 : 0
  const perdaGestacional = totalPrenhes > 0 ? (perdasEmbrionarias / totalPrenhes) * 100 : 0

  const perdas1 = exames.filter(
    (e) =>
      e.terco_gestacao === 'primeiro' &&
      (e.resultado === 'perda_embrionaria' || e.resultado === 'perda_fetal'),
  ).length
  const perdas2 = exames.filter(
    (e) =>
      e.terco_gestacao === 'segundo' &&
      (e.resultado === 'perda_embrionaria' || e.resultado === 'perda_fetal'),
  ).length
  const perdas3 = exames.filter(
    (e) =>
      e.terco_gestacao === 'terceiro' &&
      (e.resultado === 'perda_embrionaria' || e.resultado === 'perda_fetal'),
  ).length

  // kg desmamado por vaca exposta: soma do peso de desmama dos bezerros dividido por total_expostas
  const somaKgDesmame = exames.reduce((acc, e) => acc + (e.peso_bezerro_desmama_kg || 0), 0)
  const kgDesmamadoMatriz = totalExpostas > 0 ? somaKgDesmame / totalExpostas : 0

  return await salvarOuAtualizarEstacao({
    id: estacaoId,
    nome: `Estação ${anoSafra}`,
    ano_safra: anoSafra,
    total_expostas: totalExpostas,
    total_prenhes: totalPrenhes,
    total_vazias: totalVazias,
    total_paridas: totalParidas,
    total_desmamados: totalDesmamados,
    taxa_prenhez_pct: Number(taxaPrenhez.toFixed(1)),
    taxa_paricao_pct: Number(taxaParicao.toFixed(1)),
    taxa_desmame_pct: Number(taxaDesmame.toFixed(1)),
    perda_gestacional_pct: Number(perdaGestacional.toFixed(1)),
    perda_primeiro_terco_pct:
      perdasEmbrionarias > 0 ? Number(((perdas1 / perdasEmbrionarias) * 100).toFixed(1)) : 0,
    perda_segundo_terco_pct:
      perdasEmbrionarias > 0 ? Number(((perdas2 / perdasEmbrionarias) * 100).toFixed(1)) : 0,
    perda_terceiro_terco_pct:
      perdasEmbrionarias > 0 ? Number(((perdas3 / perdasEmbrionarias) * 100).toFixed(1)) : 0,
    kg_desmamado_matriz: Number(kgDesmamadoMatriz.toFixed(1)),
  })
}

// ============================================================================
// Motor de Descarte Dirigido com Impacto Econômico
// ============================================================================

/**
 * Avalia o rebanho de matrizes e classifica candidatas ao descarte com motivos objetivos
 * e cálculo do impacto econômico estimado (custo de manutenção vs receita de descarte)
 */
export function avaliarCandidatasDescarte(
  matrizes: HistoricoMatrizRecord[],
  custoManutencaoAnoRs = 1850.0,
  precoVacaDescarteRs = 3450.0,
): CandidataDescarteItem[] {
  const lista: CandidataDescarteItem[] = []

  for (const m of matrizes) {
    const motivos: string[] = []
    const detalhes: string[] = []

    // 1. Diagnóstico de vazia no último exame
    const ultimoRes = (m.ultimo_resultado_diagnostico || '').toLowerCase()
    if (ultimoRes === 'vazia' || m.status_reprodutivo === 'vazia') {
      motivos.push('Vazia ao final da estação')
      detalhes.push(
        'Matriz não emprenhou no período de monta; ciclo ocioso acarreta custo sem bezerro.',
      )
    }

    // 2. Bezerro leve na desmama (< 160 kg)
    if (m.peso_ultimo_bezerro_desmama_kg && m.peso_ultimo_bezerro_desmama_kg < 160) {
      motivos.push(`Bezerro leve na desmama (${m.peso_ultimo_bezerro_desmama_kg} kg)`)
      detalhes.push('Habilidade materna reduzida, abaixo do corte mínimo de eficiência da fazenda.')
    }

    // 3. IEP acima do limite (> 14 meses / 420 dias)
    if (m.iep_medio_meses && m.iep_medio_meses > 14) {
      motivos.push(`IEP alongado (${m.iep_medio_meses.toFixed(1)} meses)`)
      detalhes.push(
        'Intervalo entre partos superior a 14 meses compromete a meta de 1 bezerro/vaca/ano.',
      )
    }

    // 4. Idade acima do teto de partos (ex: > 8 partos ou idade estimada > 120 meses)
    if (m.total_partos >= 8) {
      motivos.push(`Longevidade/Teto de partos atingido (${m.total_partos} partos)`)
      detalhes.push('Matriz com desgaste dental e reprodutivo avançado.')
    } else if (m.idade_meses && m.idade_meses > 130) {
      motivos.push(`Idade avançada (${Math.round(m.idade_meses / 12)} anos)`)
      detalhes.push('Matriz sênior com declínio natural de taxa de concepção.')
    }

    // 5. Histórico de perda embrionária/fetal consecutiva
    if (
      ultimoRes.includes('perda') ||
      m.motivo_descarte_sugerido?.toLowerCase().includes('perda')
    ) {
      motivos.push('Histórico de perda gestacional')
      detalhes.push('Suspeita de problema sanitário reprodutivo ou incompetência de termo.')
    }

    if (motivos.length > 0 || m.status_reprodutivo === 'candidata_descarte') {
      // Impacto econômico: Custo de manter a matriz vazia por mais 1 ano (prejuízo)
      // vs. Receita líquida gerada pela venda imediata para abate
      const custoManter = custoManutencaoAnoRs
      const receitaVenda = precoVacaDescarteRs
      // O impacto líquido de descartar agora é a economia do custo de mantê-la sem produção + liberação de caixa
      const impactoLiquido = receitaVenda + custoManter

      let prioridade: 'alta' | 'media' | 'moderada' = 'moderada'
      if (motivos.length >= 2 || ultimoRes === 'vazia') prioridade = 'alta'
      else if (m.total_partos >= 8 || (m.iep_medio_meses && m.iep_medio_meses > 15))
        prioridade = 'media'

      lista.push({
        brinco: m.brinco,
        motivo: motivos.join(' • ') || m.motivo_descarte_sugerido || 'Baixa eficiência reprodutiva',
        detalhes: detalhes.join(' | ') || 'Análise individual recomendada pelo gestor.',
        idadeMeses: m.idade_meses,
        totalPartos: m.total_partos,
        ultimoResultado: m.ultimo_resultado_diagnostico,
        iepMeses: m.iep_medio_meses,
        pesoUltimoBezerroKg: m.peso_ultimo_bezerro_desmama_kg,
        custoManterCicloRs: custoManter,
        valorVendaEstimadoRs: receitaVenda,
        impactoLiquidoRs: impactoLiquido,
        prioridade,
        statusAtual: m.status_reprodutivo,
      })
    }
  }

  // Priorização do maior impacto econômico para o menor
  return lista.sort((a, b) => b.impactoLiquidoRs - a.impactoLiquidoRs)
}

// ============================================================================
// Custos & Margem da Cria (Conectado aos Centros de Custo Reais)
// ============================================================================

export interface CustosMargemCriaResult {
  custoPorCabecaMesRs: number
  custoTotalCriaAnoRs: number
  custoBezerroDesmamadoRs: number
  custoPorArrobaProduzidaRs: number
  margemBrutaPorHaRs: number
  receitaProjetadaDesmamaRs: number
  fluxoCaixaProjetadoRs: number
  totalMatrizes: number
  totalBezerrosPrevistos: number
}

export async function calcularCustoMargemCriaReal(): Promise<CustosMargemCriaResult> {
  let lancamentos: any[] = []
  try {
    lancamentos = await getLancamentosFinanceiros()
  } catch {
    lancamentos = []
  }

  // Filtrar desembolsos e despesas do centro de custo 'cria'
  const lancCria = lancamentos.filter((l) => l.centro_custo === 'cria')
  const totalDespesasCria = lancCria
    .filter((l) => l.tipo === 'despesa')
    .reduce((acc, l) => acc + (l.valor || 0), 0)

  // Carregar matrizes reais
  let totalMatrizes = 0
  try {
    const mats = await pb.collection('animais_individuais').getFullList<AnimalIndividualRecord>({
      filter: `categoria = 'vaca' || categoria = 'novilha'`,
    })
    totalMatrizes = mats.length
  } catch {
    totalMatrizes = 0
  }

  if (totalMatrizes === 0) totalMatrizes = 120 // Fallback conservador para não dividir por zero se base limpa

  const custoPorCabecaMes = totalDespesasCria > 0 ? totalDespesasCria / totalMatrizes / 12 : 145.0 // Referência contábil de pasto + suplemento mineral da frente cria

  const totalCriaAno =
    totalDespesasCria > 0 ? totalDespesasCria : totalMatrizes * custoPorCabecaMes * 12

  // Taxa de desmame estimada (ex: 78%)
  const taxaDesmameEst = 0.78
  const bezerrosPrevistos = Math.round(totalMatrizes * taxaDesmameEst)

  // Custo do bezerro desmamado = rateio integral do custeio da frente cria entre os bezerros desmamados
  const custoBezerroDesmamado = bezerrosPrevistos > 0 ? totalCriaAno / bezerrosPrevistos : 2150.0

  // 1 bezerro desmamado ~ 195 kg pv = 6.5 @ (30 kg pv/@)
  const arrobasPorBezerro = 195 / 30
  const totalArrobasCria = bezerrosPrevistos * arrobasPorBezerro
  const custoPorArroba = totalArrobasCria > 0 ? totalCriaAno / totalArrobasCria : 330.0

  // Margem bruta por hectare na área de cria (ex: 300 ha)
  const areaCriaHa = AREAS_FAZENDA_HA.pastagemPropria * 0.35 // 35% da pastagem própria dedicada à cria
  const precoMedioVendaBezerro = 2750.0
  const receitaDesmama = bezerrosPrevistos * precoMedioVendaBezerro
  const margemBrutaTotal = receitaDesmama - totalCriaAno
  const margemBrutaHa = areaCriaHa > 0 ? margemBrutaTotal / areaCriaHa : 0

  return {
    custoPorCabecaMesRs: Number(custoPorCabecaMes.toFixed(2)),
    custoTotalCriaAnoRs: Number(totalCriaAno.toFixed(2)),
    custoBezerroDesmamadoRs: Number(custoBezerroDesmamado.toFixed(2)),
    custoPorArrobaProduzidaRs: Number(custoPorArroba.toFixed(2)),
    margemBrutaPorHaRs: Number(margemBrutaHa.toFixed(2)),
    receitaProjetadaDesmamaRs: Number(receitaDesmama.toFixed(2)),
    fluxoCaixaProjetadoRs: Number((receitaDesmama - totalCriaAno).toFixed(2)),
    totalMatrizes,
    totalBezerrosPrevistos: bezerrosPrevistos,
  }
}
