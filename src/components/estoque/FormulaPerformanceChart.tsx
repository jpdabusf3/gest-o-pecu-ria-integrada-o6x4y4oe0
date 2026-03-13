import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useFarm } from '@/contexts/FarmContext'
import useFeedMillStore from '@/stores/useFeedMillStore'
import { TrendingUp } from 'lucide-react'

export function FormulaPerformanceChart() {
  const { formulas } = useFeedMillStore()
  const { inventory } = useFarm()

  const data = useMemo(() => {
    return formulas.map((f) => {
      // Calculate real-time cost based on current ingredient inventory values
      const costPerKg = f.ingredients.reduce((acc, ing) => {
        const item = inventory.find((i) => i.id === ing.inventoryId)
        return acc + (ing.percentage / 100) * (item?.custoUnitario || 0)
      }, 0)

      // Mock GMD for demonstration based on formula nature to keep logic intact
      const isFinishing =
        f.name.toLowerCase().includes('terminação') || f.name.toLowerCase().includes('grão')
      const mockGmd = isFinishing ? 1.55 : 1.15

      return {
        name: f.name,
        cost: Number(costPerKg.toFixed(3)),
        gmd: mockGmd,
      }
    })
  }, [formulas, inventory])

  const chartConfig = {
    gmd: { label: 'GMD Projetado (kg/dia)', color: 'hsl(var(--primary))' },
    cost: { label: 'Custo Atual (R$/kg)', color: 'hsl(var(--destructive))' },
  }

  if (data.length === 0) {
    return null
  }

  return (
    <Card className="animate-in fade-in zoom-in-95 duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Dashboard de Performance (ROI Nutricional)
        </CardTitle>
        <CardDescription>
          Cruzamento analítico entre o Custo de Produção (R$/kg) baseado no estoque atual e o Ganho
          Médio Diário (GMD) esperado das fórmulas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ComposedChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
              tickMargin={10}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickLine={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
              tickFormatter={(v) => `${v} kg`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
              tickFormatter={(v) => `R$ ${v}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              yAxisId="right"
              dataKey="cost"
              fill="var(--color-cost)"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
              animationDuration={1500}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="gmd"
              stroke="var(--color-gmd)"
              strokeWidth={3}
              dot={{
                r: 4,
                strokeWidth: 2,
                fill: 'var(--color-gmd)',
                stroke: 'hsl(var(--background))',
              }}
              animationDuration={1500}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
