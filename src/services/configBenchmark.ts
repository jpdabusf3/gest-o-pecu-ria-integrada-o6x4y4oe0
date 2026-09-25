import pb from '@/lib/pocketbase/client'
import { criarNotificacaoSistema } from './notificacoesSistema'

export interface ConfigBenchmarkRecord {
  id: string
  codigo: string
  indicador: string
  unidade: string
  categoria?: string
  valor_media: number
  valor_referencia: number
  valor_top: number
  alvo_fazenda: number
  observacao?: string
  data_ultima_recalibracao?: string
  recalibracao_adiada_ate?: string
  created?: string
  updated?: string
}

export type StatusCamada2 = 'vermelho' | 'amarelo' | 'verde' | 'top'

export interface ClassificacaoCamada2 {
  status: StatusCamada2
  label: string
  cor: string
  seloTop: boolean
  seloReferencia: boolean
  valorAtual: number
  faixas: {
    media: number
    referencia: number
    top: number
    alvo: number
  }
}

// Fallback caso a coleção esteja momentaneamente indisponível
export const DEFAULT_BENCHMARKS: Record<string, ConfigBenchmarkRecord> = {
  prod_arroba_ha_ano_pasto: {
    id: 'default_prod_arroba_ha_ano_pasto',
    codigo: 'prod_arroba_ha_ano_pasto',
    indicador: 'Produção em pastagem (@/ha/ano)',
    unidade: '@ / ha / ano',
    categoria: 'produtividade',
    valor_media: 6.6,
    valor_referencia: 10.0,
    valor_top: 11.0,
    alvo_fazenda: 10.0,
    observacao: 'Média 6,6 | Referência (MT, TIP) 10,0 | TOP 11,0',
  },
  gmd_engorda_tip: {
    id: 'default_gmd_engorda_tip',
    codigo: 'gmd_engorda_tip',
    indicador: 'GMD Engorda / TIP',
    unidade: 'kg/dia',
    categoria: 'zootecnico',
    valor_media: 1.15,
    valor_referencia: 1.29,
    valor_top: 1.375,
    alvo_fazenda: 1.3,
    observacao: 'Referência do caso 1,290 kg/dia | Alvo: 1,30 kg/dia',
  },
  gmd_recria_pasto: {
    id: 'default_gmd_recria_pasto',
    codigo: 'gmd_recria_pasto',
    indicador: 'GMD Recria a pasto / RIP',
    unidade: 'kg/dia',
    categoria: 'zootecnico',
    valor_media: 0.352,
    valor_referencia: 0.45,
    valor_top: 0.65,
    alvo_fazenda: 0.5,
    observacao: 'Referência do caso 0,352 kg/dia | Alvo RIP: 0,50 kg/dia',
  },
  cria_taxa_desmame: {
    id: 'default_cria_taxa_desmame',
    codigo: 'cria_taxa_desmame',
    indicador: 'Cria: Taxa de desmame (%)',
    unidade: '%',
    categoria: 'reproducao',
    valor_media: 70.0,
    valor_referencia: 75.0,
    valor_top: 85.0,
    alvo_fazenda: 75.0,
    observacao: 'Meta definida pelo usuário: Taxa de desmame acima de 75%',
  },
  cria_kg_bezerro_matriz: {
    id: 'default_cria_kg_bezerro_matriz',
    codigo: 'cria_kg_bezerro_matriz',
    indicador: 'Cria: kg de bezerro desmamado / matriz exposta',
    unidade: 'kg / matriz',
    categoria: 'reproducao',
    valor_media: 150.0,
    valor_referencia: 175.0,
    valor_top: 190.0,
    alvo_fazenda: 190.0,
    observacao: 'Meta definida pelo usuário: kg de bezerro desmamado por matriz acima de 190 kg',
  },
  custo_arroba_produzida_engorda: {
    id: 'default_custo_arroba_produzida_engorda',
    codigo: 'custo_arroba_produzida_engorda',
    indicador: 'Custo da @ produzida (engorda, sem reposição)',
    unidade: 'R$ / @',
    categoria: 'economico',
    valor_media: 215.0,
    valor_referencia: 199.59,
    valor_top: 185.0,
    alvo_fazenda: 199.59,
    observacao: 'Referência Exagro R$ 199,59/@',
  },
  custeio_total_cab_ano: {
    id: 'default_custeio_total_cab_ano',
    codigo: 'custeio_total_cab_ano',
    indicador: 'Custeio total por cabeça / ano',
    unidade: 'R$ / cab / ano',
    categoria: 'economico',
    valor_media: 861.2,
    valor_referencia: 1102.5,
    valor_top: 1142.1,
    alvo_fazenda: 1102.5,
    observacao: 'Média R$ 861,2 | Referência R$ 1.102,5 | TOP R$ 1.142,1',
  },
  margem_ebitda: {
    id: 'default_margem_ebitda',
    codigo: 'margem_ebitda',
    indicador: 'Margem EBITDA',
    unidade: '%',
    categoria: 'economico',
    valor_media: 13.4,
    valor_referencia: 17.1,
    valor_top: 25.6,
    alvo_fazenda: 17.1,
    observacao: 'Média 13,4% | Referência 17,1% | TOP 25,6%',
  },
}

/**
 * Busca todas as configurações de benchmark do PocketBase
 */
export async function getConfigBenchmarks(): Promise<ConfigBenchmarkRecord[]> {
  try {
    const list = await pb.collection('config_benchmark').getFullList<ConfigBenchmarkRecord>({
      sort: 'codigo',
    })
    if (list && list.length > 0) return list
  } catch (err) {
    console.warn('Usando benchmarks locais padrão:', err)
  }
  return Object.values(DEFAULT_BENCHMARKS)
}

/**
 * Atualiza um indicador de benchmark e opcionalmente registra data_ultima_recalibracao
 */
export async function updateConfigBenchmark(
  id: string,
  data: Partial<ConfigBenchmarkRecord>,
): Promise<ConfigBenchmarkRecord> {
  return pb.collection('config_benchmark').update<ConfigBenchmarkRecord>(id, data)
}

/**
 * Registra a recalibração de toda a grade de benchmarks com a data atual
 */
export async function registrarRecalibracaoBenchmark(
  benchmarks: ConfigBenchmarkRecord[],
): Promise<void> {
  const agora = new Date().toISOString()
  for (const b of benchmarks) {
    try {
      await pb.collection('config_benchmark').update(b.id, {
        data_ultima_recalibracao: agora,
        recalibracao_adiada_ate: '',
      })
    } catch (err) {
      console.warn('Erro ao atualizar recalibração de indicador:', b.codigo, err)
    }
  }
}

/**
 * Adia a recalibração por 12 meses
 */
export async function adiarRecalibracaoBenchmark(
  benchmarks: ConfigBenchmarkRecord[],
): Promise<void> {
  const dataAdiada = new Date()
  dataAdiada.setFullYear(dataAdiada.getFullYear() + 1)
  const adiadaIso = dataAdiada.toISOString()

  for (const b of benchmarks) {
    try {
      await pb.collection('config_benchmark').update(b.id, {
        recalibracao_adiada_ate: adiadaIso,
      })
    } catch (err) {
      console.warn('Erro ao adiar recalibração:', b.codigo, err)
    }
  }
}

/**
 * Verifica se a recalibração anual está devida (due)
 * Critérios:
 * - Passou mais de 12 meses desde data_ultima_recalibracao (ou nunca recalibrado)
 * - E recalibracao_adiada_ate não está no futuro
 */
export function verificarRecalibracaoDevida(benchmarks: ConfigBenchmarkRecord[]): {
  isDevida: boolean
  diasAtrasoOuRestantes: number
  ultimaData: string | null
  adiadaAte: string | null
} {
  if (!benchmarks || benchmarks.length === 0) {
    return { isDevida: false, diasAtrasoOuRestantes: 0, ultimaData: null, adiadaAte: null }
  }

  // Obter a data mais recente de recalibração
  const datas = benchmarks
    .map((b) => b.data_ultima_recalibracao)
    .filter(Boolean)
    .map((d) => new Date(d!).getTime())

  const ultimaDataMs = datas.length > 0 ? Math.max(...datas) : null
  const adiadaDatas = benchmarks
    .map((b) => b.recalibracao_adiada_ate)
    .filter(Boolean)
    .map((d) => new Date(d!).getTime())
  const adiadaMs = adiadaDatas.length > 0 ? Math.max(...adiadaDatas) : null

  const agoraMs = Date.now()

  // Se adiada até o futuro, não é devida
  if (adiadaMs && adiadaMs > agoraMs) {
    const diasRestantes = Math.ceil((adiadaMs - agoraMs) / (1000 * 60 * 60 * 24))
    return {
      isDevida: false,
      diasAtrasoOuRestantes: diasRestantes,
      ultimaData: ultimaDataMs ? new Date(ultimaDataMs).toISOString() : null,
      adiadaAte: new Date(adiadaMs).toISOString(),
    }
  }

  // 12 meses = 365 dias
  const umAnoMs = 365 * 24 * 60 * 60 * 1000
  if (!ultimaDataMs) {
    return {
      isDevida: true,
      diasAtrasoOuRestantes: 365,
      ultimaData: null,
      adiadaAte: null,
    }
  }

  const tempoDesdeUltimaMs = agoraMs - ultimaDataMs
  const isDevida = tempoDesdeUltimaMs >= umAnoMs
  const dias = Math.round((tempoDesdeUltimaMs - umAnoMs) / (1000 * 60 * 60 * 24))

  return {
    isDevida,
    diasAtrasoOuRestantes: dias,
    ultimaData: new Date(ultimaDataMs).toISOString(),
    adiadaAte: adiadaMs ? new Date(adiadaMs).toISOString() : null,
  }
}

/**
 * Garante que exista uma notificação in-app na central de notificações caso a recalibração esteja devida
 */
export async function emitirNotificacaoRecalibracaoSeNecessario(
  benchmarks: ConfigBenchmarkRecord[],
): Promise<void> {
  const status = verificarRecalibracaoDevida(benchmarks)
  if (!status.isDevida) return

  try {
    // Verifica se já existe notificação de recalibração criada recentemente
    const existentes = await pb.collection('notificacoes_sistema').getFullList({
      filter: "tipo = 'meta' && titulo ~ 'Recalibração Anual' && lido = false",
      limit: 1,
    })

    if (existentes.length === 0) {
      await criarNotificacaoSistema({
        titulo: 'Recalibração Anual do Benchmarking Exagro',
        mensagem:
          'Início de safra: revise os valores de Média, Referência e TOP no painel de benchmarking ou adie por 12 meses.',
        tipo: 'meta',
        severidade: 'alta',
        lido: false,
        link_destino: '/configuracoes?tab=benchmarking',
        destinatario_role: 'gestor',
      })
    }
  } catch (err) {
    console.warn('Erro ao emitir notificação de recalibração:', err)
  }
}

/**
 * Classifica a Camada 2 — benchmark anual @/ha/ano em pastagem:
 * - vermelho: abaixo de 6,6 (abaixo da média Exagro)
 * - amarelo: entre 6,6 e 9,9 (entre média e nível da fazenda de referência)
 * - verde: a partir de 10,0 (nível da fazenda de referência)
 * - selo TOP: quando >= 11,0
 */
export function classificarCamada2(
  arrobasHaAno: number,
  benchmark?: ConfigBenchmarkRecord,
): ClassificacaoCamada2 {
  const media = benchmark?.valor_media ?? 6.6
  const referencia = benchmark?.valor_referencia ?? 10.0
  const top = benchmark?.valor_top ?? 11.0
  const alvo = benchmark?.alvo_fazenda ?? 10.0

  const seloTop = arrobasHaAno >= top
  const seloReferencia = arrobasHaAno >= referencia

  let status: StatusCamada2 = 'vermelho'
  let label = 'Abaixo da Média Exagro'
  let cor = 'text-destructive bg-destructive/10 border-destructive/30'

  if (seloTop) {
    status = 'top'
    label = `Nível TOP Exagro (≥ ${top.toFixed(1)} @/ha/ano)`
    cor = 'text-purple-700 dark:text-purple-300 bg-purple-500/15 border-purple-500/30'
  } else if (arrobasHaAno >= referencia) {
    status = 'verde'
    label = `Nível Fazenda de Referência (≥ ${referencia.toFixed(1)} @/ha/ano)`
    cor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
  } else if (arrobasHaAno >= media) {
    status = 'amarelo'
    label = `Na Média Exagro (${media.toFixed(1)} a ${(referencia - 0.1).toFixed(1)} @/ha/ano)`
    cor = 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30'
  } else {
    status = 'vermelho'
    label = `Abaixo da Média Exagro (< ${media.toFixed(1)} @/ha/ano)`
    cor = 'text-destructive bg-destructive/10 border-destructive/30'
  }

  return {
    status,
    label,
    cor,
    seloTop,
    seloReferencia,
    valorAtual: Number(arrobasHaAno.toFixed(2)),
    faixas: {
      media,
      referencia,
      top,
      alvo,
    },
  }
}

/**
 * Classifica genericamente qualquer um dos indicadores do benchmarking Exagro contra as 3 faixas.
 * Para custos (onde menor é melhor), a lógica inverte:
 * - valor <= top: TOP Brasil
 * - valor <= referencia: Nível Referência
 * - valor <= media: Na Média
 * - valor > media: Acima da Média (Vermelho/Alerta)
 *
 * Para produtividade / GMD / desmame / ebitda (onde maior é melhor):
 * - valor >= top: TOP Brasil
 * - valor >= referencia: Nível Referência
 * - valor >= media: Na Média
 * - valor < media: Abaixo da Média
 */
export function classificarIndicadorBenchmark(
  codigo: string,
  valorAtual: number,
  benchmark?: ConfigBenchmarkRecord,
): {
  status: StatusCamada2
  label: string
  cor: string
  seloTop: boolean
  seloReferencia: boolean
  menorMelhor: boolean
  percentualBarra: number
  faixas: {
    media: number
    referencia: number
    top: number
    alvo: number
  }
} {
  const b = benchmark || DEFAULT_BENCHMARKS[codigo]
  const media = b?.valor_media ?? 0
  const referencia = b?.valor_referencia ?? 0
  const top = b?.valor_top ?? 0
  const alvo = b?.alvo_fazenda ?? referencia

  // Indicadores onde MENOR custo é melhor
  const menorMelhor =
    codigo === 'custo_arroba_produzida_engorda' || codigo === 'custeio_total_cab_ano'

  let seloTop = false
  let seloReferencia = false
  let status: StatusCamada2 = 'vermelho'
  let label = ''
  let cor = ''
  let pctBarra = 0

  if (menorMelhor) {
    // Custo: top (menor) < ref < media
    seloTop = valorAtual <= top
    seloReferencia = valorAtual <= referencia

    if (seloTop) {
      status = 'top'
      label = `Nível TOP Brasil (≤ ${top.toLocaleString('pt-BR')})`
      cor = 'text-purple-700 dark:text-purple-300 bg-purple-500/15 border-purple-500/30'
    } else if (seloReferencia) {
      status = 'verde'
      label = `Nível Referência (≤ ${referencia.toLocaleString('pt-BR')})`
      cor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
    } else if (valorAtual <= media) {
      status = 'amarelo'
      label = `Na Média de Mercado (≤ ${media.toLocaleString('pt-BR')})`
      cor = 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30'
    } else {
      status = 'vermelho'
      label = `Acima da Média de Custo (> ${media.toLocaleString('pt-BR')})`
      cor = 'text-destructive bg-destructive/10 border-destructive/30'
    }

    // Normalização visual da barra (escala invertida para o verde ficar à direita ou posição relativa)
    const maxEscala = media * 1.3
    const minEscala = Math.max(0, top * 0.7)
    pctBarra = Math.min(
      100,
      Math.max(5, ((maxEscala - valorAtual) / (maxEscala - minEscala)) * 100),
    )
  } else {
    // Maior é melhor
    seloTop = valorAtual >= top
    seloReferencia = valorAtual >= referencia

    if (seloTop) {
      status = 'top'
      label = `Nível TOP Brasil (≥ ${top.toLocaleString('pt-BR')})`
      cor = 'text-purple-700 dark:text-purple-300 bg-purple-500/15 border-purple-500/30'
    } else if (seloReferencia) {
      status = 'verde'
      label = `Nível Referência (≥ ${referencia.toLocaleString('pt-BR')})`
      cor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
    } else if (valorAtual >= media) {
      status = 'amarelo'
      label = `Na Média de Mercado (≥ ${media.toLocaleString('pt-BR')})`
      cor = 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30'
    } else {
      status = 'vermelho'
      label = `Abaixo da Média (< ${media.toLocaleString('pt-BR')})`
      cor = 'text-destructive bg-destructive/10 border-destructive/30'
    }

    const maxEscala = Math.max(top * 1.25, valorAtual * 1.1)
    pctBarra = maxEscala > 0 ? Math.min(100, Math.max(5, (valorAtual / maxEscala) * 100)) : 50
  }

  return {
    status,
    label,
    cor,
    seloTop,
    seloReferencia,
    menorMelhor,
    percentualBarra: Number(pctBarra.toFixed(1)),
    faixas: {
      media,
      referencia,
      top,
      alvo,
    },
  }
}

/**
 * Retorna o GMD alvo padrão por fase segundo o benchmarking Exagro configurado:
 * - engorda/tip_rip/confinamento: alvo engorda/TIP (padrão 1,30 kg/dia)
 * - recria: alvo RIP configurado pelo gestor (padrão 0,50 kg/dia)
 * - cria: sem GMD alvo obrigatório (retorna null ou meta de cria)
 */
export function getGmdAlvoPadraoFase(
  fase: string | undefined,
  benchmarks: ConfigBenchmarkRecord[] = [],
): { gmdKgDia: number | null; isCria: boolean; observacao: string } {
  const mapBenchmarks = new Map(benchmarks.map((b) => [b.codigo, b]))

  if (fase === 'cria') {
    return {
      gmdKgDia: null,
      isCria: true,
      observacao:
        'Fase de cria: avaliar por taxa de desmame (%) e kg de bezerro/matriz, não por GMD.',
    }
  }

  if (fase === 'engorda' || fase === 'tip_rip' || fase === 'confinamento') {
    const alvo = mapBenchmarks.get('gmd_engorda_tip')?.alvo_fazenda ?? 1.3
    return {
      gmdKgDia: Number(alvo.toFixed(2)),
      isCria: false,
      observacao: `Benchmark Exagro TIP/Engorda: ${alvo.toFixed(2)} kg/dia`,
    }
  }

  // Recria ou padrão geral
  const alvo = mapBenchmarks.get('gmd_recria_pasto')?.alvo_fazenda ?? 0.5
  return {
    gmdKgDia: Number(alvo.toFixed(2)),
    isCria: false,
    observacao: `Benchmark Exagro Recria/RIP: ${alvo.toFixed(2)} kg/dia`,
  }
}
