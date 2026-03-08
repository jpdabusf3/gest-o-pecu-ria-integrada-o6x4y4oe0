import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { useFarm } from '@/contexts/FarmContext'

const chartConfig = {
  actual: { label: 'Ganho Real (kg)', color: 'hsl(var(--primary))' },
  expected: { label: 'Projetado IA (kg)', color: 'hsl(var(--muted-foreground))' },
} satisfies ChartConfig

export function WeightGainChart({ loteId }: { loteId: string }) {
  const { getPredictedGrowthCurve } = useFarm()
  const data = getPredictedGrowthCurve(loteId)

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        Sem dados suficientes.
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ChartContainer config={chartConfig}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="fillExpected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-expected)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-expected)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            domain={['dataMin - 10', 'dataMax + 10']}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="expected"
            stroke="var(--color-expected)"
            fill="url(#fillExpected)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--color-actual)"
            fill="url(#fillActual)"
            strokeWidth={2}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
