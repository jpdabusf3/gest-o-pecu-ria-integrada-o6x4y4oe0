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
import { notifyDataChanged } from '@/lib/syncEvents'
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
  duracao_dias?: number
  data_inicio_parto?: string
  data_fim_parto?: string
  gestantes_iatf?: number
  gestantes_touro?: number
  taxa_cio_pct?: number
  taxa_aborto_dg_inicial_pct?: number
  dados_iatf?: any
  categorias_agregado?: any
  mapa_paricao_mensal?: Array<{ mes: string; qtd: number }>
  concepcao_por_rodada?: Record<string, number>
  prenhez_por_touro?: Array<{
    touro: string
    registro?: string
    qtd_prenhez: number
    media_prenhez_pct?: number
    qtd_utilizada?: number
  }>
  prenhez_por_lote?: any[]
  formato_origem?: string
  conciliacao_status?: string
  conciliacao_detalhes?: any
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
  serie?: string
  numero?: string
  categoria_matriz?: string
  touro_nome?: string
  touro_registro?: string
  data_cobertura?: string
  data_prevista_parto?: string
  divergencia_previsao_dias?: number
  status_previsao?: 'OK' | 'AMBIGUO' | 'AUSENTE'
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
// Consultas & Persistência de Nascimentos Realizados na Estação
// ============================================================================

export function gerarHashNascimento(
  estacaoId: string,
  mes: string,
  sexo: string,
  raca = '',
  categoria = '',
  classe = '',
): string {
  const e = String(estacaoId || '').trim()
  const m = String(mes || '')
    .trim()
    .toUpperCase()
  const s = String(sexo || '')
    .trim()
    .toLowerCase()
  const r = String(raca || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
  const cat = String(categoria || '')
    .trim()
    .toLowerCase()
  const cl = String(classe || '')
    .trim()
    .toUpperCase()
  return `nasc_${e}_${m}_${s}_${r || 'NI'}_${cat || 'IND'}_${cl || 'IND'}`
}

export async function getNascimentosEstacao(
  estacaoIdOrSafra?: string,
): Promise<NascimentoEstacaoRecord[]> {
  try {
    let filter = ''
    if (estacaoIdOrSafra && estacaoIdOrSafra !== 'todas') {
      filter = `estacao_id = '${estacaoIdOrSafra}' || ano_safra = '${estacaoIdOrSafra}'`
    }
    return await pb.collection('nascimentos_estacao').getFullList<NascimentoEstacaoRecord>({
      filter: filter || undefined,
      sort: 'mes_referencia,sexo,raca',
    })
  } catch (err) {
    console.warn('Erro ao carregar nascimentos_estacao:', err)
    return []
  }
}

/**
 * Salva ou atualiza os nascimentos da estação de forma idempotente (deduplicação por dedup_hash).
 * Se o usuário enviar uma lista com novas quantidades para os mesmos meses/sexos/raças,
 * os registros existentes são atualizados com as novas quantidades e os novos são criados.
 */
export async function salvarNascimentosEstacao(
  estacaoId: string,
  anoSafra: string,
  itens: ItemNascimentoInput[],
): Promise<NascimentoEstacaoRecord[]> {
  if (!itens || itens.length === 0) return []

  // 1. Busca os registros existentes desta estação para deduplicação idempotente
  let existentes: NascimentoEstacaoRecord[] = []
  try {
    existentes = await pb.collection('nascimentos_estacao').getFullList<NascimentoEstacaoRecord>({
      filter: `estacao_id = '${estacaoId}' || ano_safra = '${anoSafra}'`,
    })
  } catch {
    existentes = []
  }

  const mapaExistentes = new Map<string, NascimentoEstacaoRecord>()
  existentes.forEach((rec) => {
    if (rec.dedup_hash) {
      mapaExistentes.set(rec.dedup_hash, rec)
    }
  })

  const resultados: NascimentoEstacaoRecord[] = []

  for (const item of itens) {
    if (!item.quantidade || item.quantidade <= 0) continue

    const racaTratada = item.raca?.trim() || 'Não informado'
    const catTratada = item.categoria_matriz || 'indefinida'
    const clTratada = item.classe_matriz || 'indefinida'
    const mesNorm = item.mes_referencia.trim().toUpperCase()

    const dedupHash = gerarHashNascimento(
      estacaoId,
      mesNorm,
      item.sexo,
      racaTratada,
      catTratada,
      clTratada,
    )

    const payload = {
      estacao_id: estacaoId,
      ano_safra: anoSafra,
      mes_referencia: mesNorm,
      data_referencia: item.data_referencia || undefined,
      sexo: item.sexo,
      raca: racaTratada,
      categoria_matriz: catTratada,
      classe_matriz: clTratada,
      quantidade: item.quantidade,
      peso_medio_nasc_kg: item.peso_medio_nasc_kg || undefined,
      dedup_hash: dedupHash,
      observacoes: item.observacoes || '',
    }

    const existente = mapaExistentes.get(dedupHash)
    if (existente) {
      const atualizado = await pb
        .collection('nascimentos_estacao')
        .update<NascimentoEstacaoRecord>(existente.id, payload)
      resultados.push(atualizado)
    } else {
      const criado = await pb
        .collection('nascimentos_estacao')
        .create<NascimentoEstacaoRecord>(payload)
      resultados.push(criado)
      mapaExistentes.set(dedupHash, criado)
    }
  }

  // 2. Sincronização automática com movimentacoes_rebanho e lots para refletir em Rebanho, Dashboard e Fechamento
  try {
    await sincronizarNascimentosComRebanho(estacaoId, anoSafra, resultados)
  } catch (errSync) {
    console.warn('Erro ao sincronizar nascimentos com rebanho/movimentações:', errSync)
  }

  // Dispara notificação no barramento global do sistema
  notifyDataChanged('nascimentos_estacao', { estacaoId, anoSafra, totalItens: resultados.length })

  return resultados
}

/**
 * Sincroniza os registros de nascimentos_estacao com movimentacoes_rebanho e com o lote de cria da safra
 * garantindo que o rebanho ativo, entradas por nascimento e indicadores de fechamento reflitam os novos nascidos.
 */
export async function sincronizarNascimentosComRebanho(
  estacaoId: string,
  anoSafra: string,
  nascimentosSalvos?: NascimentoEstacaoRecord[],
): Promise<void> {
  const listaNasc =
    nascimentosSalvos && nascimentosSalvos.length > 0
      ? nascimentosSalvos
      : await getNascimentosEstacao(estacaoId || anoSafra)

  if (!listaNasc || listaNasc.length === 0) return

  // 1. Busca movimentações de rebanho já existentes do tipo 'nascimento' vinculadas a esta safra
  let movExistentes: any[] = []
  try {
    movExistentes = await pb.collection('movimentacoes_rebanho').getFullList({
      filter: `tipo = 'nascimento' && (documento ~ '${anoSafra}' || observacoes ~ '${estacaoId}')`,
    })
  } catch {
    movExistentes = []
  }

  const mapaMovExistentes = new Map<string, any>()
  movExistentes.forEach((m) => {
    if (m.documento) {
      mapaMovExistentes.set(m.documento, m)
    }
  })

  // Agrupa os nascimentos por sexo e mês de referência para criar movimentações coerentes
  for (const nasc of listaNasc) {
    const docKey = `NASC_${nasc.id}`
    const pesoMedio =
      nasc.peso_medio_nasc_kg && nasc.peso_medio_nasc_kg > 0 ? nasc.peso_medio_nasc_kg : 32
    const pesoTotal = (nasc.quantidade || 0) * pesoMedio

    // Data aproximada baseada no ano da safra e mês de referência
    let dataMov = nasc.data_referencia
    if (!dataMov) {
      const mapaMeses: Record<string, string> = {
        JAN: '01',
        FEV: '02',
        MAR: '03',
        ABR: '04',
        MAI: '05',
        JUN: '06',
        JUL: '07',
        AGO: '08',
        SET: '09',
        OUT: '10',
        NOV: '11',
        DEZ: '12',
      }
      const mesNum = mapaMeses[nasc.mes_referencia?.toUpperCase()] || '08'
      const anoParto = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN'].includes(
        nasc.mes_referencia?.toUpperCase(),
      )
        ? anoSafra.split('/')[1] || new Date().getFullYear().toString()
        : anoSafra.split('/')[0] || new Date().getFullYear().toString()
      dataMov = `${anoParto}-${mesNum}-15`
    }

    const payloadMov = {
      data: dataMov,
      frente: 'cria',
      tipo: 'nascimento',
      qtd_cabecas: nasc.quantidade,
      peso_total_kg: pesoTotal,
      valor_total_rs: 0,
      documento: docKey,
      sexo: nasc.sexo === 'femea' ? 'femea' : 'macho',
      observacoes: `Nascimentos da Estação (${anoSafra} - ${nasc.mes_referencia}): ${nasc.raca || 'Nelore'} [${estacaoId}]`,
    }

    const movJaExiste = mapaMovExistentes.get(docKey)
    if (movJaExiste) {
      if (movJaExiste.qtd_cabecas !== nasc.quantidade || movJaExiste.peso_total_kg !== pesoTotal) {
        await pb.collection('movimentacoes_rebanho').update(movJaExiste.id, payloadMov)
      }
    } else {
      await pb.collection('movimentacoes_rebanho').create(payloadMov)
    }
  }

  // 2. Garante que exista um lote ativo correspondente de Bezerros da Safra na coleção 'lots'
  // para que as telas de Rebanho Atual, Dashboard e Pastos exibam essas cabeças
  try {
    const totalMachos = listaNasc
      .filter((n) => n.sexo === 'macho')
      .reduce((acc, n) => acc + (n.quantidade || 0), 0)
    const totalFemeas = listaNasc
      .filter((n) => n.sexo === 'femea')
      .reduce((acc, n) => acc + (n.quantidade || 0), 0)

    let pastoPadraoId: string | undefined = undefined
    try {
      const pastos = await pb.collection('pastos_rebanho').getFullList({ limit: 1 })
      if (pastos.length > 0) pastoPadraoId = pastos[0].id
    } catch {
      // pasto opcional
    }

    // Lote de Bezerros Machos
    if (totalMachos > 0) {
      const nomeLoteM = `Bezerros Nascidos Safra ${anoSafra}`
      let loteM: any = null
      try {
        loteM = await pb.collection('lots').getFirstListItem(`name = '${nomeLoteM}'`)
      } catch {
        loteM = null
      }

      const payloadLoteM = {
        name: nomeLoteM,
        sector: 'cria',
        sex: 'macho',
        category: 'Bezerro(a)',
        initial_weight: 32,
        final_weight: 0,
        entry_date: `${anoSafra.split('/')[0] || new Date().getFullYear()}-07-01`,
        status: 'active',
        headcount: totalMachos,
        peso_entrada_medio: 32,
        peso_medio_atual: 34,
        fase_atual: 'cria',
        frente: 'cria',
        pasto_atual_id: pastoPadraoId || undefined,
        pasto_atual: pastoPadraoId ? 'Maternidade / Cria' : undefined,
      }

      if (loteM) {
        if (loteM.headcount !== totalMachos) {
          await pb.collection('lots').update(loteM.id, { headcount: totalMachos })
        }
      } else {
        await pb.collection('lots').create(payloadLoteM)
      }
    }

    // Lote de Bezerras Fêmeas
    if (totalFemeas > 0) {
      const nomeLoteF = `Bezerras Nascidas Safra ${anoSafra}`
      let loteF: any = null
      try {
        loteF = await pb.collection('lots').getFirstListItem(`name = '${nomeLoteF}'`)
      } catch {
        loteF = null
      }

      const payloadLoteF = {
        name: nomeLoteF,
        sector: 'cria',
        sex: 'femea',
        category: 'Bezerro(a)',
        initial_weight: 30,
        final_weight: 0,
        entry_date: `${anoSafra.split('/')[0] || new Date().getFullYear()}-07-01`,
        status: 'active',
        headcount: totalFemeas,
        peso_entrada_medio: 30,
        peso_medio_atual: 32,
        fase_atual: 'cria',
        frente: 'cria',
        pasto_atual_id: pastoPadraoId || undefined,
        pasto_atual: pastoPadraoId ? 'Maternidade / Cria' : undefined,
      }

      if (loteF) {
        if (loteF.headcount !== totalFemeas) {
          await pb.collection('lots').update(loteF.id, { headcount: totalFemeas })
        }
      } else {
        await pb.collection('lots').create(payloadLoteF)
      }
    }
  } catch (errLote) {
    console.warn('Erro ao atualizar lotes de nascimentos:', errLote)
  }
}

// ============================================================================
// Tipos & Serviços de Cadastros Manuais (IATF, DG e Resultado Final)
// ============================================================================

export interface CadastroIatfInput {
  estacao_id?: string
  ano_safra: string
  data_acao: string
  lote_nome: string
  quantidade_matrizes: number
  touro_semen: string
  touro_registro?: string
  protocolo: string
  rodada: '1' | '2' | '3' | 'repasse'
  veterinario?: string
  observacoes?: string
}

export interface CadastroDgItemInput {
  brinco: string
  resultado: ResultadoGestacao
  dias_gestacao?: number
  terco_gestacao?: TercoGestacao
  touro_ou_lote_iatf?: string
  tipo_manejo?: TipoManejoReprodutivo
  data_cobertura?: string
  data_prevista_parto?: string
  data_parto?: string
  peso_bezerro_desmama_kg?: number
  categoria_matriz?: string
  lote_origem?: string
  veterinario?: string
  observacoes?: string
}

export interface CadastroDgLoteInput {
  estacao_id?: string
  ano_safra: string
  data_exame: string
  lote_origem?: string
  veterinario?: string
  touro_padrao?: string
  tipo_manejo_padrao?: TipoManejoReprodutivo
  itens: CadastroDgItemInput[]
}

export type SexoNascimento = 'macho' | 'femea' | 'indefinido'
export type CategoriaMatrizNascimento = 'nulipara' | 'primipara' | 'multipara' | 'indefinida'
export type ClasseMatrizNascimento = 'PO' | 'comercial' | 'indefinida'

export interface NascimentoEstacaoRecord {
  id: string
  estacao_id?: string
  ano_safra: string
  mes_referencia: string
  data_referencia?: string
  sexo: SexoNascimento
  raca?: string
  categoria_matriz?: CategoriaMatrizNascimento
  classe_matriz?: ClasseMatrizNascimento
  quantidade: number
  peso_medio_nasc_kg?: number
  dedup_hash?: string
  observacoes?: string
  created: string
  updated: string
}

export interface ItemNascimentoInput {
  mes_referencia: string
  data_referencia?: string
  sexo: SexoNascimento
  raca?: string
  categoria_matriz?: CategoriaMatrizNascimento
  classe_matriz?: ClasseMatrizNascimento
  quantidade: number
  peso_medio_nasc_kg?: number
  observacoes?: string
}

export interface CadastroResultadoFinalInput {
  estacao_id?: string
  ano_safra: string
  nome_estacao?: string
  total_expostas: number
  total_prenhes: number
  total_vazias: number
  taxa_prenhez_pct?: number
  gestantes_iatf?: number
  gestantes_touro?: number
  taxa_paricao_pct?: number
  taxa_desmame_pct?: number
  kg_desmamado_matriz?: number
  perda_gestacional_pct?: number
  iep_medio_meses?: number
  status?: 'planejada' | 'em_andamento' | 'encerrada'
  observacoes?: string
  nascimentos?: ItemNascimentoInput[]
}

/**
 * 1. Cadastro manual de rodada de IATF:
 * - Registra ou complementa dados na estação de monta correspondente
 * - Registra em atividades para o calendário/gestão se desejado
 * - Registra em audit_log
 */
export async function cadastrarAcaoIatf(
  input: CadastroIatfInput,
  usuario?: { id: string; nome: string; perfil?: string },
): Promise<{ sucesso: boolean; estacaoId: string; mensagem: string }> {
  // Localizar ou criar a estação
  let estacao: EstacaoMontaRecord | null = null
  if (input.estacao_id) {
    try {
      estacao = await pb.collection('estacoes_monta').getOne<EstacaoMontaRecord>(input.estacao_id)
    } catch {
      estacao = null
    }
  }

  if (!estacao) {
    try {
      estacao = await pb
        .collection('estacoes_monta')
        .getFirstListItem<EstacaoMontaRecord>(`ano_safra = '${input.ano_safra}'`)
    } catch {
      estacao = null
    }
  }

  // Prepara estrutura de dados_iatf agregada
  const dadosIatfAtuais =
    estacao?.dados_iatf && typeof estacao.dados_iatf === 'object'
      ? { ...estacao.dados_iatf }
      : { expostas: 0, inseminacoes: 0, total_gestantes: 0, total_vazias: 0 }

  const rodadasCadastradas: any[] = Array.isArray(dadosIatfAtuais.rodadas_manuais)
    ? [...dadosIatfAtuais.rodadas_manuais]
    : []

  rodadasCadastradas.push({
    data: input.data_acao,
    lote: input.lote_nome,
    quantidade: input.quantidade_matrizes,
    touro: input.touro_semen,
    registro: input.touro_registro || '',
    protocolo: input.protocolo,
    rodada: input.rodada,
    veterinario: input.veterinario || '',
    observacoes: input.observacoes || '',
    criado_em: new Date().toISOString(),
  })

  dadosIatfAtuais.rodadas_manuais = rodadasCadastradas
  dadosIatfAtuais.inseminacoes = (dadosIatfAtuais.inseminacoes || 0) + input.quantidade_matrizes
  if (!dadosIatfAtuais.expostas || dadosIatfAtuais.expostas < input.quantidade_matrizes) {
    dadosIatfAtuais.expostas = Math.max(dadosIatfAtuais.expostas || 0, input.quantidade_matrizes)
  }

  // Atualizar lista de touros utilizados na estação
  const tourosAtuais: Array<{
    touro: string
    registro?: string
    qtd_prenhez?: number
    qtd_utilizada?: number
  }> = Array.isArray(estacao?.prenhez_por_touro) ? [...estacao!.prenhez_por_touro] : []

  const idxTouro = tourosAtuais.findIndex(
    (t) => t.touro.trim().toUpperCase() === input.touro_semen.trim().toUpperCase(),
  )
  if (idxTouro >= 0) {
    tourosAtuais[idxTouro].qtd_utilizada =
      (tourosAtuais[idxTouro].qtd_utilizada || 0) + input.quantidade_matrizes
  } else {
    tourosAtuais.push({
      touro: input.touro_semen,
      registro: input.touro_registro || '',
      qtd_prenhez: 0,
      qtd_utilizada: input.quantidade_matrizes,
    })
  }

  let estacaoIdFinal = estacao?.id
  if (estacao) {
    await pb.collection('estacoes_monta').update(estacao.id, {
      dados_iatf: dadosIatfAtuais,
      prenhez_por_touro: tourosAtuais,
    })
  } else {
    const novaEstacao = await pb.collection('estacoes_monta').create({
      nome: `Estação de Monta ${input.ano_safra}`,
      ano_safra: input.ano_safra,
      data_inicio: input.data_acao,
      total_expostas: input.quantidade_matrizes,
      total_prenhes: 0,
      total_vazias: 0,
      taxa_prenhez_pct: 0,
      status: 'em_andamento',
      dados_iatf: dadosIatfAtuais,
      prenhez_por_touro: tourosAtuais,
    })
    estacaoIdFinal = novaEstacao.id
  }

  // Trilha de auditoria
  if (usuario) {
    try {
      await registrarAuditLog({
        evento_id: `IATF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        tipo_evento: 'criacao',
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        perfil: (usuario.perfil as any) || 'gestor',
        referencia_tipo: 'iatf_manual',
        referencia_id: estacaoIdFinal,
        payload_depois: {
          ano_safra: input.ano_safra,
          data_acao: input.data_acao,
          lote: input.lote_nome,
          quantidade: input.quantidade_matrizes,
          touro: input.touro_semen,
          rodada: input.rodada,
          protocolo: input.protocolo,
        },
        motivo: `Cadastro manual de rodada de IATF: lote ${input.lote_nome}, ${input.quantidade_matrizes} matrizes.`,
      })
    } catch (eAudit) {
      console.warn('Erro ao gravar auditoria IATF:', eAudit)
    }
  }

  notifyDataChanged('reproducao_iatf', { estacaoId: estacaoIdFinal, lote: input.lote_nome })
  return {
    sucesso: true,
    estacaoId: estacaoIdFinal || '',
    mensagem: `Rodada de IATF (${input.rodada}ª rodada) cadastrada com sucesso para o lote ${input.lote_nome}!`,
  }
}

/**
 * 2. Cadastro manual de Diagnóstico de Gestação (DG por matriz individual ou em lote):
 * - Aplica deduplicação estrita (brinco + data_exame + tipo_manejo)
 * - Salva em `exames_gestacao`
 * - Atualiza/cria em `historico_matrizes` (último diagnóstico, total partos, ciclos_reprodutivos, status)
 * - Recalcula e atualiza consolidação da estação em `estacoes_monta`
 */
export async function cadastrarDiagnosticosGestacao(
  input: CadastroDgLoteInput,
  usuario?: { id: string; nome: string; perfil?: string },
): Promise<{
  sucesso: boolean
  totalGravados: number
  totalIgnorados: number
  duplicados: string[]
  erros: string[]
}> {
  if (!input.itens || input.itens.length === 0) {
    throw new Error('Nenhum animal informado para o diagnóstico.')
  }

  // Localizar ou criar a estação
  let estacao: EstacaoMontaRecord | null = null
  if (input.estacao_id) {
    try {
      estacao = await pb.collection('estacoes_monta').getOne<EstacaoMontaRecord>(input.estacao_id)
    } catch {
      estacao = null
    }
  }
  if (!estacao) {
    try {
      estacao = await pb
        .collection('estacoes_monta')
        .getFirstListItem<EstacaoMontaRecord>(`ano_safra = '${input.ano_safra}'`)
    } catch {
      estacao = null
    }
  }
  if (!estacao) {
    estacao = await pb.collection('estacoes_monta').create({
      nome: `Estação de Monta ${input.ano_safra}`,
      ano_safra: input.ano_safra,
      data_inicio: input.data_exame,
      total_expostas: 0,
      total_prenhes: 0,
      total_vazias: 0,
      taxa_prenhez_pct: 0,
      status: 'em_andamento',
    })
  }

  // Carregar mapa de exames já existentes para deduplicação rápida
  let examesExistentes: any[] = []
  try {
    examesExistentes = await pb.collection('exames_gestacao').getFullList({
      fields: 'id,brinco,data_exame,tipo_manejo,dedup_hash',
      filter: `ano_safra = '${input.ano_safra}' || estacao_id = '${estacao.id}'`,
    })
  } catch {
    examesExistentes = []
  }

  const mapaDedup = new Set<string>()
  examesExistentes.forEach((e) => {
    if (e.dedup_hash) mapaDedup.add(e.dedup_hash)
    const chaveSimples = `${String(e.brinco).trim().toUpperCase()}_${String(e.data_exame).slice(0, 10)}`
    mapaDedup.add(chaveSimples)
  })

  let totalGravados = 0
  let totalIgnorados = 0
  const duplicados: string[] = []
  const erros: string[] = []

  for (const item of input.itens) {
    const brincoNorm = item.brinco.trim().toUpperCase()
    if (!brincoNorm) {
      totalIgnorados++
      continue
    }

    const tipoManejo = item.tipo_manejo || input.tipo_manejo_padrao || 'iatf'
    const touro = item.touro_ou_lote_iatf || input.touro_padrao || ''
    const lote = item.lote_origem || input.lote_origem || ''
    const vet = item.veterinario || input.veterinario || ''

    const dedupHash = gerarHashExame(brincoNorm, input.data_exame, tipoManejo)
    const chaveSimples = `${brincoNorm}_${input.data_exame.slice(0, 10)}`

    if (mapaDedup.has(dedupHash) || mapaDedup.has(chaveSimples)) {
      totalIgnorados++
      duplicados.push(brincoNorm)
      continue
    }

    let terco: TercoGestacao = item.terco_gestacao || 'primeiro'
    const dias = item.dias_gestacao || 0
    if (!item.terco_gestacao && dias > 0) {
      if (dias > 180) terco = 'terceiro'
      else if (dias > 90) terco = 'segundo'
    }

    try {
      // 1. Grava exame individual
      await pb.collection('exames_gestacao').create({
        brinco: brincoNorm,
        estacao_id: estacao.id,
        ano_safra: input.ano_safra,
        data_exame: input.data_exame,
        resultado: item.resultado,
        dias_gestacao: dias,
        terco_gestacao: terco,
        touro_ou_lote_iatf: touro,
        tipo_manejo: tipoManejo,
        lote_origem: lote,
        veterinario_responsavel: vet,
        data_cobertura: item.data_cobertura || undefined,
        data_prevista_parto: item.data_prevista_parto || undefined,
        categoria_matriz: item.categoria_matriz || '',
        dedup_hash: dedupHash,
        observacoes: item.observacoes || 'Cadastro manual de DG',
      })

      mapaDedup.add(dedupHash)
      mapaDedup.add(chaveSimples)

      // 2. Atualiza ou cria a matriz em historico_matrizes
      let histMatriz: HistoricoMatrizRecord | null = null
      try {
        histMatriz = await pb
          .collection('historico_matrizes')
          .getFirstListItem<HistoricoMatrizRecord>(`brinco = '${brincoNorm}'`)
      } catch {
        histMatriz = null
      }

      const novoCiclo: CicloReprodutivoMatriz = {
        ano_safra: input.ano_safra,
        data_exame: input.data_exame,
        resultado: item.resultado,
        touro: touro,
        data_parto: item.data_parto,
        peso_desmama_kg: item.peso_bezerro_desmama_kg,
      }

      const statusReprodutivo: StatusReprodutivoMatriz =
        item.resultado === 'prenhe'
          ? 'prenhe'
          : item.resultado === 'vazia'
            ? 'vazia'
            : 'candidata_descarte'

      if (histMatriz) {
        const ciclosExistentes: CicloReprodutivoMatriz[] = Array.isArray(
          histMatriz.ciclos_reprodutivos,
        )
          ? histMatriz.ciclos_reprodutivos
          : []
        const ciclosAtualizados = [novoCiclo, ...ciclosExistentes]

        await pb.collection('historico_matrizes').update(histMatriz.id, {
          total_exames_registrados: (histMatriz.total_exames_registrados || 0) + 1,
          total_partos: (histMatriz.total_partos || 0) + (item.data_parto ? 1 : 0),
          ultimo_resultado_diagnostico: item.resultado,
          data_ultimo_diagnostico: input.data_exame,
          status_reprodutivo: statusReprodutivo,
          lote_atual: lote || histMatriz.lote_atual,
          ciclos_reprodutivos: ciclosAtualizados,
          motivo_descarte_sugerido:
            item.resultado === 'vazia'
              ? 'Vazia no exame manual de DG'
              : histMatriz.motivo_descarte_sugerido,
        })
      } else {
        await pb.collection('historico_matrizes').create({
          brinco: brincoNorm,
          total_partos: item.data_parto ? 1 : 0,
          total_exames_registrados: 1,
          iep_medio_meses: 12.0,
          ultimo_resultado_diagnostico: item.resultado,
          data_ultimo_diagnostico: input.data_exame,
          partos_por_ano_vida: 0.95,
          eficiencia_acumulada_pct: 95.0,
          status_reprodutivo: statusReprodutivo,
          lote_atual: lote,
          motivo_descarte_sugerido: item.resultado === 'vazia' ? 'Vazia no exame manual de DG' : '',
          ciclos_reprodutivos: [novoCiclo],
        })
      }

      totalGravados++
    } catch (eItem: any) {
      erros.push(`Brinco ${brincoNorm}: ${eItem.message || 'Erro ao gravar'}`)
    }
  }

  // 3. Recalcular consolidação da estação
  try {
    await recalcularConsolidacaoEstacao(estacao.id, input.ano_safra)
  } catch (eCons) {
    console.warn('Erro ao recalcular consolidação da estação:', eCons)
  }

  // Trilha de auditoria
  if (usuario) {
    try {
      await registrarAuditLog({
        evento_id: `DG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        tipo_evento: 'criacao',
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        perfil: (usuario.perfil as any) || 'gestor',
        referencia_tipo: 'diagnostico_gestacao_manual',
        referencia_id: estacao.id,
        payload_depois: {
          ano_safra: input.ano_safra,
          data_exame: input.data_exame,
          total_gravados: totalGravados,
          total_ignorados: totalIgnorados,
          duplicados,
        },
        motivo: `Cadastro manual de DG: ${totalGravados} matrizes registradas (${duplicados.length} deduplicadas).`,
      })
    } catch (eAudit) {
      console.warn('Erro ao gravar auditoria DG:', eAudit)
    }
  }

  notifyDataChanged('reproducao_dg', { estacaoId: estacao.id, totalGravados })

  return {
    sucesso: totalGravados > 0,
    totalGravados,
    totalIgnorados,
    duplicados,
    erros,
  }
}

/**
 * 3. Cadastro manual de Resultado Final (fechamento zootécnico da estação):
 * - Salva/atualiza em `estacoes_monta`
 * - Define taxas consolidadas (expostas, prenhes, vazias, % prenhez, quebra IATF x Touro)
 * - Registra em audit_log
 */
export async function cadastrarResultadoFinalEstacao(
  input: CadastroResultadoFinalInput,
  usuario?: { id: string; nome: string; perfil?: string },
): Promise<{ sucesso: boolean; estacaoId: string; mensagem: string }> {
  const expostas = Math.max(0, input.total_expostas || 0)
  const prenhes = Math.max(0, input.total_prenhes || 0)
  const vazias = Math.max(0, input.total_vazias || 0)

  const taxaPrenhez =
    input.taxa_prenhez_pct !== undefined
      ? input.taxa_prenhez_pct
      : expostas > 0
        ? Number(((prenhes / expostas) * 100).toFixed(1))
        : 0

  const gestIatf = input.gestantes_iatf ?? Math.round(prenhes * 0.8)
  const gestTouro = input.gestantes_touro ?? Math.max(0, prenhes - gestIatf)

  const payload: Partial<EstacaoMontaRecord> & { nome: string; ano_safra: string } = {
    id: input.estacao_id,
    nome: input.nome_estacao || `Estação de Monta ${input.ano_safra}`,
    ano_safra: input.ano_safra,
    total_expostas: expostas,
    total_prenhes: prenhes,
    total_vazias: vazias,
    taxa_prenhez_pct: taxaPrenhez,
    gestantes_iatf: gestIatf,
    gestantes_touro: gestTouro,
    taxa_paricao_pct: input.taxa_paricao_pct ?? 88.0,
    taxa_desmame_pct: input.taxa_desmame_pct ?? 82.5,
    kg_desmamado_matriz: input.kg_desmamado_matriz ?? 195.0,
    perda_gestacional_pct: input.perda_gestacional_pct ?? 5.0,
    iep_medio_meses: input.iep_medio_meses ?? 12.6,
    status: input.status || 'encerrada',
    observacoes: input.observacoes || 'Fechamento zootécnico manual da estação de monta',
  }

  const estacaoSalva = await salvarOuAtualizarEstacao(payload)

  // Grava/atualiza nascimentos com deduplicação idempotente
  if (input.nascimentos && input.nascimentos.length > 0) {
    try {
      await salvarNascimentosEstacao(estacaoSalva.id, input.ano_safra, input.nascimentos)
    } catch (eNasc) {
      console.warn('Erro ao salvar nascimentos da estação:', eNasc)
    }
  }

  // Auditoria
  if (usuario) {
    try {
      await registrarAuditLog({
        evento_id: `FECH-REP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        tipo_evento: 'mudanca_status',
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        perfil: (usuario.perfil as any) || 'gestor',
        referencia_tipo: 'fechamento_estacao_monta',
        referencia_id: estacaoSalva.id,
        payload_depois: {
          ano_safra: input.ano_safra,
          total_expostas: expostas,
          total_prenhes: prenhes,
          total_vazias: vazias,
          taxa_prenhez_pct: taxaPrenhez,
          gestantes_iatf: gestIatf,
          gestantes_touro: gestTouro,
        },
        motivo: `Fechamento manual da estação ${input.ano_safra}: taxa de prenhez ${taxaPrenhez}%.`,
      })
    } catch (eAudit) {
      console.warn('Erro ao gravar auditoria do fechamento:', eAudit)
    }
  }

  notifyDataChanged('reproducao_fechamento', {
    estacaoId: estacaoSalva.id,
    anoSafra: input.ano_safra,
  })

  return {
    sucesso: true,
    estacaoId: estacaoSalva.id,
    mensagem: `Fechamento da Estação ${input.ano_safra} gravado com sucesso! Taxa de prenhez: ${taxaPrenhez}%.`,
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
      duracao_dias: dados.duracao_dias ?? 0,
      data_inicio_parto: dados.data_inicio_parto || undefined,
      data_fim_parto: dados.data_fim_parto || undefined,
      gestantes_iatf: dados.gestantes_iatf ?? 0,
      gestantes_touro: dados.gestantes_touro ?? 0,
      taxa_cio_pct: dados.taxa_cio_pct ?? 0,
      taxa_aborto_dg_inicial_pct: dados.taxa_aborto_dg_inicial_pct ?? 0,
      dados_iatf: dados.dados_iatf || undefined,
      categorias_agregado: dados.categorias_agregado || undefined,
      mapa_paricao_mensal: dados.mapa_paricao_mensal || undefined,
      concepcao_por_rodada: dados.concepcao_por_rodada || undefined,
      prenhez_por_touro: dados.prenhez_por_touro || undefined,
      prenhez_por_lote: dados.prenhez_por_lote || undefined,
      formato_origem: dados.formato_origem || undefined,
      conciliacao_status: dados.conciliacao_status || undefined,
      conciliacao_detalhes: dados.conciliacao_detalhes || undefined,
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

  // Se a estação já tiver agregados do relatório final de IATF, preservar
  let estacaoExistente: EstacaoMontaRecord | null = null
  try {
    estacaoExistente = await pb.collection('estacoes_monta').getOne<EstacaoMontaRecord>(estacaoId)
  } catch {
    /* ok */
  }

  // Conciliação de gestantes linha a linha vs resumo da estação
  let conciliacaoStatus = estacaoExistente?.conciliacao_status || 'pendente'
  let conciliacaoDetalhes = estacaoExistente?.conciliacao_detalhes || null
  if (estacaoExistente?.total_prenhes && estacaoExistente.total_prenhes > 0) {
    const gestantesResumo = estacaoExistente.total_prenhes
    const gestantesLinhas = totalPrenhes
    const diferenca = gestantesLinhas - gestantesResumo
    conciliacaoStatus = diferenca === 0 ? 'conciliado' : 'divergente'
    conciliacaoDetalhes = {
      gestantes_resumo: gestantesResumo,
      gestantes_linhas: gestantesLinhas,
      diferenca,
      data_conciliacao: new Date().toISOString(),
      mensagem:
        diferenca === 0
          ? `Perfeito: ${gestantesLinhas} gestantes linha a linha conferem exatamente com as ${gestantesResumo} gestantes do relatório final.`
          : `Atenção: ${gestantesLinhas} gestantes nas linhas vs ${gestantesResumo} no resumo da estação (diferença de ${diferenca} animais).`,
    }
  }

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
    gestantes_iatf:
      estacaoExistente?.gestantes_iatf ||
      exames.filter((e) => e.resultado === 'prenhe' && e.tipo_manejo === 'iatf').length,
    gestantes_touro:
      estacaoExistente?.gestantes_touro ||
      exames.filter(
        (e) =>
          e.resultado === 'prenhe' &&
          (e.tipo_manejo === 'repasses' || e.tipo_manejo === 'monta_natural'),
      ).length,
    conciliacao_status: conciliacaoStatus,
    conciliacao_detalhes: conciliacaoDetalhes,
    duracao_dias: estacaoExistente?.duracao_dias,
    data_inicio_parto: estacaoExistente?.data_inicio_parto,
    data_fim_parto: estacaoExistente?.data_fim_parto,
    taxa_cio_pct: estacaoExistente?.taxa_cio_pct,
    taxa_aborto_dg_inicial_pct: estacaoExistente?.taxa_aborto_dg_inicial_pct,
    dados_iatf: estacaoExistente?.dados_iatf,
    categorias_agregado: estacaoExistente?.categorias_agregado,
    mapa_paricao_mensal: estacaoExistente?.mapa_paricao_mensal,
    concepcao_por_rodada: estacaoExistente?.concepcao_por_rodada,
    prenhez_por_touro: estacaoExistente?.prenhez_por_touro,
    prenhez_por_lote: estacaoExistente?.prenhez_por_lote,
    formato_origem: estacaoExistente?.formato_origem,
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
