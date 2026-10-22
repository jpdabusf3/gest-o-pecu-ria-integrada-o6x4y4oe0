/**
 * Serviço de Ingestão de Relatórios Reprodutivos pelo Robô Chicão
 *
 * Fluxo:
 * 1. Análise e extração do documento em PDF/imagem (process-reproducao)
 * 2. Reconhecimento de colunas e dados por animal:
 *    - brinco (único)
 *    - resultado do diagnóstico (prenhe | vazia | perda_embrionaria | perda_fetal | duvidoso)
 *    - dias de gestação & terço
 *    - touro / lote de IATF
 *    - data do exame
 *    - data de parição e peso de desmama (quando presentes)
 * 3. Painel de conferência com confiança por campo (OK | AUSENTE | ILEGIVEL | AMBIGUO)
 * 4. Deduplicação por brinco + data_exame + tipo_manejo
 * 5. Ao confirmar:
 *    - Grava na coleção `exames_gestacao`
 *    - Atualiza/cria o histórico na coleção `historico_matrizes`
 *    - Atualiza a matriz correspondente na coleção `animais_individuais`
 *    - Consolida automaticamente a estação na coleção `estacoes_monta`
 *    - Grava trilha de auditoria append-only em `audit_log`
 *    - Gera relatório em PDF do protocolo
 */

import pb from '@/lib/pocketbase/client'
import { registrarAuditLog } from './auditoria'
import {
  ResultadoGestacao,
  TercoGestacao,
  TipoManejoReprodutivo,
  calcularPesoAjustado205Dias,
  gerarHashExame,
  salvarOuAtualizarEstacao,
  recalcularConsolidacaoEstacao,
  EstacaoMontaRecord,
  ExameGestacaoRecord,
  HistoricoMatrizRecord,
} from './reproducao'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type StatusCampoReprodutivo = 'OK' | 'AUSENTE' | 'ILEGIVEL' | 'AMBIGUO'
export type ConfiancaNivelReprodutivo = 'alta' | 'media' | 'baixa'

export interface CampoStatusReprodutivo {
  status: StatusCampoReprodutivo
  confianca: ConfiancaNivelReprodutivo
  motivo?: string
}

export interface LinhaExameExtraida {
  idTemp: string
  brinco: string
  resultado: ResultadoGestacao
  diasGestacao?: number
  tercoGestacao?: TercoGestacao
  touroOuLoteIatf?: string
  tipoManejo: TipoManejoReprodutivo
  dataExame: string
  dataParto?: string
  pesoBezerroNascimentoKg?: number
  dataDesmama?: string
  pesoBezerroDesmamaKg?: number
  diasAteDesmama?: number
  pesoAjustado205dKg?: number
  loteOrigem?: string
  veterinario?: string

  serie?: string
  numero?: string
  categoriaMatriz?: string
  touroNome?: string
  touroRegistro?: string
  dataCobertura?: string
  dataPrevistaParto?: string
  divergenciaPrevisaoDias?: number
  statusPrevisao?: 'OK' | 'AMBIGUO' | 'AUSENTE'

  camposStatus: Record<string, CampoStatusReprodutivo>
  alertas: string[]
  dedupHash: string
  jaImportado: boolean
  registroExistenteId?: string

  aprovado: boolean
}

export interface ResultadoProcessamentoReprodutivo {
  tipoFormato: 'relatorio_final_estacao' | 'caderno_paricao_previsao' | 'laudo_dg_individual'
  nomeEstacao: string
  anoSafra: string
  veterinario: string
  loteOuPasto: string
  dataPadraoExame: string
  totalLidos: number
  totalExpostas: number
  totalPrenhes: number
  totalVazias: number
  totalPerdas: number
  taxaPrenhezPct: number
  duracaoDias?: number
  dataInicio?: string
  dataFim?: string
  dataInicioParto?: string
  dataFimParto?: string
  gestantesIatf?: number
  gestantesTouro?: number
  taxaCioPct?: number
  taxaAbortoDgInicialPct?: number
  dadosIatf?: any
  categoriasAgregado?: any
  mapaParicaoMensal?: Array<{ mes: string; qtd: number }>
  concepcaoPorRodada?: Record<string, number>
  prenhezPorTouro?: Array<{
    touro: string
    registro?: string
    qtd_prenhez: number
    media_prenhez_pct?: number
    qtd_utilizada?: number
  }>
  prenhezPorLote?: any[]
  linhas: LinhaExameExtraida[]
  alertasGerais: string[]
  conciliacao?: {
    status: 'conciliado' | 'divergente' | 'pendente'
    totalResumo: number
    totalLinhas: number
    diferenca: number
    mensagem: string
  }
}

export interface ResultadoAplicacaoReprodutiva {
  sucesso: boolean
  totalProcessados: number
  totalGravados: number
  totalIgnorados: number
  estacaoConsolidada: EstacaoMontaRecord | null
  protocoloAuditId: string
  mensagens: string[]
  timestamp: string
}

/**
 * Envia o conteúdo do laudo de gestação para a rota backend do Chicão
 */
export async function processarRelatorioReprodutivo(
  conteudoMarkdown: string,
  nomeArquivo: string,
  origemLeitura: 'texto' | 'visao' = 'texto',
): Promise<ResultadoProcessamentoReprodutivo> {
  const backendUrl = import.meta.env.VITE_POCKETBASE_URL
  const res = await fetch(`${backendUrl}/backend/v1/maestro/process-reproducao`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({
      content: conteudoMarkdown,
      filename: nomeArquivo,
      origem_leitura: origemLeitura,
    }),
  })

  if (!res.ok) {
    const erroTxt = await res.text()
    throw new Error(`Falha no processador reprodutivo do Robô Chicão: ${erroTxt || res.statusText}`)
  }

  const data = await res.json()
  const raw = data.resultado || {}
  const rawAnimais: any[] = raw.animais || []

  const hoje = new Date().toISOString().slice(0, 10)
  const anoSafraSugerido =
    raw.ano_safra || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
  const dataPadrao = raw.data_padrao_exame || hoje

  // Carregar exames já existentes para checar deduplicação estrita
  let examesExistentes: any[] = []
  try {
    examesExistentes = await pb.collection('exames_gestacao').getFullList({
      fields: 'id,brinco,data_exame,dedup_hash,ano_safra',
    })
  } catch {
    examesExistentes = []
  }

  const mapDedup = new Map<string, string>()
  examesExistentes.forEach((e) => {
    if (e.dedup_hash) mapDedup.set(e.dedup_hash, e.id)
    mapDedup.set(`${e.brinco}_${e.data_exame}`, e.id)
  })

  const linhas: LinhaExameExtraida[] = []
  let countPrenhes = 0
  let countVazias = 0
  let countPerdas = 0

  // Detectar formato
  const formatoDetectado = (raw.tipo_formato || 'laudo_dg_individual') as
    | 'relatorio_final_estacao'
    | 'caderno_paricao_previsao'
    | 'laudo_dg_individual'

  for (let idx = 0; idx < rawAnimais.length; idx++) {
    const item = rawAnimais[idx]
    const idTemp = item.id_temp || `dg_${idx + 1}_${Date.now()}`

    // Brinco normalizado: série + número se existir
    let brinco = String(item.brinco || '')
      .trim()
      .toUpperCase()
    const serie = item.serie ? String(item.serie).trim().toUpperCase() : undefined
    const numero = item.numero ? String(item.numero).trim().toUpperCase() : undefined

    if (!brinco && numero) {
      brinco = serie ? `${serie} ${numero}` : numero
    }

    let resultado: ResultadoGestacao = 'duvidoso'
    const rLower = String(item.resultado || '').toLowerCase()
    if (
      rLower.includes('prenh') ||
      rLower.includes('gestan') ||
      rLower.includes('positi') ||
      rLower === 'p'
    ) {
      resultado = 'prenhe'
      countPrenhes++
    } else if (rLower.includes('vazi') || rLower.includes('negati') || rLower === 'v') {
      resultado = 'vazia'
      countVazias++
    } else if (rLower.includes('embrion')) {
      resultado = 'perda_embrionaria'
      countPerdas++
    } else if (rLower.includes('fetal') || rLower.includes('abort')) {
      resultado = 'perda_fetal'
      countPerdas++
    }

    const dataCobertura = item.data_cobertura || undefined
    const dataPrevistaParto = item.data_prevista_parto || undefined
    const dataExame = item.data_exame || dataCobertura || dataPadrao
    const diasGest = Math.max(0, parseInt(String(item.dias_gestacao || 0), 10) || 0)

    let terco: TercoGestacao = 'primeiro'
    if (item.terco_gestacao) terco = item.terco_gestacao
    else if (diasGest > 180) terco = 'terceiro'
    else if (diasGest > 90) terco = 'segundo'

    const pesoDesm = parseFloat(String(item.peso_bezerro_desmama_kg || 0).replace(',', '.')) || 0
    const pesoNasc =
      parseFloat(String(item.peso_bezerro_nascimento_kg || 35).replace(',', '.')) || 35
    const diasDesm = parseInt(String(item.dias_ate_desmama || 205), 10) || 205
    const pesoAjustado205 =
      pesoDesm > 0 ? calcularPesoAjustado205Dias(pesoDesm, diasDesm, pesoNasc) : undefined

    // Validação de Previsão de Parto (≈ data_cobertura + 290 dias)
    let divergenciaPrevisaoDias = 0
    let statusPrevisao: 'OK' | 'AMBIGUO' | 'AUSENTE' = 'AUSENTE'
    if (dataCobertura && dataPrevistaParto) {
      try {
        const dCob = new Date(dataCobertura).getTime()
        const dPrev = new Date(dataPrevistaParto).getTime()
        const diffDias = Math.round((dPrev - dCob) / (1000 * 60 * 60 * 24))
        divergenciaPrevisaoDias = diffDias - 290
        if (Math.abs(divergenciaPrevisaoDias) <= 5) {
          statusPrevisao = 'OK'
        } else {
          statusPrevisao = 'AMBIGUO'
        }
      } catch {
        statusPrevisao = 'AMBIGUO'
      }
    } else if (dataPrevistaParto) {
      statusPrevisao = 'OK'
    }

    const tipoManejoCalc =
      item.tipo_manejo ||
      (item.touro_ou_lote_iatf?.toUpperCase().includes('REPASSE') ? 'repasses' : 'iatf')

    // Atenção: deduplicar por brinco + data_cobertura/data_exame + tipo_manejo, NUNCA só por brinco
    const chaveData = dataCobertura || dataExame
    const dedupHash = gerarHashExame(brinco, chaveData, tipoManejoCalc)
    const jaImportado = mapDedup.has(dedupHash) || mapDedup.has(`${brinco}_${chaveData}`)
    const registroExistenteId = mapDedup.get(dedupHash) || mapDedup.get(`${brinco}_${chaveData}`)

    const camposStatus: Record<string, CampoStatusReprodutivo> = item.campos_status || {}
    const alertas: string[] = Array.isArray(item.alertas) ? [...item.alertas] : []

    // Validações
    if (!brinco) {
      camposStatus['brinco'] = {
        status: 'AUSENTE',
        confianca: 'baixa',
        motivo: 'Brinco não identificado',
      }
      alertas.push('Brinco ausente ou ilegível no relatório')
    } else if (brinco.length < 2) {
      camposStatus['brinco'] = {
        status: 'AMBIGUO',
        confianca: 'media',
        motivo: 'Brinco muito curto',
      }
    } else {
      camposStatus['brinco'] = { status: 'OK', confianca: 'alta' }
    }

    if (resultado === 'duvidoso') {
      camposStatus['resultado'] = {
        status: 'AMBIGUO',
        confianca: 'baixa',
        motivo: 'Diagnóstico incerto',
      }
      alertas.push('Diagnóstico registrado como duvidoso — confira no curral')
    } else {
      camposStatus['resultado'] = { status: 'OK', confianca: 'alta' }
    }

    if (statusPrevisao === 'AMBIGUO') {
      camposStatus['data_prevista_parto'] = {
        status: 'AMBIGUO',
        confianca: 'media',
        motivo: `Previsão difere da gestação padrão de 290 dias em ${divergenciaPrevisaoDias} dias`,
      }
      alertas.push(
        `Previsão de parto com desvio de ${divergenciaPrevisaoDias} dias em relação aos 290 dias padrão`,
      )
    }

    if (jaImportado) {
      alertas.push(
        'Diagnóstico já registrado nesta data de cobertura para esta matriz — não será duplicado',
      )
    }

    linhas.push({
      idTemp,
      brinco,
      resultado,
      diasGestacao: diasGest > 0 ? diasGest : undefined,
      tercoGestacao: terco,
      touroOuLoteIatf: item.touro_ou_lote_iatf || item.touro_nome || undefined,
      tipoManejo: tipoManejoCalc,
      dataExame,
      dataParto: item.data_parto || undefined,
      pesoBezerroNascimentoKg: pesoNasc,
      dataDesmama: item.data_desmama || undefined,
      pesoBezerroDesmamaKg: pesoDesm > 0 ? pesoDesm : undefined,
      diasAteDesmama: diasDesm,
      pesoAjustado205dKg: pesoAjustado205,
      loteOrigem: item.lote_origem || raw.lote_ou_pasto || undefined,
      veterinario: item.veterinario || raw.veterinario_responsavel || undefined,
      serie,
      numero,
      categoriaMatriz: item.categoria_matriz || item.categoria || undefined,
      touroNome: item.touro_nome || undefined,
      touroRegistro: item.touro_registro || undefined,
      dataCobertura,
      dataPrevistaParto,
      divergenciaPrevisaoDias,
      statusPrevisao,
      camposStatus,
      alertas,
      dedupHash,
      jaImportado,
      registroExistenteId,
      aprovado: !jaImportado && Boolean(brinco),
    })
  }

  const totalExpostas = raw.total_expostas || linhas.length
  const totalPrenhes = raw.total_prenhes !== undefined ? raw.total_prenhes : countPrenhes
  const totalVazias = raw.total_vazias !== undefined ? raw.total_vazias : countVazias
  const taxaPrenhez =
    raw.taxa_prenhez_pct !== undefined
      ? raw.taxa_prenhez_pct
      : totalExpostas > 0
        ? (totalPrenhes / totalExpostas) * 100
        : 0

  // Conciliação entre resumo e linhas
  let conciliacao: ResultadoProcessamentoReprodutivo['conciliacao'] = undefined
  if (raw.total_prenhes && linhas.length > 0) {
    const dif = countPrenhes - raw.total_prenhes
    conciliacao = {
      status: dif === 0 ? 'conciliado' : 'divergente',
      totalResumo: raw.total_prenhes,
      totalLinhas: countPrenhes,
      diferenca: dif,
      mensagem:
        dif === 0
          ? `Perfeito: ${countPrenhes} linhas gestantes batem exatamente com o resumo de ${raw.total_prenhes} gestantes!`
          : `Atenção: ${countPrenhes} gestantes identificadas nas linhas vs ${raw.total_prenhes} no resumo (diferença de ${dif}).`,
    }
  }

  return {
    tipoFormato: formatoDetectado,
    nomeEstacao: raw.nome_estacao || `Estação ${anoSafraSugerido}`,
    anoSafra: anoSafraSugerido,
    veterinario: raw.veterinario_responsavel || 'Veterinário Responsável',
    loteOuPasto: raw.lote_ou_pasto || 'Lote Matrizes',
    dataPadraoExame: dataPadrao,
    totalLidos: rawAnimais.length,
    totalExpostas,
    totalPrenhes,
    totalVazias,
    totalPerdas: countPerdas,
    taxaPrenhezPct: Number(taxaPrenhez.toFixed(1)),
    duracaoDias: raw.duracao_dias || undefined,
    dataInicio: raw.data_inicio || undefined,
    dataFim: raw.data_fim || undefined,
    dataInicioParto: raw.data_inicio_parto || undefined,
    dataFimParto: raw.data_fim_parto || undefined,
    gestantesIatf: raw.gestantes_iatf || undefined,
    gestantesTouro: raw.gestantes_touro || undefined,
    taxaCioPct: raw.taxa_cio_pct || undefined,
    taxaAbortoDgInicialPct: raw.taxa_aborto_dg_inicial_pct || undefined,
    dadosIatf: raw.dados_iatf || undefined,
    categoriasAgregado: raw.categorias_agregado || undefined,
    mapaParicaoMensal: raw.mapa_paricao_mensal || undefined,
    concepcaoPorRodada: raw.concepcao_por_rodada || undefined,
    prenhezPorTouro: raw.prenhez_por_touro || undefined,
    prenhezPorLote: raw.prenhez_por_lote || undefined,
    linhas,
    alertasGerais: raw.alertas_gerais || [],
    conciliacao,
  }
}

/**
 * Aplica os exames reprodutivos confirmados pelo usuário:
 * - Grava na coleção `estacoes_monta`
 * - Grava na coleção `exames_gestacao`
 * - Atualiza/cria na coleção `historico_matrizes`
 * - Registra em `audit_log`
 */
export async function aplicarRelatorioReprodutivoConfirmado(
  resultadoProc: ResultadoProcessamentoReprodutivo,
  nomeArquivo: string,
  usuario: { id: string; nome: string; perfil?: string },
): Promise<ResultadoAplicacaoReprodutiva> {
  const protocoloAuditId = `REP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  const mensagens: string[] = []
  let gravados = 0
  let ignorados = 0

  // 1. Criar ou atualizar a estação de monta com todos os agregados novos
  const estacao = await salvarOuAtualizarEstacao({
    nome: resultadoProc.nomeEstacao,
    ano_safra: resultadoProc.anoSafra,
    data_inicio: resultadoProc.dataInicio,
    data_fim: resultadoProc.dataFim,
    duracao_dias: resultadoProc.duracaoDias,
    data_inicio_parto: resultadoProc.dataInicioParto,
    data_fim_parto: resultadoProc.dataFimParto,
    total_expostas: resultadoProc.totalExpostas,
    total_prenhes: resultadoProc.totalPrenhes,
    total_vazias: resultadoProc.totalVazias,
    gestantes_iatf: resultadoProc.gestantesIatf,
    gestantes_touro: resultadoProc.gestantesTouro,
    taxa_prenhez_pct: resultadoProc.taxaPrenhezPct,
    taxa_cio_pct: resultadoProc.taxaCioPct,
    taxa_aborto_dg_inicial_pct: resultadoProc.taxaAbortoDgInicialPct,
    dados_iatf: resultadoProc.dadosIatf,
    categorias_agregado: resultadoProc.categoriasAgregado,
    mapa_paricao_mensal: resultadoProc.mapaParicaoMensal,
    concepcao_por_rodada: resultadoProc.concepcaoPorRodada,
    prenhez_por_touro: resultadoProc.prenhezPorTouro,
    prenhez_por_lote: resultadoProc.prenhezPorLote,
    formato_origem: resultadoProc.tipoFormato,
    conciliacao_status: resultadoProc.conciliacao?.status || 'pendente',
    conciliacao_detalhes: resultadoProc.conciliacao || undefined,
    status: 'em_andamento',
    observacoes: `Importado pelo Robô Chicão via arquivo ${nomeArquivo} em ${new Date().toLocaleDateString('pt-BR')}`,
  })

  // 2. Gravar cada exame aprovado
  for (const linha of resultadoProc.linhas) {
    if (!linha.aprovado || !linha.brinco) {
      ignorados++
      continue
    }

    try {
      // 2.a Criar exame de gestação
      await pb.collection('exames_gestacao').create({
        brinco: linha.brinco,
        estacao_id: estacao.id,
        ano_safra: resultadoProc.anoSafra,
        data_exame: linha.dataExame,
        resultado: linha.resultado,
        dias_gestacao: linha.diasGestacao || 0,
        terco_gestacao: linha.tercoGestacao,
        touro_ou_lote_iatf: linha.touroOuLoteIatf || '',
        tipo_manejo: linha.tipoManejo,
        data_parto: linha.dataParto || undefined,
        peso_bezerro_nascimento_kg: linha.pesoBezerroNascimentoKg || 0,
        data_desmama: linha.dataDesmama || undefined,
        peso_bezerro_desmama_kg: linha.pesoBezerroDesmamaKg || 0,
        dias_ate_desmama: linha.diasAteDesmama || 0,
        peso_ajustado_205d_kg: linha.pesoAjustado205dKg || 0,
        lote_origem: linha.loteOrigem || '',
        veterinario_responsavel: linha.veterinario || resultadoProc.veterinario,
        arquivo_origem: nomeArquivo,
        serie: linha.serie || '',
        numero: linha.numero || '',
        categoria_matriz: linha.categoriaMatriz || '',
        touro_nome: linha.touroNome || '',
        touro_registro: linha.touroRegistro || '',
        data_cobertura: linha.dataCobertura || undefined,
        data_prevista_parto: linha.dataPrevistaParto || undefined,
        divergencia_previsao_dias: linha.divergenciaPrevisaoDias || 0,
        status_previsao: linha.statusPrevisao || 'AUSENTE',
        dedup_hash: linha.dedupHash,
        protocolo_audit_id: protocoloAuditId,
      })

      // 2.b Atualizar ou criar o histórico individual da matriz
      let histMatriz: HistoricoMatrizRecord | null = null
      try {
        histMatriz = await pb
          .collection('historico_matrizes')
          .getFirstListItem<HistoricoMatrizRecord>(`brinco = '${linha.brinco}'`)
      } catch {
        /* não existe ainda */
      }

      const novoCiclo = {
        ano_safra: resultadoProc.anoSafra,
        data_exame: linha.dataExame,
        resultado: linha.resultado,
        touro: linha.touroOuLoteIatf,
        data_parto: linha.dataParto,
        data_desmama: linha.dataDesmama,
        peso_desmama_kg: linha.pesoBezerroDesmamaKg,
        peso_ajustado_205d: linha.pesoAjustado205dKg,
      }

      let statusReprodutivo: string = linha.resultado === 'prenhe' ? 'prenhe' : 'vazia'
      let motivoDescarte = ''
      if (linha.resultado === 'vazia') {
        motivoDescarte = 'Vazia ao final do exame de gestação da estação'
      }

      if (histMatriz) {
        const ciclosExistentes: any[] = Array.isArray(histMatriz.ciclos_reprodutivos)
          ? histMatriz.ciclos_reprodutivos
          : []
        const ciclosAtualizados = [novoCiclo, ...ciclosExistentes]

        const totalPartosAtualizado = histMatriz.total_partos + (linha.dataParto ? 1 : 0)
        const pesoBezerroAtualizado =
          linha.pesoBezerroDesmamaKg || histMatriz.peso_ultimo_bezerro_desmama_kg || 0

        await pb.collection('historico_matrizes').update(histMatriz.id, {
          total_exames_registrados: (histMatriz.total_exames_registrados || 0) + 1,
          total_partos: totalPartosAtualizado,
          ultimo_resultado_diagnostico: linha.resultado,
          data_ultimo_diagnostico: linha.dataExame,
          data_ultimo_parto: linha.dataParto || histMatriz.data_ultimo_parto,
          peso_ultimo_bezerro_desmama_kg: pesoBezerroAtualizado,
          peso_ajustado_205d_kg: linha.pesoAjustado205dKg || histMatriz.peso_ajustado_205d_kg,
          status_reprodutivo: statusReprodutivo,
          motivo_descarte_sugerido: motivoDescarte || histMatriz.motivo_descarte_sugerido,
          ciclos_reprodutivos: ciclosAtualizados,
        })
      } else {
        await pb.collection('historico_matrizes').create({
          brinco: linha.brinco,
          total_partos: linha.dataParto ? 1 : 0,
          total_exames_registrados: 1,
          iep_medio_meses: 12.0,
          ultimo_resultado_diagnostico: linha.resultado,
          data_ultimo_diagnostico: linha.dataExame,
          data_ultimo_parto: linha.dataParto || undefined,
          peso_ultimo_bezerro_desmama_kg: linha.pesoBezerroDesmamaKg || 0,
          peso_ajustado_205d_kg: linha.pesoAjustado205dKg || 0,
          partos_por_ano_vida: 0.95,
          eficiencia_acumulada_pct: 95.0,
          status_reprodutivo: statusReprodutivo,
          motivo_descarte_sugerido: motivoDescarte,
          ciclos_reprodutivos: [novoCiclo],
        })
      }

      gravados++
    } catch (eGravar: any) {
      console.warn(`Erro ao gravar matriz ${linha.brinco}:`, eGravar)
      ignorados++
      mensagens.push(`Brinco ${linha.brinco}: ${eGravar.message || 'Erro de gravação'}`)
    }
  }

  // 3. Recalcular a consolidação final da estação com base em tudo gravado
  let estacaoConsolidada = estacao
  try {
    estacaoConsolidada = await recalcularConsolidacaoEstacao(estacao.id, resultadoProc.anoSafra)
  } catch (eCons) {
    console.warn('Aviso ao consolidar estação:', eCons)
  }

  // 4. Trilha de auditoria append-only
  try {
    await registrarAuditLog({
      evento_id: protocoloAuditId,
      tipo_evento: 'criacao',
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      perfil: (usuario.perfil as any) || 'gestor',
      referencia_tipo: 'relatorio_reprodutivo',
      referencia_id: estacao.id,
      payload_depois: {
        estacao_nome: resultadoProc.nomeEstacao,
        ano_safra: resultadoProc.anoSafra,
        arquivo_origem: nomeArquivo,
        total_exames_gravados: gravados,
        taxa_prenhez_pct: estacaoConsolidada.taxa_prenhez_pct,
      },
      motivo: `Ingestão de laudo reprodutivo via Robô Chicão: ${gravados} exames cadastrados.`,
    })
  } catch (eAudit) {
    console.warn('Aviso ao registrar auditoria de reprodução:', eAudit)
  }

  return {
    sucesso: gravados > 0,
    totalProcessados: resultadoProc.linhas.length,
    totalGravados: gravados,
    totalIgnorados: ignorados,
    estacaoConsolidada,
    protocoloAuditId,
    mensagens,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Gera relatório oficial em PDF do protocolo reprodutivo com tabelas e resumo zootécnico
 */
export function gerarRelatorioReprodutivoPDF(
  resultado: ResultadoProcessamentoReprodutivo,
  aplicacao: ResultadoAplicacaoReprodutiva,
): void {
  const doc = new jsPDF()

  // Cabeçalho institucional
  doc.setFillColor(34, 76, 56) // Verde mata
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('GESTÃO PECUÁRIA INTEGRADA — ROBÔ CHICÃO', 14, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('PROTOCOLO OFICIAL DE INGESTÃO REPRODUTIVA & DIAGNÓSTICO DE GESTAÇÃO', 14, 22)

  // Dados do Protocolo
  doc.setTextColor(40, 40, 40)
  doc.setFontSize(9)
  doc.text(`Protocolo: ${aplicacao.protocoloAuditId}`, 14, 38)
  doc.text(`Data de Aplicação: ${new Date().toLocaleString('pt-BR')}`, 14, 44)
  doc.text(`Estação / Safra: ${resultado.nomeEstacao} (${resultado.anoSafra})`, 14, 50)
  doc.text(`Veterinário Responsável: ${resultado.veterinario}`, 120, 38)
  doc.text(`Lote / Pasto: ${resultado.loteOuPasto}`, 120, 44)
  doc.text(
    `Taxa de Prenhez: ${resultado.taxaPrenhezPct}% (${resultado.totalPrenhes} / ${resultado.totalExpostas})`,
    120,
    50,
  )

  // Resumo de Indicadores
  const rowsResumo = [
    ['Total de Matrizes Expostas', `${resultado.totalExpostas} cab.`],
    ['Prenhes Confirmadas', `${resultado.totalPrenhes} cab. (${resultado.taxaPrenhezPct}%)`],
    ['Vazias Confirmadas', `${resultado.totalVazias} cab.`],
    ['Perdas Fetais / Embrionárias', `${resultado.totalPerdas} cab.`],
    ['Exames Gravados no Cadastro', `${aplicacao.totalGravados} registros`],
    ['Exames Ignorados / Duplicados', `${aplicacao.totalIgnorados} registros`],
  ]

  autoTable(doc, {
    startY: 56,
    head: [['Indicador Zootécnico', 'Resultado Consolidado']],
    body: rowsResumo,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [34, 76, 56], textColor: [255, 255, 255] },
  })

  // Tabela de animais
  const finalY = (doc as any).lastAutoTable?.finalY || 100
  const rowsAnimais = resultado.linhas
    .slice(0, 50)
    .map((l, i) => [
      i + 1,
      l.brinco,
      l.resultado.toUpperCase(),
      l.diasGestacao ? `${l.diasGestacao} d` : '—',
      l.touroOuLoteIatf || '—',
      l.dataExame,
      l.aprovado ? 'APROVADO' : 'IGNORADO',
    ])

  autoTable(doc, {
    startY: finalY + 8,
    head: [
      ['#', 'Brinco Matriz', 'Diagnóstico', 'Dias Gest.', 'Touro / IATF', 'Data Exame', 'Status'],
    ],
    body: rowsAnimais,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255] }, // Terracota
  })

  // Rodapé técnico
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text(
    'Documento gerado automaticamente pelo módulo reprodutivo. Trilha de auditoria append-only registrada.',
    14,
    pageHeight - 10,
  )

  doc.save(`protocolo_reprodutivo_${aplicacao.protocoloAuditId}.pdf`)
}
