import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { dashboardData } from '@/data/mock'

export function CashflowChart() {
  const chartConfig = {
    receitas: { label: 'Receitas', color: 'hsl(var(--primary))' },
    despesas: { label: 'Despesas', color: 'hsl(var(--destructive))' },
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[300px]">
      <LineChart
        data={dashboardData.chartCashflow}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(val) => `R$${val}k`}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="receitas"
          stroke="var(--color-receitas)"
          strokeWidth={3}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="despesas"
          stroke="var(--color-despesas)"
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
