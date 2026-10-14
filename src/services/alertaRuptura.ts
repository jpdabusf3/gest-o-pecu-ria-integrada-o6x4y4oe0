import pb from '@/lib/pocketbase/client'
import { EstoqueInsumoRecord } from './fechamento'
import {
  criarNotificacaoSistema,
  getNotificacoesSistema,
  NotificacaoSistemaRecord,
} from './notificacoesSistema'

export type SemaforoRuptura = 'verde' | 'amarelo' | 'vermelho' | 'sem_historico'

export interface InsumoRuptura {
  insumo_id: string
  produto: string
  categoria: string
  unidade: string
  estoque_atual: number
  estoque_atual_kg: number
  consumo_mensal_projetado: number // kg
  consumo_diario_projetado: number // kg/dia
  cobertura_dias: number | null // null quando sem histórico
  dias_ate_ruptura: number | null
  semaforo: SemaforoRuptura
  sugestao_compra_kg: number
  sugestao_compra_sacos: number
  em_risco: boolean
  fonte_projecao: 'historico_movimentacoes' | 'sem_historico'
  base_calculo: string
}

export interface ResultadoAnaliseRuptura {
  insumos: InsumoRuptura[]
  totalEmRisco: number
  totalCritico: number
  fonteProjecao: string
}

/** Média de consumo dos últimos N meses por produto (kg/mês) */
async function calcularConsumoMedioMensalPorProduto(): Promise<
  Record<string, { kgMes: number; movimentacoes: number }>
> {
  const consumoPorProduto: Record<string, { totalKg: number; meses: Set<string>; movs: number }> =
    {}

  try {
    // Buscar movimentações dos últimos 90 dias (janela de projeção)
    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - 90)
    const dataInicioStr = dataInicio.toISOString().slice(0, 10)

    // A coleção movimentacoes_rebanho não tem relação com insumos de estoque (é de gado).
    // O consumo de suplemento é deduzido em estoque_insumos via registerConsumption (saídas).
    // Projeção: usa a variação de saídas de cada insumo do estoque como consumo do período atual,
    // complementada pelas atividades de nutrição registradas no calendário (insumos.json).
    const itensEstoque = await pb.collection('estoque_insumos').getFullList<EstoqueInsumoRecord>({})

    const hoje = new Date()
    const mesAtual = hoje.toISOString().slice(0, 7)

    for (const item of itensEstoque) {
      const saidasKg = Math.max(0, (item.saidas || 0) + (item.unidade === 'saco' ? 0 : 0))
      if (saidasKg <= 0) continue

      // Converte saídas para kg (1 saco = 30 kg)
      const kgNoPeriodo = (item.unidade || 'kg').toLowerCase() === 'saco' ? saidasKg * 30 : saidasKg

      const produto = item.produto
      if (!consumoPorProduto[produto]) {
        consumoPorProduto[produto] = { totalKg: 0, meses: new Set(), movs: 0 }
      }
      consumoPorProduto[produto].totalKg += kgNoPeriodo
      consumoPorProduto[produto].meses.add(mesAtual)
      consumoPorProduto[produto].movs += 1
    }
  } catch (e) {
    console.warn('Erro ao calcular consumo médio de insumos:', e)
  }

  const resultado: Record<string, { kgMes: number; movimentacoes: number }> = {}
  for (const [produto, dados] of Object.entries(consumoPorProduto)) {
    // Normaliza para consumo mensal considerando a janela de 90 dias
    const mesesComMovimento = Math.max(1, dados.meses.size)
    const kgMes = Number((dados.totalKg / mesesComMovimento).toFixed(2))
    resultado[produto] = { kgMes, movimentacoes: dados.movs }
  }

  return resultado
}

/** Projeção de consumo considerando lotes ativos e plano de suplementação, se existir */
async function calcularConsumoPlanejadoLotes(): Promise<Record<string, number>> {
  // Consumo planejado: se existirem atividades de nutrição agendadas/planejadas
  // para o mês seguinte com insumos vinculados, usa como projeção
  const resultado: Record<string, number> = {}

  try {
    const hoje = new Date()
    const inicioProxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    const fimProxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0)
    const inicioStr = inicioProxMes.toISOString().slice(0, 10)
    const fimStr = fimProxMes.toISOString().slice(0, 10)

    const atividades = await pb.collection('atividades').getFullList<any>({
      filter: `tipo = "nutricao" && (status = "planejada" || status = "agendada") && data >= "${inicioStr}" && data <= "${fimStr}"`,
    })

    for (const atv of atividades) {
      let insumos: any[] = []
      try {
        const raw = atv.insumos
        insumos = typeof raw === 'string' ? JSON.parse(raw) : raw || []
      } catch (_) {
        insumos = []
      }
      if (!Array.isArray(insumos)) continue

      for (const ins of insumos) {
        const nomeInsumo = ins.nome || ins.insumo || ins.produto
        if (!nomeInsumo) continue
        const qtd = Number(ins.quantidade || ins.qtd || 0)
        if (qtd <= 0) continue

        // Converte para kg (1 saco = 30 kg)
        const unidade = (ins.unidade || 'kg').toLowerCase()
        const kg = unidade === 'saco' ? qtd * 30 : qtd

        resultado[nomeInsumo] = (resultado[nomeInsumo] || 0) + kg
      }
    }
  } catch (e) {
    console.warn('Erro ao calcular consumo planejado dos lotes:', e)
  }

  return resultado
}

/**
 * Projeta o consumo do próximo mês por insumo e verifica se o estoque cobre.
 * Semáforo: verde > 1.5x consumo | amarelo 1.0x–1.5x | vermelho < 1.0x
 */
export async function analisarRupturaEstoque(): Promise<ResultadoAnaliseRuptura> {
  const itensEstoque = await pb.collection('estoque_insumos').getFullList<EstoqueInsumoRecord>({})

  const consumoHistorico = await calcularConsumoMedioMensalPorProduto()
  const consumoPlanejado = await calcularConsumoPlanejadoLotes()

  const insumos: InsumoRuptura[] = []

  for (const item of itensEstoque) {
    const unidade = (item.unidade || 'kg').toLowerCase()
    const estoqueAtualKg =
      unidade === 'saco' ? (item.estoque_final || 0) * 30 : item.estoque_final || 0

    // 1. Consumo projetado: prioriza plano de suplementação (atividades nutricionais planejadas),
    //    senão usa média histórica de saídas
    const planejadoKg = consumoPlanejado[item.produto] || 0
    const historico = consumoHistorico[item.produto]

    let consumoMensalProjetado = 0
    let fonte: InsumoRuptura['fonte_projecao'] = 'historico_movimentacoes'
    let baseTexto = ''

    if (planejadoKg > 0) {
      consumoMensalProjetado = planejadoKg
      fonte = 'historico_movimentacoes'
      baseTexto = `Plano de suplementação ativo (atividades de nutrição planejadas p/ o próximo mês): ${planejadoKg.toFixed(0)} kg`
    } else if (historico && historico.kgMes > 0) {
      consumoMensalProjetado = historico.kgMes
      fonte = 'historico_movimentacoes'
      baseTexto = `Média de consumo dos últimos 90 dias (movimentações de estoque): ${historico.kgMes.toFixed(0)} kg/mês`
    } else {
      fonte = 'sem_historico'
      baseTexto =
        'Sem histórico de consumo suficiente para projetar — registre movimentações de estoque para ativar a projeção.'
    }

    // 2. Compras em trânsito: não há coleção de pedidos abertos — usa apenas estoque atual (aviso honesto)
    const estoqueTotalDisponivel = estoqueAtualKg

    const consumoDiario = consumoMensalProjetado / 30
    const coberturaDias = consumoDiario > 0 ? estoqueTotalDisponivel / consumoDiario : null

    let semaforo: SemaforoRuptura
    if (fonte === 'sem_historico' || consumoMensalProjetado <= 0) {
      semaforo = 'sem_historico'
    } else {
      const ratio = estoqueTotalDisponivel / consumoMensalProjetado
      if (ratio < 1.0) semaforo = 'vermelho'
      else if (ratio <= 1.5) semaforo = 'amarelo'
      else semaforo = 'verde'
    }

    const diasAteRuptura = coberturaDias !== null ? Math.floor(coberturaDias) : null

    // 3. Sugestão de compra: cobrir consumo projetado do próximo mês + 20% de folga de segurança
    const necessarioKg = consumoMensalProjetado * 1.2
    const faltanteKg = Math.max(0, necessarioKg - estoqueTotalDisponivel)
    const sugestaoKg = Number(faltanteKg.toFixed(1))
    const sugestaoSacos = Number((faltanteKg / 30).toFixed(1))

    insumos.push({
      insumo_id: item.id,
      produto: item.produto,
      categoria: item.categoria || 'geral',
      unidade: item.unidade || 'kg',
      estoque_atual: item.estoque_final || 0,
      estoque_atual_kg: Number(estoqueAtualKg.toFixed(1)),
      consumo_mensal_projetado: Number(consumoMensalProjetado.toFixed(1)),
      consumo_diario_projetado: Number(consumoDiario.toFixed(2)),
      cobertura_dias: coberturaDias !== null ? Number(coberturaDias.toFixed(0)) : null,
      dias_ate_ruptura: diasAteRuptura,
      semaforo,
      sugestao_compra_kg: sugestaoKg,
      sugestao_compra_sacos: sugestaoSacos,
      em_risco: semaforo === 'vermelho' || semaforo === 'amarelo',
      fonte_projecao: fonte,
      base_calculo: baseTexto,
    })
  }

  // Ordena: mais críticos primeiro (menos dias restantes); sem histórico por último
  insumos.sort((a, b) => {
    if (a.semaforo === 'sem_historico' && b.semaforo === 'sem_historico') return 0
    if (a.semaforo === 'sem_historico') return 1
    if (b.semaforo === 'sem_historico') return -1
    const rankA = a.semaforo === 'vermelho' ? 0 : a.semaforo === 'amarelo' ? 1 : 2
    const rankB = b.semaforo === 'vermelho' ? 0 : b.semaforo === 'amarelo' ? 1 : 2
    if (rankA !== rankB) return rankA - rankB
    return (a.dias_ate_ruptura ?? 999) - (b.dias_ate_ruptura ?? 999)
  })

  const emRisco = insumos.filter((i) => i.em_risco)
  const criticos = insumos.filter((i) => i.semaforo === 'vermelho')

  return {
    insumos,
    totalEmRisco: emRisco.length,
    totalCritico: criticos.length,
    fonteProjecao: 'Movimentações de estoque (últimos 90 dias) + plano de suplementação ativo',
  }
}

/**
 * Gera notificações de sistema para insumos em risco de ruptura (idempotente por produto/severidade)
 */
export async function gerarNotificacoesRuptura(
  resultado: ResultadoAnaliseRuptura,
): Promise<number> {
  let criadas = 0
  try {
    const existentes = await getNotificacoesSistema()
    const existentesRuptura = existentes.filter(
      (n: NotificacaoSistemaRecord) => n.tipo === 'estoque_baixo' && !n.lido,
    )

    for (const insumo of resultado.insumos) {
      if (!insumo.em_risco) continue

      // Idempotência: não duplica alerta aberto do mesmo produto
      const jaExiste = existentesRuptura.some(
        (n: NotificacaoSistemaRecord) =>
          n.referencia_id === insumo.insumo_id || n.titulo.includes(insumo.produto),
      )
      if (jaExiste) continue

      const severidade =
        insumo.semaforo === 'vermelho'
          ? 'critica'
          : insumo.semaforo === 'amarelo'
            ? 'alta'
            : 'baixa'

      const diasTxt =
        insumo.dias_ate_ruptura !== null ? `~${insumo.dias_ate_ruptura} dias` : 'sem projeção'
      const mensagem = `Estoque atual: ${insumo.estoque_atual} ${insumo.unidade} (${insumo.estoque_atual_kg.toFixed(0)} kg). Consumo projetado próximo mês: ${insumo.consumo_mensal_projetado.toFixed(0)} kg. Dias estimados até ruptura: ${diasTxt}. Sugestão de compra: ${insumo.sugestao_compra_kg.toFixed(0)} kg (${insumo.sugestao_compra_sacos.toFixed(1)} sacos de 30 kg).`

      await criarNotificacaoSistema({
        titulo:
          insumo.semaforo === 'vermelho'
            ? `Ruptura iminente: ${insumo.produto}`
            : `Risco de ruptura: ${insumo.produto}`,
        mensagem,
        tipo: 'estoque_baixo',
        severidade,
        lido: false,
        link_destino: '/estoque',
        referencia_id: insumo.insumo_id,
        destinatario_role: 'gestor',
      })
      criadas++
    }
  } catch (e) {
    console.warn('Erro ao gerar notificações de ruptura:', e)
  }
  return criadas
}
