import { useMemo, useState } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import useAnimalStore from '@/stores/useAnimalStore'
import { dashboardData } from '@/data/mock'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { subDays, isAfter } from 'date-fns'

export function DistributionChart() {
  const { animais } = useAnimalStore()
  const [periodo, setPeriodo] = useState('all')

  const chartData = useMemo(() => {
    let dadosBase = animais

    if (animais && animais.length > 0 && periodo !== 'all') {
      const dias = parseInt(periodo)
      const dataCorte = subDays(new Date(), dias)
      dadosBase = animais.filter((a) => isAfter(new Date(a.dataRegistro), dataCorte))
    }

    if (!dadosBase || dadosBase.length === 0) {
      return dashboardData.chartDistribution
    }

    const grouped = dadosBase.reduce(
      (acc, curr) => {
        acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.quantidade
        return acc
      },
      {} as Record<string, number>,
    )

    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ]

    return Object.entries(grouped).map(([name, value], index) => ({
      name,
      value,
      fill: colors[index % colors.length],
    }))
  }, [animais, periodo])

  const chartConfig = {
    value: { label: 'Cabeças' },
    ...chartData.reduce(
      (acc, curr) => {
        acc[curr.name] = { label: curr.name, color: curr.fill }
        return acc
      },
      {} as Record<string, { label: string; color: string }>,
    ),
  } satisfies ChartConfig

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-end mb-2">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/50 border-transparent hover:bg-muted focus:ring-0">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o Histórico</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 3 meses</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ChartContainer config={chartConfig} className="h-full w-full min-h-[260px] flex-1">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" hideLabel />} />
          <ChartLegend
            content={
              <ChartLegendContent nameKey="name" className="flex-wrap gap-x-4 gap-y-2 mt-4" />
            }
          />
        </PieChart>
      </ChartContainer>
    </div>
  )
}
