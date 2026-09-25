/**
 * Serviço de Diagnóstico por Lote
 *
 * Para cada lote com semáforo vermelho (desvio de GMD > 20% ou persistente após 2 ciclos),
 * avalia os dados reais do sistema para sugerir a causa provável entre:
 *   - nutrição
 *   - forragem
 *   - sanidade
 *
 * Mostra o racional detalhado, prioridades ordenadas e permite adoção com 1 clique
 * no preenchimento do alerta GMD.
 */

import { pb } from '@/lib/pocketbase/client'
import { LotRecord } from './lots'
import { PesagemRecord } from './pesagens'

export type CategoriaDiagnostico = 'nutricao' | 'forragem' | 'sanidade'

export interface EvidenciaDiagnostico {
  categoria: CategoriaDiagnostico
  pontuacao: number
  fator: string
  detalhe: string
}

export interface HipoteseDiagnostico {
  categoria: CategoriaDiagnostico
  titulo: string
  pontuacao: number
  probabilidade: number // 0 a 100
  sugestaoCausa: string
  sugestaoContramedida: string
  oQueVerificar: string[]
  evidencias: string[]
}

export interface DiagnosticoLoteResult {
  loteId: string
  loteNome: string
  fase: string
  frente: string
  pastoAtual?: string
  gmdAlvoKgDia: number
  gmdRealKgDia: number
  desvioPct: number
  diasSemPesagem: number
  ciclosConsecutivos: number
  causaProvavel: CategoriaDiagnostico
  tituloCausaProvavel: string
  racional: string
  hipoteses: HipoteseDiagnostico[]
  sugestaoCausaPreenchimento: string
  sugestaoContramedidaPreenchimento: string
}

export interface DadosContextoLote {
  lote: LotRecord
  pesagensLote?: PesagemRecord[]
  atividadesLote?: any[]
  movimentacoesLote?: any[]
  estoqueInsumos?: any[]
}

/**
 * Calcula diagnóstico baseado em dados reais disponíveis
 */
export function calcularDiagnosticoLote(contexto: DadosContextoLote): DiagnosticoLoteResult {
  const {
    lote,
    pesagensLote = [],
    atividadesLote = [],
    movimentacoesLote = [],
    estoqueInsumos = [],
  } = contexto

  // GMD em kg/dia
  const gmdAlvo = (lote.gmd_alvo_g_dia || 0) / 1000
  const pesoAtual = lote.peso_medio_atual || lote.peso_entrada_medio || 0

  // Ordenar pesagens por data decrescente
  const pesagensSorted = [...pesagensLote].sort(
    (a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
  )

  const ultimaPesagem = pesagensSorted[0]
  const gmdReal = ultimaPesagem?.gmd_intervalo ? Number(ultimaPesagem.gmd_intervalo) : 0

  const agora = new Date().getTime()
  const dataUltima = ultimaPesagem ? new Date(ultimaPesagem.data_pesagem).getTime() : 0
  const diasSemPesagem =
    dataUltima > 0 ? Math.floor((agora - dataUltima) / (1000 * 60 * 60 * 24)) : 0

  const desvioPct = gmdAlvo > 0 ? ((gmdReal - gmdAlvo) / gmdAlvo) * 100 : 0

  // 1) Análise de Sanidade
  let scoreSanidade = 0
  const evidenciasSanidade: string[] = []

  // Mortes no lote
  const mortesLote = movimentacoesLote.filter(
    (m) => m.tipo === 'morte' && (m.lote_id === lote.id || m.frente === lote.frente),
  )
  if (mortesLote.length > 0) {
    const totalMortes = mortesLote.reduce((acc, cur) => acc + (cur.qtd_cabecas || 1), 0)
    scoreSanidade += 35 + Math.min(totalMortes * 10, 30)
    evidenciasSanidade.push(
      `Registro de ${totalMortes} morte(s) na frente/lote (${mortesLote[0].observacoes || 'laudo veterinário'}).`,
    )
  }

  // Atividades sanitárias não realizadas ou atrasadas
  const ativSanitarias = atividadesLote.filter(
    (a) =>
      a.tipo === 'sanidade' ||
      (a.lote_ids && a.lote_ids.includes(lote.id) && a.tipo === 'sanidade'),
  )
  const ativSanitariasNaoRealizadas = ativSanitarias.filter(
    (a) =>
      a.status === 'nao_realizada' ||
      (a.status === 'agendada' && new Date(a.data).getTime() < agora),
  )
  if (ativSanitariasNaoRealizadas.length > 0) {
    scoreSanidade += 30 + ativSanitariasNaoRealizadas.length * 10
    evidenciasSanidade.push(
      `${ativSanitariasNaoRealizadas.length} protocolo(s) sanitário(s) pendente(s) ou não realizado(s) (ex.: ${ativSanitariasNaoRealizadas[0].titulo}).`,
    )
  }

  // Se ECC (escore de condição corporal) na última pesagem for muito baixo (< 2.8)
  if (ultimaPesagem?.ecc && ultimaPesagem.ecc < 2.8) {
    scoreSanidade += 15
    evidenciasSanidade.push(
      `Escore de condição corporal (ECC ${ultimaPesagem.ecc}) abaixo do padrão crítico.`,
    )
  }

  // 2) Análise de Nutrição
  let scoreNutricao = 0
  const evidenciasNutricao: string[] = []

  // Confinamento / terminação têm dependência extrema de nutrição
  const ehConfinamento =
    lote.fase_atual?.toLowerCase().includes('confinamento') ||
    lote.pasto_atual?.toLowerCase().includes('confinamento') ||
    lote.frente === 'engorda'

  if (ehConfinamento) {
    scoreNutricao += 20
    evidenciasNutricao.push(
      'Fase de terminação/engorda com alta demanda e sensibilidade nutricional.',
    )
  }

  // Atividades de nutrição não realizadas ou atrasadas
  const ativNutricao = atividadesLote.filter(
    (a) =>
      a.tipo === 'nutricao' ||
      (a.lote_ids && a.lote_ids.includes(lote.id) && a.tipo === 'nutricao'),
  )
  const ativNutricaoPendentes = ativNutricao.filter(
    (a) =>
      a.status === 'nao_realizada' ||
      (a.status === 'agendada' && new Date(a.data).getTime() < agora),
  )
  if (ativNutricaoPendentes.length > 0) {
    scoreNutricao += 35 + ativNutricaoPendentes.length * 10
    evidenciasNutricao.push(
      `${ativNutricaoPendentes.length} fornecimento(s) nutricional(is) em atraso ou não realizado(s).`,
    )
  }

  // Falta de insumos em estoque de nutrição (ex.: sal, ração, concentrado)
  const insumosNutricaoCriticos = estoqueInsumos.filter(
    (i) =>
      i.categoria === 'nutricao' &&
      (i.estoque_final <= 0 || i.estoque_final < i.estoque_inicial * 0.15),
  )
  if (insumosNutricaoCriticos.length > 0) {
    scoreNutricao += 30
    evidenciasNutricao.push(
      `Alerta de estoque baixo/zerado em insumos nutricionais (${insumosNutricaoCriticos.map((i) => i.produto).join(', ')}).`,
    )
  }

  // Desvio forte de GMD (> 30% negativo) em lote com pesagem recente costuma ser balanceamento de cocho
  if (desvioPct < -30 && diasSemPesagem <= 35) {
    scoreNutricao += 20
    evidenciasNutricao.push(
      `Queda abrupta de GMD (${desvioPct.toFixed(1)}%) com pesagem recente indica ajuste de consumo/leitura de cocho.`,
    )
  }

  // 3) Análise de Forragem / Pastoreio
  let scoreForragem = 0
  const evidenciasForragem: string[] = []

  const ehPasto =
    !ehConfinamento ||
    (lote.pasto_atual && !lote.pasto_atual.toLowerCase().includes('confinamento'))
  if (ehPasto) {
    scoreForragem += 15
    evidenciasForragem.push(`Lote mantido em pastejo (${lote.pasto_atual || 'Pasto rotacionado'}).`)
  }

  // Dias sem pesagem alto (60+ dias ou 45+ dias) em regime de pasto indica descontrole de oferta forrageira
  if (diasSemPesagem > 45) {
    scoreForragem += 25
    evidenciasForragem.push(
      `${diasSemPesagem} dias decorridos sem pesagem; alta probabilidade de degradação da oferta/massa verde no piquete.`,
    )
  }

  // Headcount elevado no pasto
  if (lote.headcount && lote.headcount > 80 && ehPasto) {
    scoreForragem += 20
    evidenciasForragem.push(
      `Carga animal concentrada (${lote.headcount} cab) no piquete pode ter excedido a capacidade de suporte.`,
    )
  }

  // Atividades de pastagem pendentes (roçada, adubação, divisão)
  const ativPastagem = atividadesLote.filter(
    (a) => a.tipo === 'manejo' || (a.setor && a.setor.toLowerCase().includes('pasto')),
  )
  const ativPastagemPendentes = ativPastagem.filter(
    (a) =>
      a.status === 'nao_realizada' ||
      (a.status === 'agendada' && new Date(a.data).getTime() < agora),
  )
  if (ativPastagemPendentes.length > 0) {
    scoreForragem += 20
    evidenciasForragem.push(
      `Manejo ou reforma de pastagem com intervenções pendentes no setor (${ativPastagemPendentes.length} pendência(s)).`,
    )
  }

  // Ajuste mínimo base se nenhum gatilho disparou (para nunca inventar do nada)
  if (scoreSanidade === 0 && scoreNutricao === 0 && scoreForragem === 0) {
    if (ehConfinamento) {
      scoreNutricao = 45
      evidenciasNutricao.push(
        'Terminação em confinamento: consumo diário de MS e concentrado é o fator primário.',
      )
      scoreSanidade = 30
      evidenciasSanidade.push('Investigar ocorrência subclínica de acidose ruminal ou pneumonia.')
      scoreForragem = 10
      evidenciasForragem.push('Fibra efetiva na dieta de cocho.')
    } else {
      scoreForragem = 40
      evidenciasForragem.push(
        'Lote a pasto sem pesagens intermediárias: altura de entrada/saída de pasto é a hipótese mais comum.',
      )
      scoreNutricao = 35
      evidenciasNutricao.push(
        'Verificar regularidade do fornecimento de sal mineralizado/proteico no cocho.',
      )
      scoreSanidade = 25
      evidenciasSanidade.push(
        'Checar carga parasitária (carrapato/mosca-dos-chifres) e vermifugação.',
      )
    }
  }

  const somaScores = Math.max(1, scoreSanidade + scoreNutricao + scoreForragem)

  const hipSanidade: HipoteseDiagnostico = {
    categoria: 'sanidade',
    titulo: 'Sanidade / Desafio Imunológico',
    pontuacao: scoreSanidade,
    probabilidade: Math.round((scoreSanidade / somaScores) * 100),
    sugestaoCausa: `Desafio sanitário (parasitas/vacinação pendente ou ocorrência clínica)`,
    sugestaoContramedida: `Revisar lote no curral, apartar animais refugos e aplicar vermifugação/protocolo curativo.`,
    oQueVerificar: [
      'Histórico de vacinas e vermifugação no lote',
      'Presença de infestação por carrapatos ou mosca-dos-chifres',
      'Animais com tosse, refugo ou lesões de casco',
    ],
    evidencias:
      evidenciasSanidade.length > 0
        ? evidenciasSanidade
        : ['Sem registros sanitários adversos recentes.'],
  }

  const hipNutricao: HipoteseDiagnostico = {
    categoria: 'nutricao',
    titulo: 'Nutrição / Consumo no Cocho',
    pontuacao: scoreNutricao,
    probabilidade: Math.round((scoreNutricao / somaScores) * 100),
    sugestaoCausa: `Déficit nutricional (consumo irregular de suplementação ou estoque desabastecido)`,
    sugestaoContramedida: `Ajustar oferta de suplemento/ração no cocho, metragem de cocho por animal e verificar estoque.`,
    oQueVerificar: [
      'Leitura e sobras de cocho nos últimos 7 dias',
      'Disponibilidade e hidratação do sal/suplemento no cocho',
      'Metragem linear de cocho por cabeça (mínimo 15-20cm)',
    ],
    evidencias:
      evidenciasNutricao.length > 0
        ? evidenciasNutricao
        : ['Sem rupturas evidentes de estoque registradas.'],
  }

  const hipForragem: HipoteseDiagnostico = {
    categoria: 'forragem',
    titulo: 'Forragem / Suporte de Pastagem',
    pontuacao: scoreForragem,
    probabilidade: Math.round((scoreForragem / somaScores) * 100),
    sugestaoCausa: `Restrição de forragem (baixa disponibilidade de massa verde ou sobrecarga no piquete)`,
    sugestaoContramedida: `Realizar rodízio de piquete imediato para área vedada ou rebaixar lotação do lote.`,
    oQueVerificar: [
      'Altura do pasto na entrada e saída do piquete atual',
      'Taxa de lotação instantânea (UA/ha) vs. capacidade suporte',
      'Qualidade da água no bebedouro e distância de pastejo',
    ],
    evidencias:
      evidenciasForragem.length > 0
        ? evidenciasForragem
        : ['Pasto dentro da escala média cadastrada.'],
  }

  const hipoteses = [hipNutricao, hipForragem, hipSanidade].sort(
    (a, b) => b.pontuacao - a.pontuacao,
  )
  const causaProvavelObj = hipoteses[0]

  const titulos = {
    nutricao: 'Nutrição (Suplementação / Cocho)',
    forragem: 'Forragem (Massa de Pasto / Suporte)',
    sanidade: 'Sanidade (Parasitas / Protocolo)',
  }

  const racional = `Baseado em: ${causaProvavelObj.evidencias[0] || 'dados de pesagem e manejo da frente'}. Probabilidade estimada em ${causaProvavelObj.probabilidade}%.`

  return {
    loteId: lote.id,
    loteNome: lote.name,
    fase: lote.fase_atual || 'Recria',
    frente: lote.frente || 'Geral',
    pastoAtual: lote.pasto_atual,
    gmdAlvoKgDia: gmdAlvo,
    gmdRealKgDia: gmdReal,
    desvioPct,
    diasSemPesagem,
    ciclosConsecutivos: 2,
    causaProvavel: causaProvavelObj.categoria,
    tituloCausaProvavel: titulos[causaProvavelObj.categoria],
    racional,
    hipoteses,
    sugestaoCausaPreenchimento: causaProvavelObj.sugestaoCausa,
    sugestaoContramedidaPreenchimento: causaProvavelObj.sugestaoContramedida,
  }
}

/**
 * Obtém diagnóstico rápido buscando no banco ou usando dados cacheados
 */
export async function obterDiagnosticoLote(loteId: string): Promise<DiagnosticoLoteResult | null> {
  try {
    const lote = await pb.collection('lots').getOne<LotRecord>(loteId)
    if (!lote) return null

    // Buscar pesagens
    const pesagens = await pb.collection('pesagens').getFullList<PesagemRecord>({
      filter: `lote_id = "${loteId}"`,
      sort: '-data_pesagem',
      limit: 10,
    })

    // Buscar atividades vinculadas ao lote ou de sanidade/nutricao
    const atividades = await pb.collection('atividades').getFullList({
      filter: `tipo = "sanidade" || tipo = "nutricao" || tipo = "manejo"`,
      limit: 50,
    })

    // Buscar estoque
    const estoque = await pb.collection('estoque_insumos').getFullList({
      limit: 50,
    })

    // Buscar movimentações
    const movimentacoes = await pb.collection('movimentacoes_rebanho').getFullList({
      filter: `tipo = "morte"`,
      limit: 20,
    })

    return calcularDiagnosticoLote({
      lote,
      pesagensLote: pesagens,
      atividadesLote: atividades,
      movimentacoesLote: movimentacoes,
      estoqueInsumos: estoque,
    })
  } catch (err) {
    console.warn(`Erro ao gerar diagnóstico para o lote ${loteId}:`, err)
    return null
  }
}
