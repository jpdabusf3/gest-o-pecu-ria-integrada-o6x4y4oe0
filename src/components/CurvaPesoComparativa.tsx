import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import {
  TrendingUp,
  Layers,
  Check,
  Filter,
  Calendar,
  Award,
  RefreshCw,
  BarChart2,
} from 'lucide-react'
import { LotRecord } from '@/services/lots'
import { PesagemRecord } from '@/services/pesagens'
import { format, parseISO } from 'date-fns'

const PALETTE_COLORS = [
  'hsl(142, 76%, 36%)', // Emerald / Verde
  'hsl(221, 83%, 53%)', // Azul
  'hsl(262, 83%, 58%)', // Roxo
  'hsl(25, 95%, 53%)', // Âmbar / Laranja
  'hsl(346, 84%, 61%)', // Rosa
  'hsl(199, 89%, 48%)', // Ciano
  'hsl(48, 96%, 53%)', // Amarelo
  'hsl(168, 80%, 30%)', // Verde Escuro
]

interface CurvaPesoProps {
  lots: LotRecord[]
  pesagens: PesagemRecord[]
  onOpenLotDetails?: (loteId: string) => void
}

export function CurvaPesoComparativa({ lots, pesagens, onOpenLotDetails }: CurvaPesoProps) {
  // Filtros para seleção de lotes
  const [filtroSetor, setFiltroSetor] = useState<string>('all')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('all')
  const [modoVisualizacao, setModoVisualizacao] = useState<'data_calendario' | 'dias_permanencia'>(
    'data_calendario',
  )

  // Lotes disponíveis após filtros
  const lotesFiltrados = useMemo(() => {
    return lots.filter((lot) => {
      if (filtroSetor !== 'all' && lot.sector !== filtroSetor) return false
      if (filtroCategoria !== 'all' && lot.category !== filtroCategoria) return false
      return true
    })
  }, [lots, filtroSetor, filtroCategoria])

  // Categorias únicas
  const categorias = useMemo(() => {
    const set = new Set<string>()
    lots.forEach((l) => {
      if (l.category) set.add(l.category)
    })
    return Array.from(set)
  }, [lots])

  // Lotes selecionados para o gráfico (IDs)
  // Inicializa com até 3 lotes que possuam pesagens
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>(() => {
    const lotesComPesagens = lots.filter((l) => pesagens.some((p) => p.lote_id === l.id))
    return lotesComPesagens.slice(0, 3).map((l) => l.id)
  })

  // Alternar seleção de lote
  const toggleLot = (id: string) => {
    setSelectedLotIds((prev) => {
      if (prev.includes(id)) {
        // Mínimo de 1 lote selecionado
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const selectAllFiltered = () => {
    setSelectedLotIds(lotesFiltrados.map((l) => l.id))
  }

  const clearSelection = () => {
    if (lotesFiltrados.length > 0) {
      setSelectedLotIds([lotesFiltrados[0].id])
    }
  }

  // Mapa de cores para cada lote selecionado
  const lotColorMap = useMemo(() => {
    const map = new Map<string, string>()
    selectedLotIds.forEach((id, index) => {
      map.set(id, PALETTE_COLORS[index % PALETTE_COLORS.length])
    })
    return map
  }, [selectedLotIds])

  // Montagem da estrutura de dados para o Recharts
  // Cada ponto no gráfico pode ser por Data Real (ex: 15/06/2023) ou por Dia de Permanência (0, 30, 60...)
  const { chartData, lotPerformances, chartConfig } = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {}

    // Estatísticas de performance por lote selecionado
    const performances: Array<{
      id: string
      name: string
      category: string
      pasto: string
      pesoInicial: number
      pesoFinal: number
      ganhoTotalKg: number
      ganhoTotalArrobas: number
      gmdPonderado: number
      dias: number
      color: string
    }> = []

    if (modoVisualizacao === 'data_calendario') {
      // Coletar todas as datas únicas de pesagens dos lotes selecionados
      const datasSet = new Set<string>()

      selectedLotIds.forEach((lotId) => {
        const lot = lots.find((l) => l.id === lotId)
        if (!lot) return

        config[lotId] = {
          label: lot.name,
          color: lotColorMap.get(lotId) || PALETTE_COLORS[0],
        }

        const lotePesagens = pesagens
          .filter((p) => p.lote_id === lotId)
          .sort((a, b) => new Date(a.data_pesagem).getTime() - new Date(b.data_pesagem).getTime())

        lotePesagens.forEach((p) => {
          if (p.data_pesagem) {
            const dataStr = p.data_pesagem.split('T')[0]
            datasSet.add(dataStr)
          }
        })

        // Se tem pesagens, calcular ganho total
        if (lotePesagens.length > 0) {
          const inicial = lotePesagens[0].peso_medio_kg
          const final = lotePesagens[lotePesagens.length - 1].peso_medio_kg
          const ganho = Number((final - inicial).toFixed(1))
          const dias = Math.max(
            1,
            Math.round(
              (new Date(lotePesagens[lotePesagens.length - 1].data_pesagem).getTime() -
                new Date(lotePesagens[0].data_pesagem).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
          const gmd = dias > 0 && lotePesagens.length > 1 ? Number((ganho / dias).toFixed(3)) : 0

          performances.push({
            id: lot.id,
            name: lot.name,
            category: lot.category || lot.sector || 'Geral',
            pasto: lot.pasto_atual || 'Pasto Principal',
            pesoInicial: inicial,
            pesoFinal: final,
            ganhoTotalKg: ganho,
            // Arrobas de peso vivo = ganho / 30
            ganhoTotalArrobas: Number((ganho / 30).toFixed(2)),
            gmdPonderado: gmd,
            dias: dias,
            color: lotColorMap.get(lotId) || PALETTE_COLORS[0],
          })
        }
      })

      // Ordenar datas cronologicamente
      const datasOrdenadas = Array.from(datasSet).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      )

      // Montar linhas do gráfico
      const dataRows = datasOrdenadas.map((dt) => {
        const row: Record<string, any> = {
          date: format(parseISO(dt), 'dd/MM/yy'),
          rawDate: dt,
        }

        selectedLotIds.forEach((lotId) => {
          // Achar pesagem deste lote nesta data
          const pes = pesagens.find(
            (p) => p.lote_id === lotId && p.data_pesagem && p.data_pesagem.split('T')[0] === dt,
          )
          if (pes) {
            row[lotId] = Number(pes.peso_medio_kg.toFixed(1))
          }
        })

        return row
      })

      return { chartData: dataRows, lotPerformances: performances, chartConfig: config }
    } else {
      // Modo por Dias de Permanência (Alinhando dia 0 da entrada)
      // Agrupa por dia relativo desde a entrada do lote
      const diasPontos = new Map<number, Record<string, any>>()

      selectedLotIds.forEach((lotId) => {
        const lot = lots.find((l) => l.id === lotId)
        if (!lot) return

        config[lotId] = {
          label: lot.name,
          color: lotColorMap.get(lotId) || PALETTE_COLORS[0],
        }

        const lotePesagens = pesagens
          .filter((p) => p.lote_id === lotId)
          .sort((a, b) => new Date(a.data_pesagem).getTime() - new Date(b.data_pesagem).getTime())

        if (lotePesagens.length === 0) return

        const dataEntrada = lotePesagens[0].data_pesagem
        const entradaMs = new Date(dataEntrada).getTime()

        lotePesagens.forEach((p) => {
          const dias = Math.max(
            0,
            Math.round((new Date(p.data_pesagem).getTime() - entradaMs) / (1000 * 60 * 60 * 24)),
          )
          if (!diasPontos.has(dias)) {
            diasPontos.set(dias, { dia: `Dia ${dias}`, rawDia: dias })
          }
          diasPontos.get(dias)![lotId] = Number(p.peso_medio_kg.toFixed(1))
        })

        const inicial = lotePesagens[0].peso_medio_kg
        const final = lotePesagens[lotePesagens.length - 1].peso_medio_kg
        const ganho = Number((final - inicial).toFixed(1))
        const totalDias = Math.max(
          1,
          Math.round(
            (new Date(lotePesagens[lotePesagens.length - 1].data_pesagem).getTime() - entradaMs) /
              (1000 * 60 * 60 * 24),
          ),
        )
        const gmd =
          totalDias > 0 && lotePesagens.length > 1 ? Number((ganho / totalDias).toFixed(3)) : 0

        performances.push({
          id: lot.id,
          name: lot.name,
          category: lot.category || lot.sector || 'Geral',
          pasto: lot.pasto_atual || 'Pasto Principal',
          pesoInicial: inicial,
          pesoFinal: final,
          ganhoTotalKg: ganho,
          // Arrobas de peso vivo = ganho / 30
          ganhoTotalArrobas: Number((ganho / 30).toFixed(2)),
          gmdPonderado: gmd,
          dias: totalDias,
          color: lotColorMap.get(lotId) || PALETTE_COLORS[0],
        })
      })

      const dataRows = Array.from(diasPontos.values()).sort((a, b) => a.rawDia - b.rawDia)

      return { chartData: dataRows, lotPerformances: performances, chartConfig: config }
    }
  }, [selectedLotIds, lots, pesagens, modoVisualizacao, lotColorMap])

  // Lote campeão de performance
  const melhorLote = useMemo(() => {
    if (lotPerformances.length === 0) return null
    return [...lotPerformances].sort((a, b) => b.gmdPonderado - a.gmdPonderado)[0]
  }, [lotPerformances])

  return (
    <Card className="animate-fade-in border shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Curva de Peso Comparativa entre Lotes
            </CardTitle>
            <CardDescription className="mt-1">
              Compare a evolução de peso médio por pesagem e identifique os pastos e lotes de maior
              desempenho zootécnico.
            </CardDescription>
          </div>

          {/* Alternador de Modo de Eixo X */}
          <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg border text-xs">
            <button
              type="button"
              onClick={() => setModoVisualizacao('data_calendario')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                modoVisualizacao === 'data_calendario'
                  ? 'bg-background shadow-sm text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 inline mr-1" /> Data Calendário
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacao('dias_permanencia')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                modoVisualizacao === 'dias_permanencia'
                  ? 'bg-background shadow-sm text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5 inline mr-1" /> Dias de Permanência (Dia 0)
            </button>
          </div>
        </div>

        {/* Filtros de Seleção de Lotes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          <div>
            <span className="text-xs text-muted-foreground block mb-1 font-semibold">Setor</span>
            <Select value={filtroSetor} onValueChange={setFiltroSetor}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos os Setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Setores</SelectItem>
                <SelectItem value="cria">Cria</SelectItem>
                <SelectItem value="recria">Recria</SelectItem>
                <SelectItem value="engorda">Engorda</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="text-xs text-muted-foreground block mb-1 font-semibold">
              Categoria
            </span>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas Categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 flex items-end justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                className="h-9 text-xs"
              >
                Selecionar Todos ({lotesFiltrados.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-9 text-xs">
                Limpar
              </Button>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {selectedLotIds.length} lote(s) no gráfico
            </span>
          </div>
        </div>

        {/* Tags de Seleção Rápida de Lotes */}
        <div className="flex flex-wrap gap-2 pt-2">
          {lotesFiltrados.map((lot) => {
            const isSelected = selectedLotIds.includes(lot.id)
            const color = lotColorMap.get(lot.id)
            const countPesagens = pesagens.filter((p) => p.lote_id === lot.id).length

            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => toggleLot(lot.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? 'border-transparent text-white shadow-sm ring-1 ring-ring/30'
                    : 'bg-background hover:bg-muted text-muted-foreground border-border'
                }`}
                style={isSelected ? { backgroundColor: color } : {}}
              >
                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                <span>{lot.name}</span>
                <span className="text-[10px] opacity-80">({countPesagens} pes.)</span>
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Gráfico Recharts de Linhas Comparativas */}
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis
                  dataKey={modoVisualizacao === 'data_calendario' ? 'date' : 'dia'}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-xs text-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `${val} kg`}
                  className="text-xs text-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />

                {selectedLotIds.map((lotId) => {
                  const color = lotColorMap.get(lotId) || PALETTE_COLORS[0]
                  return (
                    <Line
                      key={lotId}
                      type="monotone"
                      dataKey={lotId}
                      name={chartConfig[lotId]?.label || lotId}
                      stroke={color}
                      strokeWidth={3}
                      connectNulls
                      dot={{
                        r: 4,
                        fill: color,
                        strokeWidth: 2,
                        stroke: 'hsl(var(--background))',
                      }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-6 border rounded-xl bg-muted/20 text-muted-foreground">
            <BarChart2 className="h-10 w-10 text-muted-foreground/60 mb-2" />
            <p className="font-semibold text-sm">Nenhum dado de pesagem encontrado</p>
            <p className="text-xs max-w-sm mt-1">
              Os lotes selecionados ainda não possuem pesagens registradas para traçar a curva
              comparativa.
            </p>
          </div>
        )}

        {/* Tabela de Ranking e Comparação Zootécnica entre Lotes Selecionados */}
        {lotPerformances.length > 0 && (
          <div className="border rounded-xl p-4 bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-500" /> Comparativo de Performance no Período
              </span>
              {melhorLote && (
                <Badge
                  variant="outline"
                  className="text-emerald-700 bg-emerald-50 border-emerald-300 text-xs"
                >
                  🏆 Melhor Pasto/Lote: <strong>{melhorLote.name}</strong> ({melhorLote.pasto}) •
                  GMD: {melhorLote.gmdPonderado} kg/d
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lotPerformances.map((perf) => {
                const isLeader = melhorLote?.id === perf.id
                return (
                  <div
                    key={perf.id}
                    className={`p-3.5 rounded-lg border bg-card shadow-sm space-y-2 relative transition-all ${
                      isLeader ? 'ring-2 ring-emerald-500/30 border-emerald-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: perf.color }}
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => onOpenLotDetails?.(perf.id)}
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors text-left"
                          >
                            {perf.name}
                          </button>
                          <span className="text-xs text-muted-foreground block">
                            {perf.category} • {perf.pasto}
                          </span>
                        </div>
                      </div>
                      {isLeader && (
                        <Badge className="bg-emerald-600 text-white text-[10px]">Top GMD</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">GMD Médio:</span>
                        <span className="font-bold text-emerald-600 text-sm">
                          {perf.gmdPonderado > 0 ? `${perf.gmdPonderado} kg/d` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">
                          Ganho Total:
                        </span>
                        <span className="font-semibold text-foreground text-sm">
                          +{perf.ganhoTotalKg} kg
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          ({perf.ganhoTotalArrobas} @)
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Evolução:</span>
                        <span className="font-mono text-xs text-foreground">
                          {perf.pesoInicial} &rarr; {perf.pesoFinal} kg
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {perf.dias} dias
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
