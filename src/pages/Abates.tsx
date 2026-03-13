import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import useAbateStore from '@/stores/useAbateStore'
import { formatCurrency, formatNumber, formatWeight } from '@/lib/utils'
import { Factory, TrendingUp, Scale } from 'lucide-react'
import { RegisterSlaughterModal } from '@/components/forms/RegisterSlaughterModal'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

export default function Abates() {
  const { records } = useAbateStore()

  const avgYield = useMemo(() => {
    if (records.length === 0) return 0
    return records.reduce((acc, r) => acc + r.yieldPct, 0) / records.length
  }, [records])

  const totalCarcass = useMemo(() => {
    return records.reduce((acc, r) => acc + r.pesoCarcacaTotal, 0)
  }, [records])

  const chartData = useMemo(() => {
    const grouped = records.reduce(
      (acc, r) => {
        if (!acc[r.frigorificoName])
          acc[r.frigorificoName] = { name: r.frigorificoName, totalYield: 0, count: 0 }
        acc[r.frigorificoName].totalYield += r.yieldPct
        acc[r.frigorificoName].count += 1
        return acc
      },
      {} as Record<string, any>,
    )
    return Object.values(grouped).map((f) => ({
      name: f.name,
      yieldPct: Number((f.totalYield / f.count).toFixed(2)),
    }))
  }, [records])

  const chartConfig = {
    yieldPct: { label: 'Rendimento (%)', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="h-8 w-8 text-primary" />
            Abates & Romaneios
          </h2>
          <p className="text-muted-foreground mt-1">
            Controle de frigoríficos, pesagens e apuração de rendimento de carcaça.
          </p>
        </div>
        <RegisterSlaughterModal />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Rendimento Médio Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatNumber(avgYield, 2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Peso Carcaça vs Peso Vivo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Volume de Carcaça
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <Scale className="h-6 w-6 text-muted-foreground" /> {formatWeight(totalCarcass, 'kg')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Arrobas Produzidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-emerald-500" />{' '}
              {formatNumber(totalCarcass / 15, 0)} @
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Rendimento por Frigorífico</CardTitle>
            <CardDescription>Comparativo de aproveitamento de carcaça</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'var(--color-muted)' }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="yieldPct"
                    fill="var(--color-yieldPct)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded border border-dashed">
                Sem dados de abates
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Romaneios</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Frigorífico</TableHead>
                  <TableHead>Lote (Cab)</TableHead>
                  <TableHead className="text-right">Peso Vivo</TableHead>
                  <TableHead className="text-right">Carcaça</TableHead>
                  <TableHead className="text-right text-primary">Rend. %</TableHead>
                  <TableHead className="text-right">Preço / @</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(r.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-semibold">{r.frigorificoName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.lotId}</Badge>{' '}
                      <span className="text-xs text-muted-foreground ml-1">({r.headcount})</span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatWeight(r.pesoVivoTotal, 'kg')}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatWeight(r.pesoCarcacaTotal, 'kg')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary whitespace-nowrap">
                      {formatNumber(r.yieldPct, 2)}%
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(r.pricePerArroba)}
                    </TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Nenhum romaneio registrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
