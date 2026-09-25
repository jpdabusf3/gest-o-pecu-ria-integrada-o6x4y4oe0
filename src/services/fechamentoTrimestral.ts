import { AtividadeRecord, getAtividades } from './atividades'
import { FrenteFechamento } from './fechamento'

export interface TrimestreAtividadesResumo {
  trimestreKey: string // ex: "T1", "T2", "T3", "T4"
  rotulo: string // ex: "1º Trimestre (Jan - Mar)"
  meses: number[] // [0, 1, 2]
  totalPlanejadas: number
  totalRealizadas: number
  totalNaoRealizadas: number
  totalEmAndamento: number
  taxaConclusaoPct: number
  custoInsumosRealizados: number
  custoDiariasRealizadas: number
  custoTotalRealizado: number
  custoTotalPlanejado: number
  atividadesPorFrente: Record<
    FrenteFechamento,
    {
      planejadas: number
      realizadas: number
      naoRealizadas: number
      custoInsumos: number
      custoDiarias: number
      custoTotal: number
    }
  >
  motivosNaoRealizadas: Record<string, number>
  listaAtividades: AtividadeRecord[]
}

const FRENTES_PADRAO: FrenteFechamento[] = [
  'todas',
  'cria',
  'recria',
  'engorda',
  'confinamento',
  'arrendamento',
]

export function getTrimestreInfo(dataIso: string): { key: string; rotulo: string; idx: number } {
  const d = new Date(dataIso)
  const mes = d.getMonth() // 0 to 11
  if (mes <= 2) return { key: 'T1', rotulo: '1º Trimestre (Jan - Mar)', idx: 0 }
  if (mes <= 5) return { key: 'T2', rotulo: '2º Trimestre (Abr - Jun)', idx: 1 }
  if (mes <= 8) return { key: 'T3', rotulo: '3º Trimestre (Jul - Set)', idx: 2 }
  return { key: 'T4', rotulo: '4º Trimestre (Out - Dez)', idx: 3 }
}

export async function consolidarAtividadesPorTrimestre(
  ano: number = new Date().getFullYear(),
  frenteFiltro: FrenteFechamento = 'todas',
): Promise<TrimestreAtividadesResumo[]> {
  const atividades = await getAtividades()

  // Filtra pelo ano selecionado
  const atividadesAno = atividades.filter((a) => {
    const d = new Date(a.data)
    return d.getFullYear() === ano
  })

  const trimestresConfig = [
    { key: 'T1', rotulo: '1º Trimestre (Jan - Mar)', meses: [0, 1, 2] },
    { key: 'T2', rotulo: '2º Trimestre (Abr - Jun)', meses: [3, 4, 5] },
    { key: 'T3', rotulo: '3º Trimestre (Jul - Set)', meses: [6, 7, 8] },
    { key: 'T4', rotulo: '4º Trimestre (Out - Dez)', meses: [9, 10, 11] },
  ]

  return trimestresConfig.map((t) => {
    const ativsTrimestre = atividadesAno.filter((a) => {
      const d = new Date(a.data)
      const mesMatch = t.meses.includes(d.getMonth())
      if (!mesMatch) return false
      if (frenteFiltro === 'todas') return true
      if (frenteFiltro === 'arrendamento') return a.is_arrendamento || a.frente === 'arrendamento'
      return a.frente === frenteFiltro
    })

    let totalPlanejadas = 0
    let totalRealizadas = 0
    let totalNaoRealizadas = 0
    let totalEmAndamento = 0
    let custoInsumosRealizados = 0
    let custoDiariasRealizadas = 0
    let custoTotalPlanejado = 0

    const motivosNaoRealizadas: Record<string, number> = {}
    const porFrente: Record<
      FrenteFechamento,
      {
        planejadas: number
        realizadas: number
        naoRealizadas: number
        custoInsumos: number
        custoDiarias: number
        custoTotal: number
      }
    > = {
      todas: { planejadas: 0, realizadas: 0, naoRealizadas: 0, custoInsumos: 0, custoDiarias: 0, custoTotal: 0 },
      cria: { planejadas: 0, realizadas: 0, naoRealizadas: 0, custoInsumos: 0, custoDiarias: 0, custoTotal: 0 },
      recria: { planejadas: 0, realizadas: 0, naoRealizadas: 0, custoInsumos: 0, custoDiarias: 0, custoTotal: 0 },
      engorda: { planejadas: 0, realizadas: 0, naoRealizadas: 0, custoInsumos: 0, custoDiarias: 0, custoTotal: 0 },
      confinamento: { planejadas: 0, realizadas: 0, naoRealizadas: 0, custoInsumos: 0, custoDiarias: 0, custoTotal: 0 },
      arrendamento: { planejadas: 0, realizadas: 0, naoRealizadas: 0, custoInsumos: 0, custoDiarias: 0, custoTotal: 0 },
    }

    ativsTrimestre.forEach((a) => {
      totalPlanejadas++
      const custoPrevisto = a.custo_previsto || 0
      custoTotalPlanejado += custoPrevisto

      const f = (a.is_arrendamento ? 'arrendamento' : a.frente || 'recria') as FrenteFechamento
      if (porFrente[f]) {
        porFrente[f].planejadas++
      }

      // Calcula insumos vinculados
      let custoInsumosAtiv = 0
      if (a.insumos && Array.isArray(a.insumos)) {
        custoInsumosAtiv = a.insumos.reduce((sum, item) => {
          return sum + (item.custoUnitario || 0) * (item.quantidade || 0)
        }, 0)
      }

      // Estima diárias/mão de obra operacional quando não especificada diretamente
      const custoDiariaAtiv =
        custoPrevisto > custoInsumosAtiv ? custoPrevisto - custoInsumosAtiv : 120 // R$ 120 diária padrão pecuária

      if (a.status === 'realizada') {
        totalRealizadas++
        custoInsumosRealizados += custoInsumosAtiv
        custoDiariasRealizadas += custoDiariaAtiv
        if (porFrente[f]) {
          porFrente[f].realizadas++
          porFrente[f].custoInsumos += custoInsumosAtiv
          porFrente[f].custoDiarias += custoDiariaAtiv
          porFrente[f].custoTotal += custoInsumosAtiv + custoDiariaAtiv
        }
      } else if (a.status === 'nao_realizada') {
        totalNaoRealizadas++
        if (porFrente[f]) porFrente[f].naoRealizadas++
        const motivo = a.motivo_nao_realizada || 'outro'
        motivosNaoRealizadas[motivo] = (motivosNaoRealizadas[motivo] || 0) + 1
      } else if (a.status === 'em_andamento') {
        totalEmAndamento++
      }
    })

    const taxaConclusaoPct =
      totalPlanejadas > 0 ? Number(((totalRealizadas / totalPlanejadas) * 100).toFixed(1)) : 0

    return {
      trimestreKey: t.key,
      rotulo: t.rotulo,
      meses: t.meses,
      totalPlanejadas,
      totalRealizadas,
      totalNaoRealizadas,
      totalEmAndamento,
      taxaConclusaoPct,
      custoInsumosRealizados: Number(custoInsumosRealizados.toFixed(2)),
      custoDiariasRealizadas: Number(custoDiariasRealizadas.toFixed(2)),
      custoTotalRealizado: Number((custoInsumosRealizados + custoDiariasRealizadas).toFixed(2)),
      custoTotalPlanejado: Number(custoTotalPlanejado.toFixed(2)),
      atividadesPorFrente: porFrente,
      motivosNaoRealizadas,
      listaAtividades: ativsTrimestre,
    }
  })
}
