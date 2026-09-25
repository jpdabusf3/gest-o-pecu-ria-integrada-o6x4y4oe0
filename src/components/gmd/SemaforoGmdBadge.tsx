import { Badge } from '@/components/ui/badge'
import { StatusSemaforo } from '@/services/gmdAlertas'
import { CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SemaforoGmdBadgeProps {
  status: StatusSemaforo
  desvioPct?: number | null
  diasSemPesagem?: number | null
  showLabel?: boolean
  className?: string
}

export function SemaforoGmdBadge({
  status,
  desvioPct,
  diasSemPesagem,
  showLabel = true,
  className,
}: SemaforoGmdBadgeProps) {
  if (status === 'cinza') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'bg-muted/80 text-muted-foreground border-muted-foreground/30 font-medium gap-1 text-xs whitespace-nowrap',
          className,
        )}
        title={
          diasSemPesagem !== null && diasSemPesagem > 60
            ? `Sem pesagem há ${diasSemPesagem} dias (> 60 dias)`
            : 'Sem dados suficientes'
        }
      >
        <Clock className="h-3 w-3 shrink-0" />
        {showLabel && (
          <span>
            {diasSemPesagem && diasSemPesagem > 60
              ? `Sem dados recentes (${diasSemPesagem}d)`
              : 'Sem dados recentes'}
          </span>
        )}
      </Badge>
    )
  }

  if (status === 'verde') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium gap-1 text-xs whitespace-nowrap',
          className,
        )}
      >
        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
        {showLabel && (
          <span>
            No Alvo{' '}
            {desvioPct !== undefined && desvioPct !== null
              ? `(${desvioPct > 0 ? '+' : ''}${desvioPct.toFixed(1)}%)`
              : ''}
          </span>
        )}
      </Badge>
    )
  }

  if (status === 'amarelo') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium gap-1 text-xs whitespace-nowrap',
          className,
        )}
      >
        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
        {showLabel && (
          <span>
            Atenção{' '}
            {desvioPct !== undefined && desvioPct !== null
              ? `(${desvioPct.toFixed(1)}%)`
              : '10-20%'}
          </span>
        )}
      </Badge>
    )
  }

  // Vermelho
  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-destructive/15 text-destructive border-destructive/40 font-semibold gap-1 text-xs whitespace-nowrap animate-pulse',
        className,
      )}
    >
      <AlertCircle className="h-3 w-3 shrink-0 text-destructive" />
      {showLabel && (
        <span>
          Crítico{' '}
          {desvioPct !== undefined && desvioPct !== null ? `(${desvioPct.toFixed(1)}%)` : '> 20%'}
        </span>
      )}
    </Badge>
  )
}
