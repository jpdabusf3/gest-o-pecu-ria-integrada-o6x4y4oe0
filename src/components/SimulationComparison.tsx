import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SimulationResult } from '@/stores/useSimulationStore'
import { GitCompare, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  simA: SimulationResult
  simB: SimulationResult
}

export function SimulationComparison({ simA, simB }: Props) {
  const diffProfit = simB.profit - simA.profit
  const diffMargin = simB.margin - simA.margin

  return (
    <Card className="border-primary/20 shadow-md bg-primary/5 animate-fade-in-up">
      <CardHeader className="pb-3 border-b border-primary/10">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <GitCompare className="h-5 w-5" />
          Análise Comparativa de Cenários
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4 p-4 rounded-lg bg-background border shadow-sm">
            <h4 className="font-semibold text-center border-b pb-2 text-muted-foreground flex justify-between items-center">
              <span>Cenário A</span>
              <span className="text-xs font-normal opacity-70">
                {new Date(simA.date).toLocaleDateString('pt-BR')}
              </span>
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoria:</span>{' '}
                <span className="font-medium">{simA.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso (kg):</span>{' '}
                <span>{simA.weight}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço/Arroba:</span>{' '}
                <span>R$ {simA.salesPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Prod:</span>{' '}
                <span>R$ {simA.productionCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span className="text-muted-foreground">Lucro L.:</span>{' '}
                <span className={simA.profit >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                  R$ {simA.profit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Margem:</span>{' '}
                <span>{simA.margin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 rounded-lg bg-background border shadow-sm">
            <h4 className="font-semibold text-center border-b pb-2 text-muted-foreground flex justify-between items-center">
              <span>Cenário B</span>
              <span className="text-xs font-normal opacity-70">
                {new Date(simB.date).toLocaleDateString('pt-BR')}
              </span>
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoria:</span>{' '}
                <span className="font-medium">{simB.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso (kg):</span>{' '}
                <span>{simB.weight}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço/Arroba:</span>{' '}
                <span>R$ {simB.salesPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Prod:</span>{' '}
                <span>R$ {simB.productionCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span className="text-muted-foreground">Lucro L.:</span>{' '}
                <span className={simB.profit >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                  R$ {simB.profit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Margem:</span>{' '}
                <span>{simB.margin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center space-y-4 p-4 rounded-lg bg-primary/10 border border-primary/20 shadow-sm">
            <h4 className="font-bold text-center text-primary uppercase tracking-wider text-sm w-full border-b border-primary/10 pb-2">
              Impacto (B vs A)
            </h4>

            <div className="text-center w-full">
              <div className="text-xs text-muted-foreground mb-1 font-medium">
                Variação de Lucro
              </div>
              <div
                className={cn(
                  'text-2xl font-bold flex items-center justify-center gap-2',
                  diffProfit >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive',
                )}
              >
                {diffProfit > 0 ? '+' : ''}R$ {diffProfit.toFixed(2)}
                {diffProfit > 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : diffProfit < 0 ? (
                  <TrendingDown className="h-5 w-5" />
                ) : null}
              </div>
            </div>

            <div className="text-center w-full pt-4 border-t border-primary/10">
              <div className="text-xs text-muted-foreground mb-1 font-medium">
                Variação de Margem
              </div>
              <div
                className={cn(
                  'text-xl font-bold flex items-center justify-center gap-2',
                  diffMargin >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive',
                )}
              >
                {diffMargin > 0 ? '+' : ''}
                {diffMargin.toFixed(1)}%
                {diffMargin > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : diffMargin < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
