import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { dailyWeightData } from '@/data/mock'

const chartConfig = {
  actual: {
    label: 'Real Diário (kg)',
    color: 'hsl(var(--primary))',
  },
  expected: {
    label: 'Projeção (kg)',
    color: 'hsl(var(--muted-foreground))',
  },
} satisfies ChartConfig

export function DailyWeightChart({ loteId }: { loteId: string }) {
  const data = dailyWeightData[loteId] || dailyWeightData['default']

  return (
    <div className="h-[300px] w-full">
      <ChartContainer config={chartConfig}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fillActualDaily" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="fillExpectedDaily" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-expected)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-expected)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            minTickGap={30}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            domain={['dataMin - 5', 'dataMax + 5']}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="expected"
            stroke="var(--color-expected)"
            fill="url(#fillExpectedDaily)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--color-actual)"
            fill="url(#fillActualDaily)"
            strokeWidth={2}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
