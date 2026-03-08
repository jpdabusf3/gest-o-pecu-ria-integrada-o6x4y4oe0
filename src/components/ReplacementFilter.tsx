import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMarket } from '@/contexts/MarketContext'
import { TrendingDown, TrendingUp, Minus, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReplacementFilter() {
  const { replacementData } = useMarket()
  const [selected, setSelected] = useState(replacementData[0]?.id || '')

  const activeData = replacementData.find((r) => r.id === selected) || replacementData[0]

  if (!activeData) return null

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <ArrowRightLeft className="h-4 w-4" />
          Reposição (Datagro)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {replacementData.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="p-4 rounded-lg border bg-primary/5 border-primary/20 flex flex-col items-center justify-center transition-all">
          <div className="text-sm text-muted-foreground mb-1 font-medium">
            Preço Médio por Cabeça
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              R$ {activeData.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div
            className={cn(
              'mt-2 text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-full bg-background border transition-colors',
              activeData.trend === 'up'
                ? 'text-emerald-500 border-emerald-500/20'
                : activeData.trend === 'down'
                  ? 'text-destructive border-destructive/20'
                  : 'text-muted-foreground border-border',
            )}
          >
            {activeData.trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {activeData.trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {activeData.trend === 'stable' && <Minus className="h-3 w-3" />}
            {activeData.change} na semana
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
