import { useMemo, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { getHedgeOperations, type HedgeOperation } from '@/services/hedge'
import { getMarketPrices, type MarketPrice } from '@/services/market'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, Printer, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { triggerPDFPrint } from '@/lib/exportUtils'
import { Badge } from '@/components/ui/badge'
import { PrintReportHeader } from '@/components/PrintReportHeader'
import { BasisMonitoringChart } from '@/components/BasisMonitoringChart'

export function HedgeEfficiencyDashboard({ onRegister }: { onRegister: () => void }) {
  const [operations, setOperations] = useState<HedgeOperation[]>([])
  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    Promise.all([getHedgeOperations(), getMarketPrices()])
      .then(([ops, pts]) => {
        setOperations(ops.filter((o) => o.status === 'closed'))
        setPrices(pts)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredOps = useMemo(() => {
    return operations.filter((o) => filterType === 'all' || o.type === filterType)
  }, [operations, filterType])

  const { metrics, chartData, strategyData, marketTrendData } = useMemo(() => {
    let totalRevHedge = 0
    let totalRevNoHedge = 0
    let netResult = 0
    let totalPremium = 0
    let totalArrobas = 0

    const sData: Record<string, number> = {}
    const cData: any[] = []

    filteredOps.forEach((op) => {
      const q = op?.quantity_arrobas || 0
      const closeP = op?.closing_price || 0
      const strike = op?.strike_price || 0
      const prem = (op?.premium_paid || 0) - (op?.premium_received || 0)

      let effPrice = closeP
      if (op?.type === 'put') {
        effPrice = closeP + Math.max(0, strike - closeP) - prem
      } else if (op?.type === 'future') {
        effPrice = closeP + (strike - closeP) - prem
      } else if (op?.type === 'collar') {
        effPrice = closeP + Math.max(0, strike - closeP) - prem
      }

      const revHedge = effPrice * q
      const revNoHedge = closeP * q
      const result = revHedge - revNoHedge

      totalRevHedge += revHedge
      totalRevNoHedge += revNoHedge
      netResult += result
      totalPremium += prem > 0 ? prem * q : 0
      totalArrobas += q

      sData[op.type] = (sData[op.type] || 0) + result

      cData.push({
        name: op?.contract_code || 'OP',
        withHedge: revHedge,
        withoutHedge: revNoHedge,
      })
    })

    const roi = totalPremium > 0 ? (netResult / totalPremium) * 100 : 0

    const mTrendData = prices
      .slice(0, 15)
      .reverse()
      .map((p) => ({
        date: new Date(p?.reference_date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        price: p?.price,
        simulatedFuture: (p?.price || 0) + 5, // Simulating a general historical basis
      }))

    return {
      metrics: {
        lossesAvoided: Math.max(0, netResult),
        netResult,
        avgEffPrice: totalArrobas > 0 ? totalRevHedge / totalArrobas : 0,
        roi,
        totalPremium,
        totalRevHedge,
        totalRevNoHedge,
      },
      chartData: cData,
      strategyData: Object.entries(sData).map(([name, value]) => ({ name, value })),
      marketTrendData: mTrendData,
    }
  }, [filteredOps, prices])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (operations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-muted/20">
        <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold mb-2">Nenhuma Operação Encerrada</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          O dashboard de eficiência requer operações fechadas para comparar o resultado real com a
          simulação sem hedge.
        </p>
        <Button onClick={onRegister} className="min-h-[44px]">
          Registrar ou Simular Operação
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up bg-background p-1 print:p-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Análise de Performance
          </h3>
          <p className="text-sm text-muted-foreground">
            Resultados financeiros comparativos de operações finalizadas.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48 min-h-[44px]">
              <SelectValue placeholder="Estratégia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="min-h-[44px]">
                Todas
              </SelectItem>
              <SelectItem value="put" className="min-h-[44px]">
                Put
              </SelectItem>
              <SelectItem value="call" className="min-h-[44px]">
                Call
              </SelectItem>
              <SelectItem value="collar" className="min-h-[44px]">
                Collar
              </SelectItem>
              <SelectItem value="future" className="min-h-[44px]">
                Futuro
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={triggerPDFPrint} className="min-h-[44px] px-3">
            <Printer className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <PrintReportHeader
        title="Relatório de Eficiência de Hedge"
        subtitle="Período de Análise: Histórico Completo"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print-break-inside-avoid">
        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
              Ganho / Perda Evitada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(metrics.lossesAvoided)}
            </div>
            <p className="text-xs text-emerald-600/80 mt-1">Proteção contra desvalorização.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo do Hedge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics.totalPremium)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total de prêmios pagos.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Benefício Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${metrics.netResult >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
            >
              {metrics.netResult >= 0 ? '+' : ''}
              {formatCurrency(metrics.netResult)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receita Real vs Simulada.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Real (c/ Hedge)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(metrics.totalRevHedge)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Simulada s/ Hedge: {formatCurrency(metrics.totalRevNoHedge)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2 print-break-inside-avoid">
          <CardHeader>
            <CardTitle>Receita com Hedge vs Sem Hedge</CardTitle>
            <CardDescription>
              Impacto direto de cada operação na receita final do lote protegido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                withHedge: { label: 'Com Hedge', color: 'hsl(var(--primary))' },
                withoutHedge: { label: 'Sem Hedge', color: 'hsl(var(--muted-foreground))' },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickFormatter={(v) => `R$${v / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="withHedge" fill="var(--color-withHedge)" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="withoutHedge"
                    fill="var(--color-withoutHedge)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="print-break-inside-avoid print:hidden">
          <CardHeader>
            <CardTitle>Resultado por Estratégia</CardTitle>
            <CardDescription>
              Distribuição de ganhos e perdas por tipo de derivativo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Resultado (R$)', color: 'hsl(var(--chart-2))' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={strategyData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `R$${v / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    className="capitalize"
                    width={50}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="print-break-inside-avoid print:hidden">
          <CardHeader>
            <CardTitle>Análise de Sensibilidade (Base)</CardTitle>
            <CardDescription>
              Comportamento recente do mercado físico vs tendência futura simulada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                price: { label: 'Físico (R$)', color: 'hsl(var(--primary))' },
                simulatedFuture: { label: 'Futuro Sim. (R$)', color: 'hsl(var(--destructive))' },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={marketTrendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} domain={['auto', 'auto']} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="var(--color-price)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="simulatedFuture"
                    stroke="var(--color-simulatedFuture)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <BasisMonitoringChart />

      <Card className="print-break-inside-avoid">
        <CardHeader>
          <CardTitle>Histórico Comparativo de Operações</CardTitle>
          <CardDescription>
            Detalhamento analítico do impacto de cada operação (Receita Real vs Mercado).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden flex flex-col gap-4 p-4">
            {filteredOps.map((op) => {
              const prem = (op?.premium_paid || 0) - (op?.premium_received || 0)
              let effPrice = op?.closing_price || 0
              if (op?.type === 'put' || op?.type === 'collar') {
                effPrice += Math.max(0, (op?.strike_price || 0) - (op?.closing_price || 0)) - prem
              } else if (op?.type === 'future') {
                effPrice += (op?.strike_price || 0) - (op?.closing_price || 0) - prem
              }
              const qty = op?.quantity_arrobas || 0
              const realRev = effPrice * qty
              const marketRev = (op?.closing_price || 0) * qty
              const res = realRev - marketRev

              return (
                <div key={op?.id} className="border rounded-lg p-4 space-y-3 bg-card shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">{op?.contract_code}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {op?.type}
                        </Badge>
                        {op?.expand?.lot_id?.name && <span>{op.expand.lot_id.name}</span>}
                      </div>
                    </div>
                    <Badge variant={res >= 0 ? 'default' : 'destructive'}>
                      {res >= 0 ? '+' : ''}
                      {formatCurrency(res)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                    <div>
                      <span className="text-muted-foreground block text-xs">Volume</span>
                      {formatNumber(qty, 0)} @
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Custo (Prêmio)</span>
                      {formatCurrency(prem)}
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Receita Real (c/ Hedge)
                      </span>
                      <span className="font-medium text-primary">{formatCurrency(realRev)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Receita Mercado (s/ Hedge)
                      </span>
                      <span className="font-medium">{formatCurrency(marketRev)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Tipo / Lote</TableHead>
                  <TableHead className="text-right">Volume (@)</TableHead>
                  <TableHead className="text-right">Strike / Fechamento</TableHead>
                  <TableHead className="text-right">Custo (Prêmio)</TableHead>
                  <TableHead className="text-right">Receita Mercado (s/ Hedge)</TableHead>
                  <TableHead className="text-right text-primary">Receita Real (c/ Hedge)</TableHead>
                  <TableHead className="text-right font-bold">Benefício Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOps.map((op) => {
                  const prem = (op?.premium_paid || 0) - (op?.premium_received || 0)
                  let effPrice = op?.closing_price || 0
                  if (op?.type === 'put' || op?.type === 'collar') {
                    effPrice +=
                      Math.max(0, (op?.strike_price || 0) - (op?.closing_price || 0)) - prem
                  } else if (op?.type === 'future') {
                    effPrice += (op?.strike_price || 0) - (op?.closing_price || 0) - prem
                  }

                  const qty = op?.quantity_arrobas || 0
                  const realRev = effPrice * qty
                  const marketRev = (op?.closing_price || 0) * qty
                  const res = realRev - marketRev

                  return (
                    <TableRow key={op?.id}>
                      <TableCell className="font-bold whitespace-nowrap">
                        {op?.contract_code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {op?.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {op?.expand?.lot_id?.name || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatNumber(qty, 0)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-sm">
                        <div className="text-muted-foreground">
                          S: {formatCurrency(op?.strike_price || 0)}
                        </div>
                        <div>F: {formatCurrency(op?.closing_price || 0)}</div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(prem)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                        {formatCurrency(marketRev)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-primary font-medium">
                        {formatCurrency(realRev)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold whitespace-nowrap ${res >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
                      >
                        {res >= 0 ? '+' : ''}
                        {formatCurrency(res)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
