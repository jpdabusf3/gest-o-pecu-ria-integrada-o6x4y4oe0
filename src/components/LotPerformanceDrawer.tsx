import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WeightGainChart } from './charts/WeightGainChart'
import { DailyWeightChart } from './charts/DailyWeightChart'
import { TrendingUp, BrainCircuit, Scale, Calendar, Clock, Layers } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPesagensByLote, PesagemRecord } from '@/services/pesagens'
import { getLots, LotRecord } from '@/services/lots'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

export function LotPerformanceDrawer({
  loteId,
  open,
  onOpenChange,
}: {
  loteId: string | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [lotDetails, setLotDetails] = useState<LotRecord | null>(null)
  const [pesagens, setPesagens] = useState<PesagemRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !loteId) return

    let cancelled = false
    setLoading(true)

    const fetchDetails = async () => {
      try {
        const allLots = await getLots()
        const target = allLots.find((l) => l.name === loteId || l.id === loteId)
        if (target && !cancelled) {
          setLotDetails(target)
          const records = await getPesagensByLote(target.id)
          if (!cancelled) setPesagens(records || [])
        }
      } catch (err) {
        console.error('Erro ao carregar detalhes do lote:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDetails()
    return () => {
      cancelled = true
    }
  }, [loteId, open])

  // Última pesagem registrada
  const ultimaPesagem = pesagens.length > 0 ? pesagens[0] : null

  // Cálculo de dias de permanência Exagro
  const dataEntrada = lotDetails?.data_entrada || lotDetails?.entry_date
  const dataSaida = lotDetails?.data_saida || lotDetails?.exit_date
  const diasPermanencia = dataEntrada
    ? differenceInDays(dataSaida ? parseISO(dataSaida) : new Date(), parseISO(dataEntrada))
    : lotDetails?.dias_permanencia || 0

  // Dados do gráfico de evolução do peso real
  const chartEvolucao = [...pesagens]
    .sort((a, b) => new Date(a.data_pesagem).getTime() - new Date(b.data_pesagem).getTime())
    .map((p) => ({
      data: format(parseISO(p.data_pesagem), 'dd/MM'),
      peso: p.peso_medio_kg,
      gmd: p.gmd_intervalo || 0,
    }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-[95vw] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Desempenho: {lotDetails?.name || loteId}
          </SheetTitle>
          <SheetDescription>
            Análise zootécnica Exagro, acompanhamento de pesagens reais e curva de ganho de peso.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-5">
          {/* Card ÚLTIMA PESAGEM */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Scale className="h-4 w-4" /> Última Pesagem
              </span>
              {ultimaPesagem && (
                <Badge variant="outline" className="text-xs bg-background">
                  {format(parseISO(ultimaPesagem.data_pesagem), 'dd/MM/yyyy')}
                </Badge>
              )}
            </div>

            {ultimaPesagem ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <span className="text-xs text-muted-foreground block">Peso Médio:</span>
                  <span className="text-xl font-bold text-foreground">
                    {ultimaPesagem.peso_medio_kg.toFixed(1)} kg
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    ~{(ultimaPesagem.peso_medio_kg / 15).toFixed(1)} @
                  </span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">GMD Intervalo:</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {ultimaPesagem.gmd_intervalo !== undefined &&
                    ultimaPesagem.gmd_intervalo !== null
                      ? `${ultimaPesagem.gmd_intervalo.toFixed(3)}`
                      : '-'}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">kg/cabeça/dia</span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">Intervalo:</span>
                  <span className="text-lg font-semibold text-foreground">
                    {ultimaPesagem.dias_intervalo
                      ? `${ultimaPesagem.dias_intervalo} dias`
                      : 'Inicial'}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">Permanência:</span>
                  <span className="text-lg font-semibold text-foreground">
                    {diasPermanencia} dias
                  </span>
                  <span className="text-[10px] text-muted-foreground block">no lote/pasto</span>
                </div>
              </div>
            ) : (
              <div className="py-2 text-sm text-muted-foreground">
                Nenhuma pesagem oficial registrada para este lote.
              </div>
            )}
          </div>

          {/* Gráfico de Evolução Real do Peso */}
          {chartEvolucao.length > 0 && (
            <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" /> Evolução do Peso Real (Recharts)
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {chartEvolucao.length} aferição(ões)
                </span>
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartEvolucao}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="data" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      domain={['dataMin - 15', 'dataMax + 15']}
                    />
                    <RechartsTooltip />
                    <Line
                      type="monotone"
                      dataKey="peso"
                      name="Peso Médio (kg)"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-muted/30 border border-border rounded-lg p-3.5 flex items-start gap-3">
            <BrainCircuit className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-xs text-primary">
                Projeção Zootécnica & Preditiva
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alterne entre a curva mensal projetada e o detalhamento diário para conferir a data
                alvo de abate.
              </p>
            </div>
          </div>

          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Evolução Mensal (IA)</TabsTrigger>
              <TabsTrigger value="daily">Projeção Diária</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-3 rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="font-medium mb-3 text-sm">Curva Preditiva vs. Real</h3>
              {loteId && <WeightGainChart loteId={loteId} />}
            </TabsContent>
            <TabsContent value="daily" className="mt-3 rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="font-medium mb-3 text-sm">Acompanhamento Diário Estimado</h3>
              {loteId && <DailyWeightChart loteId={loteId} />}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
