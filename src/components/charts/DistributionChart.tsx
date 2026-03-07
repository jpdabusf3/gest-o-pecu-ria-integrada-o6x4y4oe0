import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import { dashboardData } from '@/data/mock'

export function DistributionChart() {
  const chartConfig = {
    value: { label: 'Cabeças' },
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[300px]">
      <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <Pie
          data={dashboardData.chartDistribution}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {dashboardData.chartDistribution.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend content={<ChartLegendContent />} className="-translate-y-4 flex-wrap" />
      </PieChart>
    </ChartContainer>
  )
}
