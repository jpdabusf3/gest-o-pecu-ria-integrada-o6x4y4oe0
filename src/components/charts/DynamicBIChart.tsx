import { useMemo } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { biMetricsList } from '@/data/mock'

interface DynamicBIChartProps {
  m1: string
  m2: string
  data: any[]
}

export function DynamicBIChart({ m1, m2, data }: DynamicBIChartProps) {
  const metric1 = biMetricsList.find((m) => m.id === m1)
  const metric2 = biMetricsList.find((m) => m.id === m2)

  const chartConfig = useMemo(() => {
    if (!metric1 || !metric2) return {}
    return {
      [m1]: { label: metric1.name, color: metric1.color },
      [m2]: { label: metric2.name, color: metric2.color },
    }
  }, [m1, m2, metric1, metric2])

  if (!metric1 || !metric2 || !data || data.length === 0) return null

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[400px]">
      <ComposedChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => (metric1.unit === 'R$' ? `R$ ${v}` : `${v} ${metric1.unit}`)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => (metric2.unit === 'R$' ? `R$ ${v}` : `${v} ${metric2.unit}`)}
        />
        <ChartTooltip cursor={{ fill: 'var(--color-muted)' }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} className="-translate-y-4 flex-wrap" />
        <Bar
          yAxisId="left"
          dataKey={m1}
          fill={`var(--color-${m1})`}
          radius={[4, 4, 0, 0]}
          maxBarSize={60}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={m2}
          stroke={`var(--color-${m2})`}
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ChartContainer>
  )
}
