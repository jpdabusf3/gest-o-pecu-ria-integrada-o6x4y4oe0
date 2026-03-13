import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
import { SimulationPrintReport } from './SimulationPrintReport'
import { ExportMenu } from '@/components/ExportMenu'
import { downloadCSV } from '@/lib/exportUtils'
import { formatCurrency, formatWeight, formatNumber } from '@/lib/utils'

export function SimulationHistory() {
  const { simulations, deleteSimulation } = useSimulationStore()
  const [selected, setSelected] = useState<string[]>([])
  const [isPrinting, setIsPrinting] = useState(false)

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      return [...prev, id]
    })
  }

  const selectedSims = useMemo(
    () => selected.map((id) => simulations.find((s) => s.id === id)).filter(Boolean) as any[],
    [selected, simulations],
  )

  const handleExportCSV = () => {
    const dataToExport = selectedSims.length > 0 ? selectedSims : simulations
    const csvData = dataToExport.map((sim) => ({
      Data: new Date(sim.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      Categoria: sim.category,
      'Qtd (cab.)': sim.quantity || 1,
      'Peso Inicial (kg)': sim.initialWeight || '-',
      'Rend. Entrada (%)': sim.entryYield || '-',
      'Custo Compra (R$/cab)': sim.purchaseCostPerHead?.toFixed(2) || '-',
      'Outros Custos (R$/cab)': sim.otherCostsPerHead?.toFixed(2) || '-',
      'Custo Fazenda (R$/cab)': (sim.farmCost || 0).toFixed(2),
      'Custo Total (R$/cab)': (sim.productionCost + (sim.farmCost || 0)).toFixed(2),
      'Peso Final (kg)': sim.finalWeight || sim.weight,
      'Rend. Saída (%)': sim.saleYield || '-',
      'Preço Venda (R$/@)': sim.salesPrice.toFixed(2),
      'Arrobas/Cab': sim.arrobas.toFixed(2),
      'Lucro L. / Cab (R$)': sim.profit.toFixed(2),
      'Lucro L. Total (R$)':
        sim.totalProfit?.toFixed(2) || (sim.profit * (sim.quantity || 1)).toFixed(2),
      'Margem (%)': sim.margin.toFixed(1),
      'ROI (%)': sim.roi?.toFixed(1) || '-',
    }))
    downloadCSV(csvData, 'historico_simulacoes')
  }

  const handleExportPDF = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 150)
  }

  if (simulations.length === 0) return null

  const dataToPrint = selectedSims.length > 0 ? selectedSims : simulations

  return (
    <div className="space-y-6 mt-6 print:hidden animate-fade-in-up">
      {isPrinting && (
        <style>
          {`
            @media print {
              #root { display: none !important; }
              .print-report-container { display: block !important; position: static; width: 100%; }
              @page { margin: 10mm; }
              body { background: white; }
            }
          `}
        </style>
      )}

      {isPrinting &&
        createPortal(<SimulationPrintReport simulations={dataToPrint} />, document.body)}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Histórico de Simulações
            </CardTitle>
            <CardDescription>
              Selecione simulações para comparar cenários ou exportar agrupado por Fazenda.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <ExportMenu
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              label={selected.length > 0 ? `Exportar (${selected.length})` : 'Exportar Tudo'}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[40px] text-center"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria / Lote</TableHead>
                  <TableHead className="text-right">Peso Saída</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Custo Cab.</TableHead>
                  <TableHead className="text-right">Lucro Cab.</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulations.map((sim) => {
                  const totalCost = sim.productionCost + (sim.farmCost || 0)
                  return (
                    <TableRow
                      key={sim.id}
                      className={selected.includes(sim.id) ? 'bg-primary/5' : ''}
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selected.includes(sim.id)}
                          onCheckedChange={() => toggleSelect(sim.id)}
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
                      <TableCell className="font-medium text-xs">
                        {sim.category}
                        <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                          {sim.quantity ? `${sim.quantity} cab.` : '1 cab.'}
                          {sim.farmIds &&
                            sim.farmIds.length > 0 &&
                            ` • Vinc: ${sim.farmIds.length} Faz`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">
                        {formatWeight(sim.finalWeight || sim.weight, 'kg')}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">
                        {formatCurrency(sim.salesPrice)}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">
                        {formatCurrency(totalCost)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold text-xs whitespace-nowrap ${sim.profit >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'}`}
                      >
                        {formatCurrency(sim.profit)}
                        {sim.totalProfit && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            Total: {formatCurrency(sim.totalProfit)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium text-xs whitespace-nowrap ${sim.margin >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'}`}
                      >
                        {formatNumber(sim.margin, 1)}%
                        {sim.roi !== undefined && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            ROI: {formatNumber(sim.roi, 1)}%
                          </div>
                        )}
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
                  )
                })}
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
