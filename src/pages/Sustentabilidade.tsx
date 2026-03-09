import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Leaf, Trees, Wind, Sprout, Filter } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

// Mock Data
const historicalEmissions = [
  { month: 'Out/25', emissions: 14200, benchmark: 15000 },
  { month: 'Nov/25', emissions: 13800, benchmark: 15000 },
  { month: 'Dez/25', emissions: 14500, benchmark: 15000 },
  { month: 'Jan/26', emissions: 13200, benchmark: 14800 },
  { month: 'Fev/26', emissions: 12900, benchmark: 14800 },
  { month: 'Mar/26', emissions: 12500, benchmark: 14800 },
]

const lotEmissionsData = [
  { id: 'LCR-01', pasto: 'Pasto 01', cultivar: 'Brachiaria', dias: 45, fator: 1.2, animais: 120 },
  { id: 'LCR-02', pasto: 'Pasto 03', cultivar: 'Brachiaria', dias: 60, fator: 1.2, animais: 85 },
  { id: 'LRE-01', pasto: 'Pasto 05', cultivar: 'Andropogon', dias: 30, fator: 1.5, animais: 220 },
  { id: 'LEN-02', pasto: 'Confinamento', cultivar: 'N/A', dias: 90, fator: 2.1, animais: 200 },
]

const chartConfig = {
  emissions: {
    label: 'Emissões Calculadas',
    color: 'hsl(var(--chart-2))',
  },
  benchmark: {
    label: 'Limite Benchmark',
    color: 'hsl(var(--chart-5))',
  },
}

export default function Sustentabilidade() {
  const [filterArea, setFilterArea] = useState('todos')

  const processedData = lotEmissionsData
    .map((lote) => ({
      ...lote,
      totalEmissions: Math.round(lote.dias * lote.fator * lote.animais),
    }))
    .filter((l) => filterArea === 'todos' || l.pasto.includes(filterArea))

  const totalCurrentEmissions = processedData.reduce((acc, curr) => acc + curr.totalEmissions, 0)
  const totalAnimals = processedData.reduce((acc, curr) => acc + curr.animais, 0)
  const avgPerAnimal = totalAnimals > 0 ? (totalCurrentEmissions / totalAnimals).toFixed(1) : 0

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Leaf className="h-8 w-8 text-emerald-500" />
          Relatório de Sustentabilidade
        </h2>
        <p className="text-muted-foreground mt-1">
          Monitoramento de pegada de carbono, emissões de GEE e adequação a certificações
          ambientais.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-500/20 bg-emerald-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emissões Totais (Período)</CardTitle>
            <Wind className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCurrentEmissions.toLocaleString('pt-BR')} kg CO₂e
            </div>
            <p className="text-xs text-muted-foreground mt-1">Baseado nos lotes selecionados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Animal</CardTitle>
            <Sprout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerAnimal} kg CO₂e/cab</div>
            <p className="text-xs text-muted-foreground mt-1">
              -5% em relação ao semestre anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status de Certificação</CardTitle>
            <Trees className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">Adequado</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dentro dos limites Carne Carbono Neutro
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Emissões vs Benchmark</CardTitle>
            <CardDescription>
              Comparativo mensal de emissões da fazenda em relação aos limites de certificação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart
                accessibilityLayer
                data={historicalEmissions}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => `${value / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar
                  dataKey="emissions"
                  fill="var(--color-emissions)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                <Bar
                  dataKey="benchmark"
                  fill="var(--color-benchmark)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                  opacity={0.5}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Cálculo de Pegada por Lote / Pasto</CardTitle>
              <CardDescription>
                Fórmula: (Dias de Pastoreio) × (Fator de Emissão do Cultivar) × (Nº Cabeças)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Áreas</SelectItem>
                  <SelectItem value="Pasto">Pastagens Abertas</SelectItem>
                  <SelectItem value="Confinamento">Confinamentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Área / Cultivar</TableHead>
                    <TableHead className="text-right">Dias de Ocupação</TableHead>
                    <TableHead className="text-right">Fator de Emissão</TableHead>
                    <TableHead className="text-right">Qtd Animais</TableHead>
                    <TableHead className="text-right font-bold text-primary">
                      Total Estimado (kg CO₂e)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.id}</TableCell>
                      <TableCell>
                        {row.pasto}{' '}
                        <span className="text-muted-foreground block text-xs">{row.cultivar}</span>
                      </TableCell>
                      <TableCell className="text-right">{row.dias}</TableCell>
                      <TableCell className="text-right">{row.fator}</TableCell>
                      <TableCell className="text-right">{row.animais}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {row.totalEmissions.toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {processedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        Nenhum registro para o filtro selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
