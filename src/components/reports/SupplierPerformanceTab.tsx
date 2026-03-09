import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { supplierPerformanceData } from '@/data/mock'

export function SupplierPerformanceTab() {
  const [selectedType, setSelectedType] = useState('Todos')

  const filteredData =
    selectedType === 'Todos'
      ? supplierPerformanceData
      : supplierPerformanceData.filter((d) => d.type === selectedType)

  const chartConfig = {
    gmd: { label: 'GMD Médio (kg/dia)', color: 'hsl(var(--primary))' },
  }

  return (
    <Card className="border shadow-sm animate-fade-in">
      <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b bg-muted/5">
        <div>
          <CardTitle>Performance Analítica de Fornecedores / Marcas</CardTitle>
          <CardDescription className="mt-1">
            Correlação direta entre a marca do insumo nutricional fornecido e o Ganho Médio Diário
            (GMD) resultante dos animais em lote.
          </CardDescription>
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Tipo de Insumo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os Tipos</SelectItem>
            <SelectItem value="Ração Confinamento">Ração Confinamento</SelectItem>
            <SelectItem value="Suplemento Mineral">Suplemento Mineral</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[400px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart
              data={filteredData.sort((a, b) => b.gmd - a.gmd)}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val.toFixed(2)}
                domain={[0, 'dataMax + 0.2']}
                className="text-muted-foreground text-xs"
              />
              <YAxis
                dataKey="brand"
                type="category"
                tickLine={false}
                axisLine={false}
                width={150}
                className="font-medium text-sm"
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                content={
                  <ChartTooltipContent formatter={(val) => `${Number(val).toFixed(2)} kg/dia`} />
                }
              />
              <Bar dataKey="gmd" radius={[0, 4, 4, 0]} barSize={36} animationDuration={1000}>
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(var(--primary) / ${0.6 + (index % 3) * 0.2})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
