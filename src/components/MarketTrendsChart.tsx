import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { historicalMarketData } from '@/data/market'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function MarketTrendsChart() {
  const [period, setPeriod] = useState('12')
  const [visibleSeries, setVisibleSeries] = useState<string[]>(['sp', 'mt', 'b3'])

  const chartData = useMemo(() => {
    const months = parseInt(period)
    return historicalMarketData.slice(-months)
  }, [period])

  const chartConfig = {
    sp: { label: 'SP (Datagro)', color: 'hsl(var(--chart-1))' },
    mt: { label: 'MT (Datagro)', color: 'hsl(var(--chart-2))' },
    b3: { label: 'B3 (Futuro)', color: 'hsl(var(--chart-3))' },
  }

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle>Histórico de Cotações (@)</CardTitle>
          <CardDescription>Evolução de preços Mercado Físico vs Futuro (B3)</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full md:w-auto">
          <ToggleGroup
            type="multiple"
            value={visibleSeries}
            onValueChange={(val) => {
              if (val.length) setVisibleSeries(val)
            }}
            className="justify-start sm:justify-center"
          >
            <ToggleGroupItem value="sp" aria-label="Toggle SP" className="text-xs px-2 sm:px-3">
              SP (Físico)
            </ToggleGroupItem>
            <ToggleGroupItem value="mt" aria-label="Toggle MT" className="text-xs px-2 sm:px-3">
              MT (Físico)
            </ToggleGroupItem>
            <ToggleGroupItem value="b3" aria-label="Toggle B3" className="text-xs px-2 sm:px-3">
              B3 (Futuro)
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últ. 3 meses</SelectItem>
              <SelectItem value="6">Últ. 6 meses</SelectItem>
              <SelectItem value="12">Últ. 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={30}
              />
              <YAxis
                domain={['dataMin - 5', 'dataMax + 5']}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$${val}`}
                width={60}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {visibleSeries.includes('sp') && (
                <Line
                  type="monotone"
                  dataKey="sp"
                  stroke="var(--color-sp)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="sp"
                />
              )}
              {visibleSeries.includes('mt') && (
                <Line
                  type="monotone"
                  dataKey="mt"
                  stroke="var(--color-mt)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="mt"
                />
              )}
              {visibleSeries.includes('b3') && (
                <Line
                  type="monotone"
                  dataKey="b3"
                  stroke="var(--color-b3)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="b3"
                />
              )}
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
