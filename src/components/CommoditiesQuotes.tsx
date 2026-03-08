import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMarket } from '@/contexts/MarketContext'
import { TrendingDown, TrendingUp, Minus, Wheat } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CommoditiesQuotes() {
  const { commodityData } = useMarket()

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Wheat className="h-4 w-4" />
          Grãos & Insumos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2.5">
          {commodityData.map((ind) => (
            <div
              key={ind.id}
              className="flex items-center justify-between p-2.5 rounded-md border bg-muted/30 transition-all duration-300"
            >
              <div>
                <div className="font-semibold text-sm leading-none">{ind.label}</div>
                <div className="text-[10px] text-muted-foreground uppercase mt-1 tracking-wider font-medium">
                  {ind.source}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm">R$ {ind.price.toFixed(2)}</div>
                <div
                  className={cn(
                    'text-xs font-medium flex items-center justify-end gap-0.5 mt-0.5 transition-colors',
                    ind.trend === 'up'
                      ? 'text-emerald-500'
                      : ind.trend === 'down'
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                  )}
                >
                  {ind.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                  {ind.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                  {ind.trend === 'stable' && <Minus className="h-3 w-3" />}
                  {ind.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
