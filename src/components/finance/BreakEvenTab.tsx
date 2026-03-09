import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { confinementData, sectorData } from '@/data/mock'
import { Target, TrendingUp } from 'lucide-react'

export function BreakEvenTab() {
  const allLots = useMemo(
    () => [
      ...confinementData.lotes.map((l) => ({ ...l, origin: 'Confinamento', custoDiario: 12.5 })),
      ...sectorData.engorda.lotes.map((l) => ({
        ...l,
        gmd: l.id === 'LEN-02' ? 1.4 : 1.1,
        pesoMedio: l.id === 'LEN-02' ? 490 : 380,
        origin: 'Engorda',
        custoDiario: 5.5,
      })),
      ...sectorData.recria.lotes.map((l) => ({
        ...l,
        gmd: 0.6,
        pesoMedio: 250,
        origin: 'Recria',
        custoDiario: 2.8,
      })),
    ],
    [],
  )

  const [selectedLotId, setSelectedLotId] = useState<string>(allLots[0].id)
  const arrobaPrice = 265.5

  const lotDetails = useMemo(() => {
    return allLots.map((lot) => {
      let currentWeight = lot.pesoMedio
      let currentCost = 0
      let maxProfit = -999999
      let optimalDay = 0
      const chartData = []

      for (let day = 0; day <= 120; day += 5) {
        const gmdDecay = Math.max(0.3, 1 - day / 150)
        const gmd = lot.gmd * gmdDecay
        const weightGain = day === 0 ? 0 : gmd * 5

        currentWeight += weightGain
        currentCost += day === 0 ? 0 : lot.custoDiario * 5

        const grossValue = (currentWeight / 30) * arrobaPrice
        const profit = grossValue - currentCost

        if (profit > maxProfit) {
          maxProfit = profit
          optimalDay = day
        }

        chartData.push({
          day,
          market: Number(grossValue.toFixed(2)),
          cost: Number(currentCost.toFixed(2)),
          profit: Number(profit.toFixed(2)),
        })
      }
      return { ...lot, maxProfit, optimalDay, chartData, currentCost: chartData[0].cost }
    })
  }, [allLots])

  const selectedLotData = lotDetails.find((l) => l.id === selectedLotId) || lotDetails[0]

  const chartConfig = {
    market: { label: 'Valor Mercado (R$)', color: 'hsl(var(--primary))' },
    cost: { label: 'Custo Acumulado (R$)', color: 'hsl(var(--destructive))' },
    profit: { label: 'Lucro Projetado (R$)', color: 'hsl(var(--chart-2))' },
  }

  return (
    <div className="space-y-6 mt-0 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Curva de Ponto de Equilíbrio
              </CardTitle>
              <CardDescription>
                Cruzamento de histórico de ganho de peso vs acúmulo de custos diários.
              </CardDescription>
            </div>
            <Select value={selectedLotId} onValueChange={setSelectedLotId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Selecione o Lote" />
              </SelectTrigger>
              <SelectContent>
                {allLots.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.id} ({l.origin})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart
                  data={selectedLotData.chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(val) => `Dia ${val}`}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `R$${val}`}
                    width={60}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="market"
                    stroke="var(--color-market)"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="var(--color-cost)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="var(--color-profit)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ReferenceLine
                    x={selectedLotData.optimalDay}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="3 3"
                    label={{
                      position: 'top',
                      value: 'Venda Ideal',
                      fill: 'hsl(var(--primary))',
                      fontSize: 12,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métricas do Lote: {selectedLotData.id}</CardTitle>
            <CardDescription>Base de cálculo (por cabeça)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Categoria</span>
              <span className="font-medium">{selectedLotData.categoria}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Peso Inicial</span>
              <span className="font-medium">{selectedLotData.pesoMedio} kg</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">GMD Base</span>
              <span className="font-medium text-emerald-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {selectedLotData.gmd} kg/dia
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Custo Diário</span>
              <span className="font-medium text-destructive">
                R$ {selectedLotData.custoDiario.toFixed(2)}
              </span>
            </div>
            <div className="bg-primary/5 p-4 rounded-lg mt-4 border border-primary/20">
              <span className="text-sm font-medium text-primary block mb-1">
                Venda Ideal (Break-even)
              </span>
              <div className="text-2xl font-bold">Daqui a {selectedLotData.optimalDay} dias</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lucro Max: R$ {selectedLotData.maxProfit.toFixed(2)} / cab
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Painel Sintético de Lotes</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead className="text-right">Peso Médio</TableHead>
                <TableHead className="text-right">Lucro Máx (Proj.)</TableHead>
                <TableHead className="text-center">Janela Ideal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotDetails.map((lot) => (
                <TableRow key={lot.id} className={lot.id === selectedLotId ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium">{lot.id}</TableCell>
                  <TableCell>{lot.origin}</TableCell>
                  <TableCell className="text-right">{lot.pesoMedio} kg</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">
                    R$ {lot.maxProfit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        lot.optimalDay <= 15
                          ? 'destructive'
                          : lot.optimalDay <= 45
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {lot.optimalDay === 0 ? 'Imediato' : `Em ${lot.optimalDay} dias`}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
