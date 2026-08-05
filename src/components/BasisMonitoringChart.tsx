import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { getMarketPrices, type MarketPrice } from '@/services/market'
import { useRealtime } from '@/hooks/use-realtime'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart as LineChartIcon } from 'lucide-react'

export function BasisMonitoringChart() {
  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('6m')

  useEffect(() => {
    getMarketPrices()
      .then(setPrices)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useRealtime('market_prices', () => {
    getMarketPrices().then(setPrices).catch(console.error)
  })

  const chartData = useMemo(() => {
    const cutoff = new Date()
    switch (period) {
      case '30d':
        cutoff.setDate(cutoff.getDate() - 30)
        break
      case '6m':
        cutoff.setMonth(cutoff.getMonth() - 6)
        break
      case '1y':
        cutoff.setFullYear(cutoff.getFullYear() - 1)
        break
    }

    const filtered = prices.filter((p) => new Date(p.reference_date) >= cutoff)
    const byDate = new Map<string, { date: string; regional?: number; b3?: number }>()

    filtered.forEach((p) => {
      if (p.indicator !== 'Boi Gordo') return
      const dateKey = p.reference_date.split(' ')[0]
      if (!byDate.has(dateKey)) byDate.set(dateKey, { date: dateKey })
      const entry = byDate.get(dateKey)!
      if (p.region === 'MT') entry.regional = p.price
      else if (p.region === 'B3') entry.b3 = p.price
    })

    return Array.from(byDate.values())
      .filter((d) => d.regional != null && d.b3 != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        regional: d.regional!,
        b3: d.b3!,
        basis: Number((d.regional! - d.b3!).toFixed(2)),
      }))
  }, [prices, period])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="h-5 w-5 text-primary" /> Monitor de Basis Regional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="h-5 w-5 text-primary" /> Monitor de Basis Regional
          </CardTitle>
          <CardDescription className="mt-1">
            Preço Físico (MT) vs B3 (Futuro) e Basis calculado
          </CardDescription>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="1y">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            regional: { label: 'Físico MT (R$)', color: 'hsl(var(--primary))' },
            b3: { label: 'B3 Futuro (R$)', color: 'hsl(var(--chart-3))' },
            basis: { label: 'Basis (R$)', color: 'hsl(var(--destructive))' },
          }}
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={55}
                tickFormatter={(v) => `R$${v}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="regional"
                stroke="var(--color-regional)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="b3"
                stroke="var(--color-b3)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="basis"
                stroke="var(--color-basis)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
