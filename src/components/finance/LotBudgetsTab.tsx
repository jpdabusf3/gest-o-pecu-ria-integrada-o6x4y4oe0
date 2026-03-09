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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import useFinanceStore from '@/stores/useFinanceStore'
import { confinementData, sectorData } from '@/data/mock'
import { BellRing, Save, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function LotBudgetsTab() {
  const { ledger, lotThresholds, setLotThreshold } = useFinanceStore()
  const { toast } = useToast()

  const allLots = [
    ...confinementData.lotes,
    ...sectorData.engorda.lotes,
    ...sectorData.recria.lotes,
    ...sectorData.cria.lotes,
  ]

  const [localThresholds, setLocalThresholds] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    lotThresholds.forEach((lt) => {
      init[lt.loteId] = String(lt.threshold)
    })
    return init
  })

  const handleSave = (loteId: string) => {
    const val = Number(localThresholds[loteId])
    if (val >= 0) {
      setLotThreshold(loteId, val)
      toast({
        title: 'Orçamento Salvo',
        description: `Limite de R$ ${val.toLocaleString('pt-BR')} definido para o lote ${loteId}.`,
      })
    }
  }

  const budgetData = allLots.map((lot) => {
    const cost = ledger
      .filter((l) => l.loteId === lot.id && l.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0)

    const thresholdObj = lotThresholds.find((lt) => lt.loteId === lot.id)
    const threshold = thresholdObj?.threshold || 0
    const isExceeded = threshold > 0 && cost >= threshold
    const percent = threshold > 0 ? (cost / threshold) * 100 : 0

    return {
      ...lot,
      cost,
      threshold,
      isExceeded,
      percent,
    }
  })

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" /> Alertas de Custo por Lote
        </CardTitle>
        <CardDescription>
          Configure tetos de gastos operacionais para cada grupo animal. O sistema emitirá
          notificações automáticas se o valor acumulado no livro-razão ultrapassar o limite.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Custo Acumulado</TableHead>
              <TableHead className="text-center w-[200px]">Teto de Gastos (R$)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right w-[100px]">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgetData.map((lot) => (
              <TableRow key={lot.id} className={lot.isExceeded ? 'bg-destructive/5' : ''}>
                <TableCell className="font-medium">{lot.id}</TableCell>
                <TableCell>{lot.categoria}</TableCell>
                <TableCell
                  className={`text-right font-mono ${lot.isExceeded ? 'text-destructive font-bold' : ''}`}
                >
                  R$ {lot.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center gap-2 max-w-[150px] mx-auto">
                    <Input
                      type="number"
                      value={localThresholds[lot.id] || ''}
                      onChange={(e) =>
                        setLocalThresholds({ ...localThresholds, [lot.id]: e.target.value })
                      }
                      placeholder="Sem limite"
                      className="h-8 text-right font-mono"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {lot.threshold === 0 ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Não Monitorado
                    </Badge>
                  ) : lot.isExceeded ? (
                    <Badge variant="destructive" className="gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3" /> Excedido
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                      Monitorado ({lot.percent.toFixed(0)}%)
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSave(lot.id)}
                    className="h-8"
                  >
                    <Save className="h-4 w-4 text-primary" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
