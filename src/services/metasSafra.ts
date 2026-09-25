import pb from '@/lib/pocketbase/client'
import {
  getConfigBenchmarks,
  calcularSafraAtual,
  calcularSafraAnterior,
} from '@/services/configBenchmark'

export type IndicadorMetaSafra = 'arroba_ha_ano' | 'custo_arroba' | 'margem_ebitda'

export interface MetaSafraRecord {
  id: string
  safra: string
  indicador: IndicadorMetaSafra
  valor_alvo: number
  observacoes?: string
  created_by?: string
  created?: string
  updated?: string
}

export type MetasSafraMap = Partial<Record<IndicadorMetaSafra, MetaSafraRecord>>

export interface IndicadorMetaConfig {
  codigo: IndicadorMetaSafra
  label: string
  unidade: string
  descricao: string
  menorMelhor: boolean
  benchmarkCodigo: string
  fallbackAlvo: number
}

export const CONFIG_INDICADORES_METAS: Record<IndicadorMetaSafra, IndicadorMetaConfig> = {
  arroba_ha_ano: {
    codigo: 'arroba_ha_ano',
    label: 'Produtividade (@/ha/ano)',
    unidade: '@ / ha / ano',
    descricao: 'Arrobas de carcaça produzidas por hectare útil ao ano',
    menorMelhor: false,
    benchmarkCodigo: 'prod_arroba_ha_ano_pasto',
    fallbackAlvo: 10.0,
  },
  custo_arroba: {
    codigo: 'custo_arroba',
    label: 'Custo por @ produzida',
    unidade: 'R$ / @',
    descricao: 'Custo de engorda/produção sem reposição de animais',
    menorMelhor: true,
    benchmarkCodigo: 'custo_arroba_produzida_engorda',
    fallbackAlvo: 199.59,
  },
  margem_ebitda: {
    codigo: 'margem_ebitda',
    label: 'Margem EBITDA',
    unidade: '%',
    descricao: 'Geração operacional de caixa sobre a receita pecuária',
    menorMelhor: false,
    benchmarkCodigo: 'margem_ebitda',
    fallbackAlvo: 17.1,
  },
}

export { calcularSafraAtual, calcularSafraAnterior }

/**
 * Busca valores sugeridos de metas lendo de config_benchmark (nunca hardcoded no fluxo)
 */
export async function getValoresSugeridosMetas(): Promise<
  Record<
    IndicadorMetaSafra,
    {
      valorSugerido: number
      unidade: string
      label: string
      menorMelhor: boolean
      origem: string
    }
  >
> {
  const benchmarks = await getConfigBenchmarks()
  const bmMap = new Map(benchmarks.map((b) => [b.codigo, b]))

  const result = {} as Record<
    IndicadorMetaSafra,
    {
      valorSugerido: number
      unidade: string
      label: string
      menorMelhor: boolean
      origem: string
    }
  >

  for (const key of Object.keys(CONFIG_INDICADORES_METAS) as IndicadorMetaSafra[]) {
    const config = CONFIG_INDICADORES_METAS[key]
    const bm = bmMap.get(config.benchmarkCodigo)
    const valorSugerido = bm?.alvo_fazenda ?? bm?.valor_referencia ?? config.fallbackAlvo

    result[key] = {
      valorSugerido,
      unidade: config.unidade,
      label: config.label,
      menorMelhor: config.menorMelhor,
      origem: bm ? 'config_benchmark' : 'referencia_padrao',
    }
  }

  return result
}

/**
 * Carrega as metas de uma safra específica (ex: "2025/2026")
 */
export async function getMetasSafra(safra?: string): Promise<MetasSafraMap> {
  const safraAlvo = safra || calcularSafraAtual()
  try {
    const records = await pb.collection('metas_safra').getFullList<MetaSafraRecord>({
      filter: `safra = '${safraAlvo}'`,
      sort: 'indicador',
    })

    const map: MetasSafraMap = {}
    for (const r of records) {
      if (r.indicador in CONFIG_INDICADORES_METAS) {
        map[r.indicador] = r
      }
    }
    return map
  } catch (err) {
    console.warn(`Erro ao carregar metas da safra ${safraAlvo}:`, err)
    return {}
  }
}

/**
 * Retorna todas as metas de todas as safras registradas
 */
export async function getAllMetasSafra(): Promise<MetaSafraRecord[]> {
  try {
    return await pb.collection('metas_safra').getFullList<MetaSafraRecord>({
      sort: '-safra,indicador',
    })
  } catch (err) {
    console.warn('Erro ao carregar todas as metas_safra:', err)
    return []
  }
}

/**
 * Salva ou atualiza as metas de uma safra (upsert por safra + indicador)
 */
export async function salvarMetasSafra(
  safra: string,
  metas: {
    indicador: IndicadorMetaSafra
    valor_alvo: number
    observacoes?: string
  }[],
  userId?: string,
): Promise<MetaSafraRecord[]> {
  const resultados: MetaSafraRecord[] = []
  const usuarioId = userId || pb.authStore.record?.id || null

  for (const item of metas) {
    try {
      // Checar se já existe registro único para (safra, indicador)
      const existentes = await pb.collection('metas_safra').getFullList<MetaSafraRecord>({
        filter: `safra = '${safra}' && indicador = '${item.indicador}'`,
        limit: 1,
      })

      if (existentes.length > 0) {
        const idExistente = existentes[0].id
        const updated = await pb.collection('metas_safra').update<MetaSafraRecord>(idExistente, {
          valor_alvo: Number(item.valor_alvo),
          observacoes: item.observacoes ?? existentes[0].observacoes ?? '',
        })
        resultados.push(updated)
      } else {
        const created = await pb.collection('metas_safra').create<MetaSafraRecord>({
          safra,
          indicador: item.indicador,
          valor_alvo: Number(item.valor_alvo),
          observacoes: item.observacoes ?? '',
          created_by: usuarioId,
        })
        resultados.push(created)
      }
    } catch (err) {
      console.error(`Erro ao salvar meta ${item.indicador} da safra ${safra}:`, err)
      throw err
    }
  }

  return resultados
}

/**
 * Calcula o atingimento percentual e status de conformidade
 * - Para maior é melhor (@/ha/ano, margem_ebitda): realizado >= meta -> verde (atingido)
 * - Para menor é melhor (custo/@): realizado <= meta -> verde (atingido)
 */
export function calcularAtingimentoMeta(
  indicador: IndicadorMetaSafra,
  valorRealizadoOuProjetado: number,
  valorMeta: number,
): {
  percentual: number
  atingido: boolean
  corTexto: string
  corBadge: string
  corBarra: string
  mensagem: string
} {
  const config = CONFIG_INDICADORES_METAS[indicador]
  const menorMelhor = config?.menorMelhor ?? false

  if (!valorMeta || valorMeta <= 0) {
    return {
      percentual: 0,
      atingido: false,
      corTexto: 'text-muted-foreground',
      corBadge: 'bg-muted text-muted-foreground border-border',
      corBarra: 'bg-muted',
      mensagem: 'Sem meta cadastrada',
    }
  }

  if (menorMelhor) {
    // Custo/@: atingido se realizado <= meta
    const atingido = valorRealizadoOuProjetado <= valorMeta
    // Se o realizado for menor que a meta, atingimento > 100% de eficiência
    const percentual =
      valorRealizadoOuProjetado > 0 ? (valorMeta / valorRealizadoOuProjetado) * 100 : 100

    const pctFormatado = Number(percentual.toFixed(1))

    if (atingido) {
      return {
        percentual: pctFormatado,
        atingido: true,
        corTexto: 'text-emerald-600 dark:text-emerald-400',
        corBadge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        corBarra: 'bg-emerald-500',
        mensagem: `Dentro da meta (${pctFormatado}% de eficiência)`,
      }
    } else {
      return {
        percentual: pctFormatado,
        atingido: false,
        corTexto: 'text-amber-600 dark:text-amber-400',
        corBadge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        corBarra: 'bg-amber-500',
        mensagem: `Acima da meta de custo`,
      }
    }
  } else {
    // Produtividade / Margem: atingido se realizado >= meta
    const atingido = valorRealizadoOuProjetado >= valorMeta
    const percentual = (valorRealizadoOuProjetado / valorMeta) * 100
    const pctFormatado = Number(percentual.toFixed(1))

    if (atingido) {
      return {
        percentual: pctFormatado,
        atingido: true,
        corTexto: 'text-emerald-600 dark:text-emerald-400',
        corBadge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        corBarra: 'bg-emerald-500',
        mensagem: `Meta atingida (${pctFormatado}%)`,
      }
    } else {
      return {
        percentual: pctFormatado,
        atingido: false,
        corTexto: 'text-amber-600 dark:text-amber-400',
        corBadge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        corBarra: 'bg-amber-500',
        mensagem: `${pctFormatado}% da meta`,
      }
    }
  }
}
