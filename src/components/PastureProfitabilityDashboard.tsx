import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ExportMenu } from '@/components/ExportMenu'
import { downloadCSV, downloadExcel } from '@/lib/exportUtils'
import { cn, formatCurrency, formatWeight, formatNumber } from '@/lib/utils'
import { TrendingUp, Map as MapIcon, DollarSign, Sprout } from 'lucide-react'
import usePastoStore from '@/stores/usePastoStore'
import useAnimalStore from '@/stores/useAnimalStore'

interface Props {
  currentArrobaPrice: number
}

export function PastureProfitabilityDashboard({ currentArrobaPrice }: Props) {
  const [period, setPeriod] = useState('30')
  const { pastos } = usePastoStore()
  const { animais } = useAnimalStore()

  const pricePerKgLive = currentArrobaPrice / 30

  const stats = useMemo(() => {
    const days = parseInt(period, 10)
    return pastos
      .map((pasto) => {
        const pastoAnimais = animais.filter((a) => a.pastoId === pasto.id.toString())
        const headCount = pastoAnimais.reduce((sum, a) => sum + a.quantidade, 0)

        const dailyGain = 0.4 + pasto.score * 0.1
        const totalWeightGain = headCount * dailyGain * days
        const revenue = totalWeightGain * pricePerKgLive

        const dailyCostPerHa = 1.5 + (5 - pasto.score) * 0.5
        const maintenanceCost = pasto.area * dailyCostPerHa * days

        const netProfit = revenue - maintenanceCost
        const roi = maintenanceCost > 0 ? (netProfit / maintenanceCost) * 100 : 0

        return {
          id: pasto.id,
          name: pasto.nome,
          area: pasto.area,
          headCount,
          totalWeightGain: Math.round(totalWeightGain),
          maintenanceCost,
          revenue,
          netProfit,
          roi,
        }
      })
      .sort((a, b) => b.netProfit - a.netProfit)
  }, [period, pricePerKgLive, pastos, animais])

  const chartData = useMemo(
    () =>
      stats.map((s) => ({
        name: s.name.split(' - ')[0],
        lucro: s.netProfit,
        custo: s.maintenanceCost,
      })),
    [stats],
  )

  const chartConfig = {
    lucro: { label: 'Lucro Líquido (R$)', color: 'hsl(var(--chart-1))' },
    custo: { label: 'Custo Manutenção (R$)', color: 'hsl(var(--chart-5))' },
  }

  const doExport = (type: 'csv' | 'excel') => {
    const data = stats.map((s) => ({
      Pasto: s.name,
      'Área (ha)': s.area,
      'Cabeças Estimadas': s.headCount,
      'Ganho de Peso Total (kg)': s.totalWeightGain,
      'Custo de Manutenção (R$)': s.maintenanceCost.toFixed(2),
      'Receita de GMD (R$)': s.revenue.toFixed(2),
      'Lucro Líquido (R$)': s.netProfit.toFixed(2),
      'ROI (%)': s.roi.toFixed(1),
    }))

    if (type === 'csv') {
      downloadCSV(data, `rentabilidade_pastos_${period}d`)
    } else {
      downloadExcel(data, `rentabilidade_pastos_${period}d`)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sprout className="h-6 w-6 text-emerald-500" /> Rentabilidade por Pasto
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Correlação inteligente entre ganho de peso acumulado (GMD) e custos de manutenção de
            cada piquete.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <ExportMenu onExportCSV={() => doExport('csv')} onExportExcel={() => doExport('excel')} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Comparativo de Desempenho e ROI</CardTitle>
            <CardDescription>
              Visualização de Lucro Líquido vs Custo de Manutenção por Piquete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="lucro" fill="var(--color-lucro)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custo" fill="var(--color-custo)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Consolidado</CardTitle>
            <CardDescription>Resultados do período filtrado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-sm text-muted-foreground flex items-center justify-between">
                <span>Custo de Manutenção Total</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats.reduce((a, c) => a + c.maintenanceCost, 0))}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground flex items-center justify-between">
                <span>Receita Agregada (Ganho de Peso)</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                {formatCurrency(stats.reduce((a, c) => a + c.revenue, 0))}
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="text-sm font-semibold mb-1">Lucro Líquido Global</div>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(stats.reduce((a, c) => a + c.netProfit, 0))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Financeiro dos Pastos</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Pasto / Piquete</TableHead>
                <TableHead className="text-right">Gado</TableHead>
                <TableHead className="text-right">Ganho Peso Total</TableHead>
                <TableHead className="text-right">Custo Manutenção</TableHead>
                <TableHead className="text-right text-primary">Lucro Líquido</TableHead>
                <TableHead className="text-right pr-6">
                  <TooltipProvider delayDuration={300}>
                    <UITooltip>
                      <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help">
                        ROI
                      </TooltipTrigger>
                      <TooltipContent>
                        Retorno Sobre Investimento (Lucro / Custo Manutenção).
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-6 font-medium">
                    <div className="flex items-center gap-2 text-primary">
                      <MapIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="whitespace-nowrap">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {s.headCount} <span className="text-[10px]">cab.</span>
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                    +{formatWeight(s.totalWeightGain, 'kg')}
                  </TableCell>
                  <TableCell className="text-right text-destructive whitespace-nowrap">
                    {formatCurrency(s.maintenanceCost)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary whitespace-nowrap">
                    {formatCurrency(s.netProfit)}
                  </TableCell>
                  <TableCell className="text-right pr-6 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                        s.roi >= 100
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : s.roi >= 0
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {formatNumber(s.roi, 1)}%
                    </span>
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
