import { useMemo } from 'react'
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

export function DistributionChart() {
  const { animais } = useAnimalStore()

  const chartData = useMemo(() => {
    if (!animais || animais.length === 0) {
      return dashboardData.chartDistribution
    }

    const grouped = animais.reduce(
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
  }, [animais])

  // Generate the chart config dynamically to map names to labels and colors
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
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[300px]">
      <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
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
          content={<ChartLegendContent nameKey="name" className="flex-wrap gap-x-4 gap-y-2 mt-4" />}
        />
      </PieChart>
    </ChartContainer>
  )
}
