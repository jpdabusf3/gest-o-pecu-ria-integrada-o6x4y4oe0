import pb from '@/lib/pocketbase/client'
import { LotRecord, updateLot, getLot } from './lots'
import { differenceInDays, parseISO } from 'date-fns'
import { calcularDesvioGMD, criarAlertaGMD, getAlertasGMD } from './gmdAlertas'

export interface PesagemRecord {
  id: string
  data_pesagem: string
  lote_id: string
  tipo: 'lote' | 'individual'
  animal_id?: string
  qtd_animais: number
  peso_medio_kg: number
  peso_total_kg?: number
  ecc?: number
  responsavel_id?: string
  origem: 'manual' | 'balanca'
  observacoes?: string
  gmd_intervalo?: number
  dias_intervalo?: number
  peso_anterior_kg?: number
  created?: string
  updated?: string
  // PocketBase expand relation
  expand?: {
    lote_id?: LotRecord
  }
}

export interface PesagemInput {
  data_pesagem: string
  lote_id: string
  tipo: 'lote' | 'individual'
  animal_id?: string
  qtd_animais: number
  peso_medio_kg: number
  peso_total_kg?: number
  ecc?: number
  responsavel_id?: string
  origem: 'manual' | 'balanca'
  observacoes?: string
  // Opcionais para fechamento de lote / venda / abate
  is_saida_abate?: boolean
  rendimento_carcaca_pct?: number
}

export interface GMDCalculationResult {
  gmd: number | null
  diasIntervalo: number | null
  pesoAnterior: number | null
  variacaoKg: number | null
  variacaoArrobas: number | null
  warning?: string
}

/**
 * Calcula o GMD e estatísticas entre a nova pesagem e a pesagem anterior mais recente do mesmo lote.
 * Regras:
 * - GMD = (peso final - peso inicial) / dias
 * - Só calcular quando existir pesagem anterior do MESMO lote.
 * - Intervalo < 21 dias ou > 120 dias gera alerta (warning).
 */
export function calculateGMD(
  pesoAtualKg: number,
  dataAtual: string,
  historicoDoLote: PesagemRecord[],
): GMDCalculationResult {
  if (!historicoDoLote || historicoDoLote.length === 0) {
    return {
      gmd: null,
      diasIntervalo: null,
      pesoAnterior: null,
      variacaoKg: null,
      variacaoArrobas: null,
    }
  }

  // Ordenar cronologicamente decrescente para pegar a mais recente anterior
  const sorted = [...historicoDoLote].sort(
    (a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
  )

  const currentDate = new Date(dataAtual)
  const anterior = sorted.find((p) => new Date(p.data_pesagem).getTime() <= currentDate.getTime())

  if (!anterior) {
    return {
      gmd: null,
      diasIntervalo: null,
      pesoAnterior: null,
      variacaoKg: null,
      variacaoArrobas: null,
    }
  }

  const prevDate = new Date(anterior.data_pesagem)
  const diffDays = Math.max(0, differenceInDays(currentDate, prevDate))
  const pesoAnterior = anterior.peso_medio_kg || 0
  const variacaoKg = Number((pesoAtualKg - pesoAnterior).toFixed(2))
  // Regra técnica: Arroba (@) de peso vivo = 30 kg
  const variacaoArrobas = Number((variacaoKg / 30).toFixed(2))

  let gmd: number | null = null
  let warning: string | undefined

  if (diffDays > 0) {
    // GMD em kg/dia com 2 casas decimais padronizadas
    gmd = Number((variacaoKg / diffDays).toFixed(2))
    if (diffDays < 21) {
      warning = `Intervalo de pesagem curto (${diffDays} dias). Recomendado mínimo de 21 dias para aferição de GMD confiável.`
    } else if (diffDays > 120) {
      warning = `Intervalo de pesagem prolongado (${diffDays} dias > 120 dias). A curva de ganho pode apresentar distorções sazonais.`
    }
  }

  return {
    gmd,
    diasIntervalo: diffDays,
    pesoAnterior,
    variacaoKg,
    variacaoArrobas,
    warning,
  }
}

/**
 * Calcula Arrobas (@) de carcaça produzidas do lote (Padrão Exagro corrigido):
 * Arroba (@) de Peso Vivo = 30 kg; Arroba (@) de Carcaça = 15 kg.
 * Com rendimento de carcaça:
 * Peso @ carcaça = (peso vivo * % rendimento) / 15
 * Se o peso passado for peso vivo direto:
 * ganho @ carcaça = ((pesoSaidaKg * %rendSaida) - (pesoEntradaKg * %rendEntrada)) / 15
 * Ou em peso vivo: (pesoTotalSaidaKg - pesoTotalEntradaKg) / 30
 */
export function calculateArrobasProduzidas(
  pesoTotalEntradaKg: number,
  pesoTotalSaidaKg: number,
  rendimentoCarcacaPct: number = 53.5,
): number {
  if (pesoTotalSaidaKg <= 0 || pesoTotalEntradaKg <= 0) return 0
  // @ de carcaça produzidas = (peso vivo ganho * rendimento) / 15
  const ganhoVivo = pesoTotalSaidaKg - pesoTotalEntradaKg
  const ganhoCarcaca = ganhoVivo * (rendimentoCarcacaPct / 100)
  return Number((ganhoCarcaca / 15).toFixed(2))
}

/**
 * Calcula Ganho Diário de Carcaça (GDC):
 * GDC = GMD × (rendimento de carcaça % / 100)
 */
export function calculateGDC(gmd: number, rendimentoCarcacaPct: number): number {
  if (!gmd || !rendimentoCarcacaPct) return 0
  return Number((gmd * (rendimentoCarcacaPct / 100)).toFixed(3))
}

/**
 * Busca pesagens com filtro e expand do lote
 */
export async function getPesagens(filter?: string): Promise<PesagemRecord[]> {
  try {
    return await pb.collection('pesagens').getFullList<PesagemRecord>({
      filter,
      sort: '-data_pesagem',
      expand: 'lote_id',
    })
  } catch (e) {
    console.warn('Erro ao carregar pesagens:', e)
    return []
  }
}

/**
 * Busca pesagens de um lote específico
 */
export async function getPesagensByLote(loteId: string): Promise<PesagemRecord[]> {
  try {
    return await pb.collection('pesagens').getFullList<PesagemRecord>({
      filter: `lote_id = '${loteId}'`,
      sort: '-data_pesagem',
      expand: 'lote_id',
    })
  } catch (e) {
    console.warn('Erro ao carregar pesagens por lote:', e)
    return []
  }
}

/**
 * Cria um registro de pesagem e atualiza o peso médio e status do lote na base real
 */
export async function createPesagem(input: PesagemInput): Promise<PesagemRecord> {
  // 1. Obter histórico anterior deste lote para cálculo automático do GMD
  const previousRecords = await getPesagensByLote(input.lote_id)
  const gmdCalc = calculateGMD(input.peso_medio_kg, input.data_pesagem, previousRecords)

  const pesoTotal = input.peso_total_kg || input.peso_medio_kg * input.qtd_animais

  const payload: Partial<PesagemRecord> = {
    data_pesagem: input.data_pesagem,
    lote_id: input.lote_id,
    tipo: input.tipo,
    animal_id: input.animal_id || '',
    qtd_animais: input.qtd_animais,
    peso_medio_kg: input.peso_medio_kg,
    peso_total_kg: pesoTotal,
    ecc: input.ecc || undefined,
    responsavel_id: input.responsavel_id || 'Operador',
    origem: input.origem,
    observacoes: input.observacoes || '',
    gmd_intervalo: gmdCalc.gmd !== null ? gmdCalc.gmd : undefined,
    dias_intervalo: gmdCalc.diasIntervalo !== null ? gmdCalc.diasIntervalo : undefined,
    peso_anterior_kg: gmdCalc.pesoAnterior !== null ? gmdCalc.pesoAnterior : undefined,
  }

  const created = await pb.collection('pesagens').create<PesagemRecord>(payload, {
    expand: 'lote_id',
  })

  // 2. Atualizar peso médio atual do lote e verificar metas de GMD
  try {
    const lotUpdates: Partial<LotRecord> = {
      peso_medio_atual: input.peso_medio_kg,
      final_weight: input.peso_medio_kg,
    }

    if (input.is_saida_abate) {
      lotUpdates.status = 'abated'
      lotUpdates.exit_date = input.data_pesagem
      lotUpdates.data_saida = input.data_pesagem
      lotUpdates.peso_saida_medio = input.peso_medio_kg
      if (input.rendimento_carcaca_pct) {
        lotUpdates.rendimento_carcaca_pct = input.rendimento_carcaca_pct
      }
    }

    const updatedLot = await updateLot(input.lote_id, lotUpdates)

    // 3. Regra de Alerta Persistente:
    // Se GMD foi calculado e o lote tem meta de GMD, verificar desvio.
    // Desvio > 20% abaixo da meta (desvio_pct <= -20) por 2 ciclos consecutivos gera alerta_gmd aberto.
    if (gmdCalc.gmd !== null && gmdCalc.gmd !== undefined) {
      const gmdAlvoG = updatedLot.gmd_alvo_g_dia || 900
      const gmdAlvoKg = gmdAlvoG / 1000
      const desvioAtual = calcularDesvioGMD(gmdCalc.gmd, gmdAlvoKg)

      if (desvioAtual <= -20) {
        // Checar se a pesagem anterior válida também esteve abaixo de -20%
        const sortedPrevious = previousRecords
          .filter(
            (p) =>
              typeof p.gmd_intervalo === 'number' &&
              p.gmd_intervalo !== null &&
              p.gmd_intervalo > 0,
          )
          .sort((a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime())

        const penultima = sortedPrevious[0] // anterior à atual
        const desvioAnterior = penultima
          ? calcularDesvioGMD(penultima.gmd_intervalo!, gmdAlvoKg)
          : null

        // Se tem 2 ciclos consecutivos com desvio <= -20%
        if (desvioAnterior !== null && desvioAnterior <= -20) {
          // Verificar se já não existe alerta aberto para esse lote
          const alertasExistentes = await getAlertasGMD(
            `lote_id = '${input.lote_id}' && status = 'aberto'`,
          )
          if (alertasExistentes.length === 0) {
            await criarAlertaGMD({
              lote_id: input.lote_id,
              data: input.data_pesagem,
              desvio_pct: desvioAtual,
              gmd_real: Math.round(gmdCalc.gmd * 1000),
              gmd_alvo: gmdAlvoG,
              ciclos_consecutivos: 2,
            })
          }
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao atualizar peso médio/alertas do lote:', err)
  }

  return created
}

/**
 * Remove uma pesagem
 */
export async function deletePesagem(id: string): Promise<boolean> {
  return pb.collection('pesagens').delete(id)
}
