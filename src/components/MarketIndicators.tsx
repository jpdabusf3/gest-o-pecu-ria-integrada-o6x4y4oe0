import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Clock, Database } from 'lucide-react'
import { marketIndicators, marketLastUpdate } from '@/data/market'
import { cn } from '@/lib/utils'

interface MarketIndicatorsProps {
  selectedId: string | null
  onSelect: (id: string, price: number, label: string) => void
}

export function MarketIndicators({ selectedId, onSelect }: MarketIndicatorsProps) {
  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Database className="h-4 w-4" />
          Cotações de Mercado (Gado Gordo / Datagro)
        </h3>
        <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
          <Clock className="h-3 w-3" /> Atualizado: {marketLastUpdate}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {marketIndicators.map((ind) => (
          <Card
            key={ind.id}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:border-primary/50 group',
              selectedId === ind.id
                ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary'
                : '',
            )}
            onClick={() => onSelect(ind.id, ind.price, ind.label)}
          >
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground font-medium mb-2 flex justify-between items-center">
                <span
                  className={cn(
                    'bg-muted px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider',
                    ind.source === 'B3'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-amber-600 dark:text-amber-400',
                  )}
                >
                  {ind.source}
                </span>
                {ind.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                {ind.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                {ind.trend === 'stable' && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <div className="font-semibold text-sm mt-1 leading-tight h-8 group-hover:text-primary transition-colors">
                {ind.label}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">R$ {ind.price.toFixed(2)}</span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    ind.trend === 'up'
                      ? 'text-emerald-500'
                      : ind.trend === 'down'
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                  )}
                >
                  {ind.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
