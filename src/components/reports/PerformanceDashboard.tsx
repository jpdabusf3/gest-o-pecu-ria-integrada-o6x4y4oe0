import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { performanceCorrelationData } from '@/data/mock'

interface PerformanceDashboardProps {
  selectedLot: string
}

export function PerformanceDashboard({ selectedLot }: PerformanceDashboardProps) {
  const chartConfig = {
    custoIntervencao: {
      label: 'Custo Intervenção (R$)',
      color: 'hsl(var(--chart-1))',
    },
    ganhoPeso: {
      label: 'Ganho Médio (kg/dia)',
      color: 'hsl(var(--chart-2))',
    },
  }

  const filteredData =
    selectedLot === 'todos'
      ? performanceCorrelationData
      : performanceCorrelationData.filter((d: any) => (d.lote || d.loteId) === selectedLot)

  return (
    <Card className="mt-8 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Dashboard de Desempenho (ROI)
        </CardTitle>
        <CardDescription>
          Correlação entre o custo das intervenções e o ganho de peso médio dos lotes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filteredData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ComposedChart
              data={filteredData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis
                dataKey="loteId"
                tickLine={false}
                axisLine={false}
                className="text-xs text-muted-foreground"
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickLine={false}
                axisLine={false}
                className="text-xs text-muted-foreground"
                tickFormatter={(v) => `R$ ${v}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                className="text-xs text-muted-foreground"
                tickFormatter={(v) => `${v}kg`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="left"
                dataKey="custoIntervencao"
                name="Custo Intervenção"
                fill="var(--color-custoIntervencao)"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ganhoPeso"
                name="GMD"
                stroke="var(--color-ganhoPeso)"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-md border border-dashed">
            Sem dados de performance para o lote selecionado.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
