import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartContainer, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { benchmarkingData } from '@/data/mock'
import { Scale } from 'lucide-react'

export function BenchmarkingTab() {
  const [lote, setLote] = useState('LRE-01')
  const data = benchmarkingData[lote as keyof typeof benchmarkingData] || []

  const chartConfig = {
    gmd: { label: 'GMD (kg/dia)', color: 'hsl(var(--primary))' },
    ganhoTotal: { label: 'Ganho Total Período (kg)', color: 'hsl(var(--chart-2))' },
  }

  return (
    <Card className="border shadow-sm animate-fade-in">
      <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b bg-muted/5">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Scale className="h-5 w-5 text-primary" />
            Comparativo Histórico do Lote
          </CardTitle>
          <CardDescription className="mt-1">
            Avalie o desempenho de um mesmo lote em diferentes períodos. Identifique visualmente
            qual dieta/suplemento trouxe o melhor resultado.
          </CardDescription>
        </div>
        <div className="w-full sm:w-auto mt-2 sm:mt-0">
          <Select value={lote} onValueChange={setLote}>
            <SelectTrigger className="w-full sm:w-[240px] bg-background">
              <SelectValue placeholder="Selecione o Lote" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(benchmarkingData).map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis
              dataKey="periodo"
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
              tickFormatter={(v) => `${v}kg`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
              tickFormatter={(v) => v.toFixed(2)}
            />

            <Tooltip
              cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const dt = payload[0].payload
                  return (
                    <div className="bg-background border border-border/50 rounded-lg p-3 shadow-xl text-sm min-w-[200px]">
                      <p className="font-semibold mb-1 border-b pb-1">{label}</p>
                      <p className="text-muted-foreground mb-3 text-xs uppercase tracking-wider">
                        Dieta Fornecida:{' '}
                        <span className="font-bold text-foreground block mt-0.5">{dt.dieta}</span>
                      </p>
                      <div className="space-y-1">
                        {payload.map((p: any) => (
                          <div key={p.dataKey} className="flex justify-between items-center gap-4">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <div
                                className="w-2 h-2 rounded-sm"
                                style={{ backgroundColor: p.color }}
                              />
                              {p.name}
                            </span>
                            <span className="font-mono font-medium">
                              {p.value} {p.dataKey === 'gmd' ? 'kg/d' : 'kg'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />

            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              yAxisId="left"
              dataKey="ganhoTotal"
              fill="var(--color-ganhoTotal)"
              radius={[4, 4, 0, 0]}
              barSize={50}
              name="Ganho Total Período (kg)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="gmd"
              stroke="var(--color-gmd)"
              strokeWidth={3}
              name="GMD (kg/dia)"
              dot={{
                r: 5,
                strokeWidth: 2,
                fill: 'var(--color-gmd)',
                stroke: 'hsl(var(--background))',
              }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
