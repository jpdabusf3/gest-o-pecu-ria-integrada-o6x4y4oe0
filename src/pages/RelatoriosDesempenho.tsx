import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { performanceByCategory } from '@/data/mock'
import { LineChart as LineChartIcon, Activity } from 'lucide-react'

export default function RelatoriosDesempenho() {
  const [categoria, setCategoria] = useState('Vacas de corte')

  const chartData = useMemo(
    () => performanceByCategory[categoria] || performanceByCategory['Bois'],
    [categoria],
  )

  const chartConfig = {
    gmd: { label: 'GMD (kg/dia)', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LineChartIcon className="h-8 w-8 text-primary" />
            Relatórios de Desempenho
          </h2>
          <p className="text-muted-foreground mt-1">
            Acompanhe o Ganho Médio Diário (GMD) e a evolução histórica por categoria animal.
          </p>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-2 border-b bg-muted/10">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="h-5 w-5 text-primary" />
              Desempenho por Categoria
            </CardTitle>
            <CardDescription className="mt-1.5">
              Selecione uma categoria para visualizar a tendência de ganho de peso nos últimos
              meses.
            </CardDescription>
          </div>
          <div className="w-full sm:w-auto mt-2 sm:mt-0">
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-full sm:w-[240px] bg-background">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vacas de corte">Vacas de corte</SelectItem>
                <SelectItem value="Novilhas matrizes">Novilhas matrizes</SelectItem>
                <SelectItem value="Bois">Bois</SelectItem>
                <SelectItem value="Garrotes">Garrotes</SelectItem>
                <SelectItem value="Bezerros">Bezerros</SelectItem>
                <SelectItem value="Bezerras">Bezerras</SelectItem>
                <SelectItem value="Novilhas">Novilhas</SelectItem>
                <SelectItem value="Vacas (Matrizes)">Vacas (Matrizes)</SelectItem>
                <SelectItem value="Touros">Touros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                className="text-muted-foreground text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                className="text-muted-foreground text-xs"
                tickFormatter={(value) => `${value.toFixed(2)}`}
              />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 2 }}
                content={<ChartTooltipContent />}
              />
              <Line
                type="monotone"
                dataKey="gmd"
                name="GMD"
                stroke="var(--color-gmd)"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: 'var(--color-gmd)',
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))',
                }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
