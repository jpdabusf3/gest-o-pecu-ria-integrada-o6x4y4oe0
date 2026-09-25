import pb from '@/lib/pocketbase/client'
import { LotRecord, updateLot } from './lots'
import { PesagemRecord } from './pesagens'
import { differenceInDays, parseISO } from 'date-fns'

export interface AlertaGMDRecord {
  id: string
  lote_id: string
  data: string
  desvio_pct: number
  status: 'aberto' | 'resolvido'
  causa?: string
  contramedida?: string
  gmd_real?: number
  gmd_alvo?: number
  ciclos_consecutivos?: number
  resolvido_em?: string
  resolvido_por?: string
  created?: string
  updated?: string
  expand?: {
    lote_id?: LotRecord
  }
}

export type StatusSemaforo = 'verde' | 'amarelo' | 'vermelho' | 'cinza'

export interface LoteGMDAnalise {
  lote: LotRecord
  gmdAlvoG: number // mantido para compatibilidade legado (ex: 1000)
  gmdAlvoKg: number // em kg/dia (ex: 1.00 kg/dia)
  gmdRealKg: number | null // em kg/dia do último intervalo válido (ex: 1.15 kg/dia)
  gmdRealG: number | null // mantido para compatibilidade legado
  gdcRealKg: number | null // Ganho diário de carcaça
  desvioPct: number | null // (gmd_real - gmd_alvo) / gmd_alvo * 100
  statusSemaforo: StatusSemaforo
  diasSemPesagem: number | null
  totalPesagens: number
  pesagensOrdenadas: PesagemRecord[]
  alertaAtivo?: AlertaGMDRecord
  ciclosAbaixo20Consecutivos: number
  precisaAlertaPersistente: boolean
  permanenciaDias: number
  faixaPermanencia: 'ate_90' | '91_120' | 'acima_120'
  frenteSegregada: string
}

/**
 * Classifica a permanência no lote segundo os eixos padrão Exagro
 */
export function classificarFaixaPermanencia(dias: number): 'ate_90' | '91_120' | 'acima_120' {
  if (dias <= 90) return 'ate_90'
  if (dias <= 120) return '91_120'
  return 'acima_120'
}

export function labelFaixaPermanencia(faixa: 'ate_90' | '91_120' | 'acima_120'): string {
  switch (faixa) {
    case 'ate_90':
      return 'Até 90 dias'
    case '91_120':
      return '91 a 120 dias'
    case 'acima_120':
      return 'Acima de 120 dias'
  }
}

/**
 * Calcula o desvio percentual entre GMD Real e GMD Estimado (Alvo)
 * Fórmula solicitada: Desvio = (GMD real − GMD estimado) ÷ GMD estimado × 100
 */
export function calcularDesvioGMD(gmdRealKg: number, gmdAlvoKg: number): number {
  if (!gmdAlvoKg || gmdAlvoKg <= 0) return 0
  return Number((((gmdRealKg - gmdAlvoKg) / gmdAlvoKg) * 100).toFixed(1))
}

/**
 * Determina o semáforo de desvio:
 * - Cinza: Lote sem pesagem há mais de 60 dias (ou sem pesagens)
 * - Verde: desvio até 10% (ex: entre -10% e +infinito, ou seja, variação absoluta <= 10% da meta)
 * - Amarelo: desvio entre 10% e 20% (abaixo da meta entre -10% e -20%)
 * - Vermelho: desvio acima de 20% abaixo da meta (desvio <= -20% ou magnitude > 20% desfavorável)
 */
export function calcularSemaforoGMD(
  desvioPct: number | null,
  diasSemPesagem: number | null,
): StatusSemaforo {
  if (diasSemPesagem !== null && diasSemPesagem > 60) {
    return 'cinza'
  }
  if (desvioPct === null) {
    return 'cinza'
  }

  // Se o desvio for positivo (superou a meta), é excelente/verde
  if (desvioPct >= -10) {
    return 'verde'
  }

  // Se ficou entre 10% e 20% abaixo da meta (-10% a -20%)
  if (desvioPct >= -20) {
    return 'amarelo'
  }

  // Desvio pior que 20% abaixo da meta (< -20%)
  return 'vermelho'
}

/**
 * Processa um lote e seu histórico de pesagens gerando o diagnóstico zootécnico completo
 */
export function analisarLoteGMD(
  lote: LotRecord,
  pesagensDoLote: PesagemRecord[],
  alertasDoLote: AlertaGMDRecord[] = [],
): LoteGMDAnalise {
  // Regra técnica: Unidade padronizada de GMD é kg/dia.
  // Valores já gravados no banco podem vir em g/dia (ex: 900, 1200) ou kg/dia (ex: 0.9, 1.2).
  // Se gmd_alvo_g_dia for > 10, assume g/dia e converte para kg/dia dividindo por 1000.
  const rawAlvo = lote.gmd_alvo_g_dia || 900
  const gmdAlvoKg = rawAlvo > 10 ? Number((rawAlvo / 1000).toFixed(2)) : Number(rawAlvo.toFixed(2))
  const gmdAlvoG = rawAlvo > 10 ? rawAlvo : Math.round(rawAlvo * 1000)

  // Ordenar cronologicamente decrescente
  const pesagensOrdenadas = [...pesagensDoLote].sort(
    (a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
  )

  const ultimaPesagem = pesagensOrdenadas[0]
  const diasSemPesagem = ultimaPesagem
    ? Math.max(0, differenceInDays(new Date(), parseISO(ultimaPesagem.data_pesagem)))
    : null

  // Achar última pesagem com gmd_intervalo válido calculado
  const pesagemComGmd = pesagensOrdenadas.find(
    (p) => typeof p.gmd_intervalo === 'number' && p.gmd_intervalo !== null && p.gmd_intervalo !== 0,
  )

  // Se o gmd_intervalo já gravado for > 10, converte de g/dia para kg/dia
  let gmdRealKg: number | null = null
  if (
    pesagemComGmd &&
    pesagemComGmd.gmd_intervalo !== undefined &&
    pesagemComGmd.gmd_intervalo !== null
  ) {
    const rawReal = pesagemComGmd.gmd_intervalo
    gmdRealKg = rawReal > 10 ? Number((rawReal / 1000).toFixed(2)) : Number(rawReal.toFixed(2))
  }
  const gmdRealG = gmdRealKg !== null ? Math.round(gmdRealKg * 1000) : null

  // Cálculo de GDC: GDC = GMD × rendimento_carcaca%
  const rendimento = lote.rendimento_carcaca_pct || 0
  const gdcRealKg =
    gmdRealKg !== null && rendimento > 0
      ? Number((gmdRealKg * (rendimento / 100)).toFixed(3))
      : null

  // Desvio percentual
  const desvioPct = gmdRealKg !== null ? calcularDesvioGMD(gmdRealKg, gmdAlvoKg) : null
  const statusSemaforo = calcularSemaforoGMD(desvioPct, diasSemPesagem)

  // Contar ciclos consecutivos em vermelho (desvio <= -20%)
  // Os intervalos válidos ordenados do mais recente para o mais antigo:
  const intervalosValidos = pesagensOrdenadas.filter(
    (p) => typeof p.gmd_intervalo === 'number' && p.gmd_intervalo !== null && p.gmd_intervalo !== 0,
  )

  let ciclosAbaixo20Consecutivos = 0
  for (const p of intervalosValidos) {
    const dev = calcularDesvioGMD(p.gmd_intervalo!, gmdAlvoKg)
    if (dev <= -20) {
      ciclosAbaixo20Consecutivos++
    } else {
      break
    }
  }

  const precisaAlertaPersistente = ciclosAbaixo20Consecutivos >= 2

  // Alerta ativo (aberto)
  const alertaAtivo = alertasDoLote.find((a) => a.lote_id === lote.id && a.status === 'aberto')

  // Permanência
  const dtEntrada = lote.data_inicio_lote || lote.data_entrada || lote.entry_date
  const dtSaida = lote.data_saida || lote.exit_date
  const permanenciaDias = dtEntrada
    ? differenceInDays(dtSaida ? parseISO(dtSaida) : new Date(), parseISO(dtEntrada))
    : lote.dias_permanencia || 0

  const faixaPermanencia = classificarFaixaPermanencia(permanenciaDias)

  // Frente segregada: Arrendamento NUNCA misturado com a fazenda própria
  const frenteSegregada =
    lote.is_arrendamento || lote.frente === 'arrendamento'
      ? 'Arrendamento'
      : lote.frente
        ? lote.frente.toUpperCase()
        : lote.sector?.toUpperCase() || 'FAZENDA PRÓPRIA'

  return {
    lote,
    gmdAlvoG,
    gmdAlvoKg,
    gmdRealKg,
    gmdRealG,
    gdcRealKg,
    desvioPct,
    statusSemaforo,
    diasSemPesagem,
    totalPesagens: pesagensDoLote.length,
    pesagensOrdenadas,
    alertaAtivo,
    ciclosAbaixo20Consecutivos,
    precisaAlertaPersistente,
    permanenciaDias,
    faixaPermanencia,
    frenteSegregada,
  }
}

/**
 * Operações CRUD com a coleção alertas_gmd
 */
export async function getAlertasGMD(filter?: string): Promise<AlertaGMDRecord[]> {
  return pb.collection('alertas_gmd').getFullList<AlertaGMDRecord>({
    filter,
    sort: '-created',
    expand: 'lote_id',
  })
}

export async function criarAlertaGMD(dados: {
  lote_id: string
  data: string
  desvio_pct: number
  gmd_real: number
  gmd_alvo: number
  ciclos_consecutivos: number
}): Promise<AlertaGMDRecord> {
  return pb.collection('alertas_gmd').create<AlertaGMDRecord>({
    ...dados,
    status: 'aberto',
    causa: '',
    contramedida: '',
  })
}

export async function resolverAlertaGMD(
  id: string,
  causa: string,
  contramedida: string,
  usuarioNome: string,
): Promise<AlertaGMDRecord> {
  if (!causa?.trim() || !contramedida?.trim()) {
    throw new Error('Alerta só pode ser resolvido com causa e contramedida preenchidas.')
  }

  return pb.collection('alertas_gmd').update<AlertaGMDRecord>(id, {
    status: 'resolvido',
    causa: causa.trim(),
    contramedida: contramedida.trim(),
    resolvido_em: new Date().toISOString(),
    resolvido_por: usuarioNome,
  })
}

/**
 * Atualizar meta de GMD do lote e fase atual
 */
export async function atualizarMetaLote(
  loteId: string,
  dados: {
    gmd_alvo_g_dia?: number
    fase_atual?: LotRecord['fase_atual']
    frente?: LotRecord['frente']
    is_arrendamento?: boolean
    rendimento_carcaca_pct?: number
  },
): Promise<LotRecord> {
  return updateLot(loteId, dados)
}
