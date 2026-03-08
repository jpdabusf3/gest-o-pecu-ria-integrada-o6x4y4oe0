import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import { dashboardData } from '@/data/mock'

export function DistributionChart() {
  // Generate the chart config dynamically to map names to labels and colors
  const chartConfig = {
    value: { label: 'Cabeças' },
    ...dashboardData.chartDistribution.reduce(
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
        <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" hideLabel />} />
        <ChartLegend
          content={<ChartLegendContent nameKey="name" className="flex-wrap gap-x-4 gap-y-2 mt-4" />}
        />
      </PieChart>
    </ChartContainer>
  )
}
