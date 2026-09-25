import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { performanceByCategory } from '@/data/mock'
import { LineChart as LineChartIcon, Activity } from 'lucide-react'
import { SupplierPerformanceTab } from '@/components/reports/SupplierPerformanceTab'
import { BenchmarkingTab } from '@/components/reports/BenchmarkingTab'
import { RelatorioMensalGMD } from '@/components/gmd/RelatorioMensalGMD'

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
            Acompanhe o Ganho Médio Diário, comparativos de lotes e eficiência nutricional.
          </p>
        </div>
      </div>

      <Tabs defaultValue="categoria" className="space-y-6">
        <TabsList className="grid w-full sm:flex sm:w-auto grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="mensal_gmd" className="py-2 font-semibold">
            Fechamento GMD
          </TabsTrigger>
          <TabsTrigger value="categoria" className="py-2">
            Evolução por Categoria
          </TabsTrigger>
          <TabsTrigger value="benchmarking" className="py-2">
            Benchmarking Interno
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className="py-2">
            Performance de Fornecedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mensal_gmd" className="mt-0">
          <RelatorioMensalGMD />
        </TabsContent>

        <TabsContent value="categoria" className="mt-0">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b bg-muted/5">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Activity className="h-5 w-5 text-primary" />
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help">
                        Desempenho por Categoria Animal
                      </TooltipTrigger>
                      <TooltipContent>
                        Visualiza o Ganho Médio Diário (GMD) por categoria ao longo dos meses.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription className="mt-1">
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
        </TabsContent>

        <TabsContent value="benchmarking" className="mt-0">
          <BenchmarkingTab />
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-0">
          <SupplierPerformanceTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
