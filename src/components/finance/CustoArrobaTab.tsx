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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Trophy, TrendingDown, DollarSign } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'

export function CustoArrobaTab() {
  const detailedLotCosts = [
    {
      id: 'LEN-01',
      protocol: 'Confinamento Alto Grão',
      nutrition: 850,
      sanity: 45,
      management: 120,
      totalCost: 1015,
      arrobasProduced: 5.5,
      costPerArroba: 184.54,
      roi: 18.5,
    },
    {
      id: 'LEN-02',
      protocol: 'Confinamento Tradicional',
      nutrition: 700,
      sanity: 40,
      management: 100,
      totalCost: 840,
      arrobasProduced: 4.2,
      costPerArroba: 200.0,
      roi: 12.0,
    },
    {
      id: 'LRE-01',
      protocol: 'Pasto + Proteinado 0.1%',
      nutrition: 350,
      sanity: 30,
      management: 150,
      totalCost: 530,
      arrobasProduced: 3.5,
      costPerArroba: 151.42,
      roi: 25.4,
    },
    {
      id: 'LCR-04',
      protocol: 'Creep Feeding',
      nutrition: 420,
      sanity: 55,
      management: 130,
      totalCost: 605,
      arrobasProduced: 3.8,
      costPerArroba: 159.21,
      roi: 22.1,
    },
  ]

  const sorted = [...detailedLotCosts].sort((a, b) => b.roi - a.roi)
  const bestLotId = sorted[0].id

  const chartConfig = {
    costPerArroba: { label: 'Custo por @ (R$)', color: 'hsl(var(--destructive))' },
    roi: { label: 'ROI Projetado (%)', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6 mt-0 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Melhor Estratégia (ROI)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary flex items-center gap-2">
              <Trophy className="h-5 w-5" /> {sorted[0].protocol}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lote: {sorted[0].id} - {sorted[0].roi}% ROI
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menor Custo por @
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-emerald-500" />{' '}
              {formatCurrency(Math.min(...detailedLotCosts.map((l) => l.costPerArroba)))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média Custo Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />{' '}
              {formatCurrency(
                detailedLotCosts.reduce((a, b) => a + b.costPerArroba, 0) / detailedLotCosts.length,
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Custo vs ROI por Protocolo</CardTitle>
            <CardDescription>
              Comparativo de eficiência das estratégias aplicadas nos lotes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart
                data={detailedLotCosts}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="id" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip
                  cursor={{ fill: 'var(--color-muted)' }}
                  content={<ChartTooltipContent />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="costPerArroba"
                  fill="var(--color-costPerArroba)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  yAxisId="right"
                  dataKey="roi"
                  fill="var(--color-roi)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Composição de Custo por @ Produzida</CardTitle>
            <CardDescription>
              Detalhamento zootécnico e financeiro dos principais lotes ativos.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Protocolo Aplicado</TableHead>
                  <TableHead className="text-right">Nutrição</TableHead>
                  <TableHead className="text-right">Sanidade</TableHead>
                  <TableHead className="text-right">Custo / @</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedLotCosts.map((lot) => (
                  <TableRow key={lot.id} className={lot.id === bestLotId ? 'bg-primary/5' : ''}>
                    <TableCell className="font-bold">{lot.id}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {lot.protocol}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(lot.nutrition)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(lot.sanity)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-destructive whitespace-nowrap">
                      {formatCurrency(lot.costPerArroba)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary whitespace-nowrap">
                      {formatNumber(lot.roi, 1)}%
                    </TableCell>
                    <TableCell className="text-center w-10">
                      {lot.id === bestLotId && (
                        <span title="Mais Eficiente">
                          <Trophy className="h-4 w-4 text-primary" />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
