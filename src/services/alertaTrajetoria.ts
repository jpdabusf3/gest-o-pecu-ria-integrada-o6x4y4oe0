/**
 * Serviço de Alertas de Trajetória da Safra
 *
 * Monitora se a projeção da safra em andamento (@/ha/ano e custo/@)
 * caiu de faixa em relação à safra anterior realizada/arquivada.
 * Utiliza faixas dinâmicas de config_benchmark (nunca hardcoded).
 */

import { pb } from '@/lib/pocketbase/client'
import {
  ConfigBenchmarkRecord,
  StatusCamada2,
  getConfigBenchmarks,
  classificarCamada2,
  classificarIndicadorBenchmark,
} from './configBenchmark'
import { getFechamentosArquivados, FechamentoArquivadoRecord } from './safrasArquivadas'
import { criarNotificacaoSistema } from './notificacoesSistema'

export interface AlertaTrajetoriaItem {
  id: string
  indicador: 'produtividade' | 'custo'
  labelIndicador: string
  safraAtual: string
  safraAnterior: string
  valorSafraAnterior: number
  valorProjetadoSafraAtual: number
  faixaAnterior: StatusCamada2
  faixaAtual: StatusCamada2
  labelFaixaAnterior: string
  labelFaixaAtual: string
  variacaoValor: number
  variacaoPercentual: number
  reconhecido: boolean
  reconhecidoEm?: string
  reconhecidoPor?: string
  mensagem: string
}

export interface ReconhecimentoTrajetoriaRecord {
  id: string
  safra_atual: string
  safra_anterior: string
  tipo_indicador: 'produtividade' | 'custo'
  faixa_anterior: string
  faixa_atual: string
  reconhecido: boolean
  reconhecido_por?: string
  reconhecido_em?: string
  created: string
  updated: string
}

const ORDEM_FAIXAS_PROD: Record<StatusCamada2, number> = {
  top: 4,
  verde: 3,
  amarelo: 2,
  vermelho: 1,
}

const NOMES_FAIXAS: Record<StatusCamada2, string> = {
  top: '⭐ TOP BRASIL',
  verde: '🟢 Média Mercado',
  amarelo: '🟡 Atenção',
  vermelho: '🔴 Abaixo',
}

const BADGES_SIMPLES: Record<StatusCamada2, string> = {
  top: '⭐ TOP',
  verde: '🟢',
  amarelo: '🟡',
  vermelho: '🔴',
}

export function getLabelFaixa(faixa: StatusCamada2): string {
  return NOMES_FAIXAS[faixa] || faixa
}

export function getBadgeFaixa(faixa: StatusCamada2): string {
  return BADGES_SIMPLES[faixa] || faixa
}

/**
 * Busca reconhecimentos registrados para a safra
 */
export async function getReconhecimentosTrajetoria(
  safraAtual: string,
): Promise<ReconhecimentoTrajetoriaRecord[]> {
  try {
    const records = await pb
      .collection('reconhecimentos_trajetoria')
      .getFullList<ReconhecimentoTrajetoriaRecord>({
        filter: `safra_atual = "${safraAtual}"`,
      })
    return records
  } catch (err) {
    console.warn('Erro ao buscar reconhecimentos de trajetória:', err)
    return []
  }
}

/**
 * Marca um alerta de trajetória como reconhecido
 */
export async function reconhecerAlertaTrajetoria(params: {
  safraAtual: string
  safraAnterior: string
  tipoIndicador: 'produtividade' | 'custo'
  faixaAnterior: string
  faixaAtual: string
  reconhecidoPor?: string
}): Promise<boolean> {
  try {
    const existing = await pb
      .collection('reconhecimentos_trajetoria')
      .getFullList<ReconhecimentoTrajetoriaRecord>({
        filter: `safra_atual = "${params.safraAtual}" && tipo_indicador = "${params.tipoIndicador}"`,
      })

    const payload = {
      safra_atual: params.safraAtual,
      safra_anterior: params.safraAnterior,
      tipo_indicador: params.tipoIndicador,
      faixa_anterior: params.faixaAnterior,
      faixa_atual: params.faixaAtual,
      reconhecido: true,
      reconhecido_por: params.reconhecidoPor || 'Gestor',
      reconhecido_em: new Date().toISOString(),
    }

    if (existing.length > 0) {
      await pb.collection('reconhecimentos_trajetoria').update(existing[0].id, payload)
    } else {
      await pb.collection('reconhecimentos_trajetoria').create(payload)
    }
    return true
  } catch (err) {
    console.error('Erro ao reconhecer alerta de trajetória:', err)
    return false
  }
}

export interface AnalisarTrajetoriaParams {
  safraAtual: string
  safraAnterior: string
  produtividadeProjetada: number // @/ha/ano
  custoArrobaProjetado?: number // R$/@
  benchmarks?: ConfigBenchmarkRecord[]
  fechamentosArquivados?: FechamentoArquivadoRecord[]
  reconhecimentos?: ReconhecimentoTrajetoriaRecord[]
  usuarioNome?: string
  sincronizarNotificacao?: boolean
}

/**
 * Analisa se houve queda de faixa entre a safra anterior e a projeção atual
 */
export async function analisarTrajetoriaSafra(
  params: AnalisarTrajetoriaParams,
): Promise<AlertaTrajetoriaItem[]> {
  const {
    safraAtual,
    safraAnterior,
    produtividadeProjetada,
    custoArrobaProjetado,
    usuarioNome,
    sincronizarNotificacao = false,
  } = params

  const benchmarks = params.benchmarks || (await getConfigBenchmarks())
  const fechamentos = params.fechamentosArquivados || (await getFechamentosArquivados())
  const reconhecimentos = params.reconhecimentos || (await getReconhecimentosTrajetoria(safraAtual))

  const fechamentoAnterior = fechamentos.find(
    (f) => f.ano_safra === safraAnterior || (f as any).safra === safraAnterior,
  )
  if (!fechamentoAnterior) {
    // Sem safra anterior arquivada, não há como comparar trajetória
    return []
  }

  const alertas: AlertaTrajetoriaItem[] = []

  // 1) Análise de Produtividade (@/ha/ano)
  const bmProd = benchmarks.find(
    (b) =>
      b.codigo === 'prod_arroba_ha_ano_pasto' ||
      b.indicador === 'produtividade_ha_ano' ||
      b.codigo === 'produtividade_ha_ano',
  )
  const valorProdAnterior =
    fechamentoAnterior.arrobas_ha_ano || (fechamentoAnterior as any).produtividade_ha_ano || 0

  if (bmProd && valorProdAnterior > 0 && produtividadeProjetada > 0) {
    const resAnt = classificarCamada2(valorProdAnterior, bmProd)
    const resAtu = classificarCamada2(produtividadeProjetada, bmProd)
    const faixaAnterior = resAnt.status
    const faixaAtual = resAtu.status

    const pesoAnterior = ORDEM_FAIXAS_PROD[faixaAnterior] || 0
    const pesoAtual = ORDEM_FAIXAS_PROD[faixaAtual] || 0

    // Queda de faixa de produtividade: pesoAtual < pesoAnterior
    if (pesoAtual < pesoAnterior) {
      const rec = reconhecimentos.find(
        (r) =>
          r.tipo_indicador === 'produtividade' && r.faixa_atual === faixaAtual && r.reconhecido,
      )
      const diffValor = produtividadeProjetada - valorProdAnterior
      const diffPct = valorProdAnterior > 0 ? (diffValor / valorProdAnterior) * 100 : 0

      const badgeAnt = getBadgeFaixa(faixaAnterior)
      const badgeAtu = getBadgeFaixa(faixaAtual)

      const mensagem = `Projeção de Produtividade (${produtividadeProjetada.toFixed(1)} @/ha/ano) caiu da faixa ${badgeAnt} (${valorProdAnterior.toFixed(1)} @/ha/ano) para ${badgeAtu} na safra ${safraAtual} vs. ${safraAnterior}.`

      alertas.push({
        id: `traj-prod-${safraAtual}-${safraAnterior}`,
        indicador: 'produtividade',
        labelIndicador: 'Produtividade (@/ha/ano)',
        safraAtual,
        safraAnterior,
        valorSafraAnterior: valorProdAnterior,
        valorProjetadoSafraAtual: produtividadeProjetada,
        faixaAnterior,
        faixaAtual,
        labelFaixaAnterior: getLabelFaixa(faixaAnterior),
        labelFaixaAtual: getLabelFaixa(faixaAtual),
        variacaoValor: diffValor,
        variacaoPercentual: diffPct,
        reconhecido: Boolean(rec),
        reconhecidoEm: rec?.reconhecido_em,
        reconhecidoPor: rec?.reconhecido_por,
        mensagem,
      })
    }
  }

  // 2) Análise de Custo por Arroba (R$/@) — menor é melhor
  const bmCusto = benchmarks.find(
    (b) =>
      b.codigo === 'custo_arroba_produzida_engorda' ||
      b.indicador === 'custo_operacional_arroba' ||
      b.codigo === 'custo_operacional_arroba',
  )
  const valorCustoAnterior =
    fechamentoAnterior.custo_arroba_produzida || (fechamentoAnterior as any).custo_arroba_total || 0

  if (bmCusto && valorCustoAnterior > 0 && custoArrobaProjetado && custoArrobaProjetado > 0) {
    const resAntCusto = classificarIndicadorBenchmark(
      'custo_arroba_produzida_engorda',
      valorCustoAnterior,
      bmCusto,
    )
    const resAtuCusto = classificarIndicadorBenchmark(
      'custo_arroba_produzida_engorda',
      custoArrobaProjetado,
      bmCusto,
    )
    const faixaAnteriorCusto = resAntCusto.status
    const faixaAtualCusto = resAtuCusto.status

    const pesoAnteriorCusto = ORDEM_FAIXAS_PROD[faixaAnteriorCusto] || 0
    const pesoAtualCusto = ORDEM_FAIXAS_PROD[faixaAtualCusto] || 0

    // Para custo, classificarMetricaCamada2 já inverte (menor custo = 'top'/'verde')
    // Portanto pesoAtualCusto < pesoAnteriorCusto ainda indica piora!
    if (pesoAtualCusto < pesoAnteriorCusto) {
      const rec = reconhecimentos.find(
        (r) => r.tipo_indicador === 'custo' && r.faixa_atual === faixaAtualCusto && r.reconhecido,
      )
      const diffValor = custoArrobaProjetado - valorCustoAnterior
      const diffPct = valorCustoAnterior > 0 ? (diffValor / valorCustoAnterior) * 100 : 0

      const badgeAnt = getBadgeFaixa(faixaAnteriorCusto)
      const badgeAtu = getBadgeFaixa(faixaAtualCusto)

      const mensagem = `Custo/@ Projetado (R$ ${custoArrobaProjetado.toFixed(2)}) piorou de faixa: de ${badgeAnt} (R$ ${valorCustoAnterior.toFixed(2)}) para ${badgeAtu} na safra ${safraAtual} vs. ${safraAnterior}.`

      alertas.push({
        id: `traj-custo-${safraAtual}-${safraAnterior}`,
        indicador: 'custo',
        labelIndicador: 'Custo por Arroba (R$/@)',
        safraAtual,
        safraAnterior,
        valorSafraAnterior: valorCustoAnterior,
        valorProjetadoSafraAtual: custoArrobaProjetado,
        faixaAnterior: faixaAnteriorCusto,
        faixaAtual: faixaAtualCusto,
        labelFaixaAnterior: getLabelFaixa(faixaAnteriorCusto),
        labelFaixaAtual: getLabelFaixa(faixaAtualCusto),
        variacaoValor: diffValor,
        variacaoPercentual: diffPct,
        reconhecido: Boolean(rec),
        reconhecidoEm: rec?.reconhecido_em,
        reconhecidoPor: rec?.reconhecido_por,
        mensagem,
      })
    }
  }

  // Se solicitado, sincroniza no notificacoes_sistema de forma idempotente
  if (sincronizarNotificacao && alertas.length > 0) {
    try {
      const notifsExistentes = await pb.collection('notificacoes_sistema').getFullList({
        filter: `tipo = "projecao_safra"`,
        limit: 20,
      })

      for (const alerta of alertas) {
        if (alerta.reconhecido) continue
        const chaveBusca = `${alerta.indicador}_${alerta.safraAtual}_${alerta.faixaAtual}`
        const jaExiste = notifsExistentes.some(
          (n) =>
            n.titulo?.includes(alerta.safraAtual) && n.mensagem?.includes(alerta.labelIndicador),
        )
        if (!jaExiste) {
          await criarNotificacaoSistema({
            titulo: `⚠️ Trajetória em queda: ${alerta.labelIndicador} (${alerta.safraAtual})`,
            mensagem: alerta.mensagem,
            tipo: 'meta',
            severidade: alerta.faixaAtual === 'vermelho' ? 'critica' : 'alta',
            link_destino: '/fechamento',
            lido: false,
          })
        }
      }
    } catch (err) {
      console.warn('Erro ao sincronizar notificação de sistema de trajetória:', err)
    }
  }

  return alertas
}
