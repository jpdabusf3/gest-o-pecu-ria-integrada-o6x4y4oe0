import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, History } from 'lucide-react'
import useSimulationStore from '@/stores/useSimulationStore'
import { SimulationComparison } from './SimulationComparison'

export function SimulationHistory() {
  const { simulations, deleteSimulation } = useSimulationStore()
  const [selected, setSelected] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const selectedSims = useMemo(
    () => selected.map((id) => simulations.find((s) => s.id === id)).filter(Boolean) as any[],
    [selected, simulations],
  )

  if (simulations.length === 0) return null

  return (
    <div className="space-y-6 mt-6 print:hidden animate-fade-in-up">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Histórico de Simulações
            </CardTitle>
            <CardDescription>
              Selecione até 2 simulações para comparar os cenários de margem.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[40px] text-center"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Custo Prod</TableHead>
                  <TableHead className="text-right">Lucro L.</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulations.map((sim) => (
                  <TableRow
                    key={sim.id}
                    className={selected.includes(sim.id) ? 'bg-primary/5' : ''}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selected.includes(sim.id)}
                        onCheckedChange={() => toggleSelect(sim.id)}
                        disabled={!selected.includes(sim.id) && selected.length >= 2}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(sim.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="font-medium text-xs">{sim.category}</TableCell>
                    <TableCell className="text-right text-xs">{sim.weight}</TableCell>
                    <TableCell className="text-right text-xs">
                      R$ {sim.salesPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      R$ {sim.productionCost.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold text-xs ${sim.profit >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'}`}
                    >
                      R$ {sim.profit.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium text-xs ${sim.margin >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'}`}
                    >
                      {sim.margin.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSimulation(sim.id)}
                        className="text-muted-foreground hover:text-destructive h-7 w-7"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedSims.length === 2 && (
        <SimulationComparison simA={selectedSims[0]} simB={selectedSims[1]} />
      )}
    </div>
  )
}
