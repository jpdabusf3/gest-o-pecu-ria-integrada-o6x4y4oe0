import { useState, useEffect, useCallback } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sectorData } from '@/data/mock'
import { Beef, Activity, DollarSign, LineChart, BarChart2, Users } from 'lucide-react'
import { LotPerformanceDrawer } from '@/components/LotPerformanceDrawer'
import { IatfTab } from '@/components/sector/IatfTab'
import { SectorCalendarTab } from '@/components/sector/SectorCalendarTab'
import { SectorPastureTab } from '@/components/sector/SectorPastureTab'
import { getLots, type LotRecord } from '@/services/lots'
import { useRealtime } from '@/hooks/use-realtime'
import { differenceInDays, parseISO } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { useExitAlerts } from '@/hooks/use-exit-alerts'
import { ExitPointAlertCard } from '@/components/ExitPointAlertCard'
import { BasisMonitoringChart } from '@/components/BasisMonitoringChart'

export default function Setor() {
  const { id } = useParams<{ id: string }>()
  const [selectedLote, setSelectedLote] = useState<string | null>(null)
  const [lots, setLots] = useState<LotRecord[]>([])
  const [activeChart, setActiveChart] = useState<'gmd' | 'headcount'>('gmd')

  const loadData = useCallback(async () => {
    try {
      if (id) {
        const records = await getLots(`sector = '${id}'`)
        setLots(records)
      }
    } catch (err) {
      console.error(err)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('lots', () => loadData())

  const lotIds = lots.map((l) => l.id)
  const { alerts: exitAlerts } = useExitAlerts(lotIds)

  const data = sectorData[id as keyof typeof sectorData]
  if (!data) return <Navigate to="/" replace />

  const chartData = lots.map((l) => {
    const days =
      l.entry_date && l.exit_date
        ? differenceInDays(parseISO(l.exit_date), parseISO(l.entry_date))
        : 30
    const gmd = days > 0 ? ((l.final_weight || 0) - (l.initial_weight || 0)) / days : 0
    return { name: l.name, gmd: Number(gmd.toFixed(3)), headcount: l.headcount || 0 }
  })

  const avgGmd = chartData.length
    ? chartData.reduce((acc, curr) => acc + curr.gmd, 0) / chartData.length
    : 0
  const totalHeads = chartData.reduce((acc, curr) => acc + curr.headcount, 0)

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{data.title}</h2>
        <p className="text-muted-foreground mt-1">{data.description}</p>
      </div>

      {exitAlerts.length > 0 && <ExitPointAlertCard alerts={exitAlerts} />}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto bg-transparent border-b rounded-none p-0 h-auto gap-4">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
          >
            Visão Geral & Lotes
          </TabsTrigger>
          <TabsTrigger
            value="pastures"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
          >
            Pastagens & Nutrição
          </TabsTrigger>
          {id === 'cria' && (
            <TabsTrigger
              value="reproduction"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
            >
              Gestão Reprodutiva (IATF)
            </TabsTrigger>
          )}
          <TabsTrigger
            value="calendar"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
          >
            Calendário Operacional
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeChart === 'gmd' ? 'default' : 'outline'}
              onClick={() => setActiveChart('gmd')}
              className="gap-2"
            >
              <Activity className="h-4 w-4" /> Desempenho GMD
            </Button>
            <Button
              variant={activeChart === 'headcount' ? 'default' : 'outline'}
              onClick={() => setActiveChart('headcount')}
              className="gap-2"
            >
              <Users className="h-4 w-4" /> Contagem de Animais
            </Button>
          </div>

          {lots.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {activeChart === 'gmd'
                    ? 'Comparativo de GMD por Lote'
                    : 'Distribuição de Cabeças por Lote'}
                </CardTitle>
                <CardDescription>
                  {activeChart === 'gmd'
                    ? `Média do setor: ${avgGmd.toFixed(3)} kg/d`
                    : `Total no setor: ${totalHeads} cabeças`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    value: {
                      label: activeChart === 'gmd' ? 'GMD (kg/d)' : 'Cabeças',
                      color: 'hsl(var(--primary))',
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      cursor={{ fill: 'var(--color-muted)' }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar
                      dataKey={activeChart === 'gmd' ? 'gmd' : 'headcount'}
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            activeChart === 'gmd' && entry.gmd < avgGmd
                              ? 'hsl(var(--destructive))'
                              : 'hsl(var(--primary))'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-primary">Total Cabeças</CardTitle>
                <Beef className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{data.kpis.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {data.kpis.labelIndicador}
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.kpis.indicadorPrincipal}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Custo Mensal (Cab)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.kpis.custoCabeca}</div>
              </CardContent>
            </Card>
          </div>

          <BasisMonitoringChart />

          <Card>
            <CardHeader>
              <CardTitle>Composição de Lotes - Fichas Zootécnicas</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote ID</TableHead>
                      {id === 'cria' && (
                        <>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Cabeças</TableHead>
                          <TableHead>Taxa Prenhez</TableHead>
                          <TableHead>Prev. Parto</TableHead>
                        </>
                      )}
                      {id === 'recria' && (
                        <>
                          <TableHead>Peso Entrada</TableHead>
                          <TableHead>Peso Atual Est.</TableHead>
                          <TableHead>GMD Atual</TableHead>
                          <TableHead>Suplemento</TableHead>
                          <TableHead>Dias Pasto</TableHead>
                        </>
                      )}
                      {id === 'engorda' && (
                        <>
                          <TableHead>Peso Entrada</TableHead>
                          <TableHead>Peso Atual Est.</TableHead>
                          <TableHead>GMD Previsto</TableHead>
                          <TableHead>Dieta</TableHead>
                        </>
                      )}
                      <TableHead>Localização</TableHead>
                      <TableHead>Status Sanitário</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lotes.map((lote: any) => (
                      <TableRow
                        key={lote.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedLote(lote.id)}
                      >
                        <TableCell className="font-medium text-primary">{lote.id}</TableCell>

                        {id === 'cria' && (
                          <>
                            <TableCell>{lote.categoria}</TableCell>
                            <TableCell className="text-right font-mono">{lote.cabecas}</TableCell>
                            <TableCell className="font-semibold text-emerald-600">
                              {lote.taxaPrenhez}
                            </TableCell>
                            <TableCell>{lote.previsaoParto}</TableCell>
                          </>
                        )}
                        {id === 'recria' && (
                          <>
                            <TableCell>{lote.pesoEntrada} kg</TableCell>
                            <TableCell className="font-medium">{lote.pesoAtual} kg</TableCell>
                            <TableCell>{lote.gmdAtual} kg/d</TableCell>
                            <TableCell className="truncate max-w-[120px]">
                              {lote.supplement?.name || '-'}
                            </TableCell>
                            <TableCell>{lote.diasPasto}</TableCell>
                          </>
                        )}
                        {id === 'engorda' && (
                          <>
                            <TableCell>{lote.pesoEntrada} kg</TableCell>
                            <TableCell className="font-medium text-emerald-600">
                              {lote.pesoAtual} kg
                            </TableCell>
                            <TableCell>{lote.gmdPrevisto} kg/d</TableCell>
                            <TableCell>{lote.dieta}</TableCell>
                          </>
                        )}

                        <TableCell>{lote.pasto}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              lote.status === 'Saudável'
                                ? 'default'
                                : lote.status === 'Pronto p/ Abate'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {lote.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          >
                            <LineChart className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pastures" className="mt-4">
          <SectorPastureTab sectorId={id || ''} />
        </TabsContent>

        {id === 'cria' && (
          <TabsContent value="reproduction" className="mt-4">
            <IatfTab />
          </TabsContent>
        )}

        <TabsContent value="calendar" className="mt-4">
          <SectorCalendarTab sectorId={id || ''} />
        </TabsContent>
      </Tabs>

      <LotPerformanceDrawer
        loteId={selectedLote}
        open={!!selectedLote}
        onOpenChange={(open) => !open && setSelectedLote(null)}
      />
    </div>
  )
}
