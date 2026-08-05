import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExitAlert } from '@/hooks/use-exit-alerts'

interface ExitPointAlertCardProps {
  alerts: ExitAlert[]
}

export function ExitPointAlertCard({ alerts }: ExitPointAlertCardProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2 animate-fade-in-up">
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={cn(
            'border-l-4 overflow-hidden',
            alert.severity === 'critical'
              ? 'border-l-destructive bg-destructive/5'
              : 'border-l-amber-500 bg-amber-500/5',
          )}
        >
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div
              className={cn(
                'p-2 rounded-full shrink-0',
                alert.severity === 'critical' ? 'bg-destructive/10' : 'bg-amber-500/10',
              )}
            >
              <AlertTriangle
                className={cn(
                  'h-5 w-5',
                  alert.severity === 'critical' ? 'text-destructive' : 'text-amber-500',
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {alert.marketPrice.indicator} — {alert.marketPrice.region}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Preço: R$ {alert.marketPrice.price.toFixed(2)} | Strike: R${' '}
                {alert.operation.strike_price?.toFixed(2)}
                <span className="ml-1 inline-flex items-center gap-0.5">
                  {alert.direction === 'above' ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-destructive" />{' '}
                      {alert.diffPercent.toFixed(2)}% acima
                    </>
                  ) : alert.direction === 'below' ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-amber-500" />{' '}
                      {alert.diffPercent.toFixed(2)}% abaixo
                    </>
                  ) : (
                    <> {alert.diffPercent.toFixed(2)}% do strike</>
                  )}
                </span>
              </p>
            </div>
            <Badge
              variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
              className="shrink-0 text-[10px] font-bold uppercase tracking-wider"
            >
              {alert.severity === 'critical' ? 'Crítico' : 'Atenção'}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
