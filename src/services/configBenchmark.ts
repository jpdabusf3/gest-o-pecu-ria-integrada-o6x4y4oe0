import pb from '@/lib/pocketbase/client'

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
  created?: string
  updated?: string
}

export type StatusCamada2 = 'vermelho' | 'amarelo' | 'verde' | 'top'

export interface ClassificacaoCamada2 {
  status: StatusCamada2
  label: string
  cor: string
  seloTop: boolean
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
    valor_media: 75.0,
    valor_referencia: 82.5,
    valor_top: 88.0,
    alvo_fazenda: 85.0,
  },
  cria_kg_bezerro_matriz: {
    id: 'default_cria_kg_bezerro_matriz',
    codigo: 'cria_kg_bezerro_matriz',
    indicador: 'Cria: kg de bezerro desmamado / matriz exposta',
    unidade: 'kg / matriz',
    categoria: 'reproducao',
    valor_media: 135.0,
    valor_referencia: 160.0,
    valor_top: 185.0,
    alvo_fazenda: 165.0,
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
 * Atualiza um indicador de benchmark
 */
export async function updateConfigBenchmark(
  id: string,
  data: Partial<ConfigBenchmarkRecord>,
): Promise<ConfigBenchmarkRecord> {
  return pb.collection('config_benchmark').update<ConfigBenchmarkRecord>(id, data)
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

  let status: StatusCamada2 = 'vermelho'
  let label = 'Abaixo da Média Exagro'
  let cor = 'text-destructive bg-destructive/10 border-destructive/30'

  if (seloTop) {
    status = 'top'
    label = 'Nível TOP Exagro (≥ 11,0 @/ha/ano)'
    cor = 'text-purple-700 dark:text-purple-300 bg-purple-500/15 border-purple-500/30'
  } else if (arrobasHaAno >= referencia) {
    status = 'verde'
    label = 'Nível Fazenda de Referência (≥ 10,0 @/ha/ano)'
    cor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
  } else if (arrobasHaAno >= media) {
    status = 'amarelo'
    label = 'Na Média Exagro (6,6 a 9,9 @/ha/ano)'
    cor = 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30'
  } else {
    status = 'vermelho'
    label = 'Abaixo da Média Exagro (< 6,6 @/ha/ano)'
    cor = 'text-destructive bg-destructive/10 border-destructive/30'
  }

  return {
    status,
    label,
    cor,
    seloTop,
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
