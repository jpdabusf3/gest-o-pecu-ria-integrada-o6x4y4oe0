import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useFeedMillStore from '@/stores/useFeedMillStore'
import { useFarm } from '@/contexts/FarmContext'
import { ManageFormulaModal } from '@/components/forms/ManageFormulaModal'
import { RegisterProductionModal } from '@/components/forms/RegisterProductionModal'
import { IntegrationTab } from './IntegrationTab'
import { FormulaPerformanceChart } from './FormulaPerformanceChart'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { Factory } from 'lucide-react'

export function FeedMillTab() {
  const { formulas, history, productions } = useFeedMillStore()
  const { inventory } = useFarm()

  return (
    <div className="space-y-6 mt-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" /> Fábrica de Ração e Misturas
          </CardTitle>
          <CardDescription>
            Gerencie fórmulas, automatize a produção via API e monitore a performance nutricional
            (ROI).
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <ManageFormulaModal />
          <RegisterProductionModal />
        </div>
      </div>

      <Tabs defaultValue="formulas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 max-w-3xl h-auto py-1 mb-4">
          <TabsTrigger value="formulas" className="py-1.5">
            Ativas
          </TabsTrigger>
          <TabsTrigger value="producoes" className="py-1.5">
            Produções
          </TabsTrigger>
          <TabsTrigger value="historico" className="py-1.5">
            Histórico
          </TabsTrigger>
          <TabsTrigger value="integracao" className="py-1.5">
            API / Bot
          </TabsTrigger>
          <TabsTrigger value="desempenho" className="py-1.5">
            Desempenho
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formulas" className="pt-2">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fórmula (Receita)</TableHead>
                      <TableHead>Destino (Produto Final)</TableHead>
                      <TableHead>Composição (%)</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formulas.map((f) => {
                      const outItem = inventory.find((i) => i.id === f.outputInventoryId)
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-semibold whitespace-nowrap">
                            {f.name}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline">{outItem?.item || f.outputInventoryId}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 min-w-[200px]">
                              {f.ingredients.map((ing, idx) => {
                                const invItem = inventory.find((i) => i.id === ing.inventoryId)
                                return (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-[10px] font-normal whitespace-nowrap"
                                  >
                                    {invItem?.item}: {ing.percentage}%
                                  </Badge>
                                )
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            v{f.version}
                          </TableCell>
                          <TableCell className="text-right">
                            <ManageFormulaModal formula={f} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {formulas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          Nenhuma fórmula cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="producoes" className="pt-2">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Fórmula</TableHead>
                      <TableHead className="text-right">Qtd Produzida</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                      <TableHead className="text-right">Custo / Ton</TableHead>
                      <TableHead>Destino</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productions.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(p.date).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {p.formulaName}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold whitespace-nowrap">
                          {formatWeight(p.amountProducedKg, 'kg')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive whitespace-nowrap">
                          {formatCurrency(p.totalCost)}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatCurrency(p.costPerKg * 1000)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={p.destination === 'Estoque' ? 'outline' : 'default'}>
                            {p.destination}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {productions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          Nenhuma produção registrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="pt-2">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fórmula</TableHead>
                      <TableHead>Versão Antiga</TableHead>
                      <TableHead>Composição Anterior (%)</TableHead>
                      <TableHead className="text-right">Custo/Kg (Histórico)</TableHead>
                      <TableHead>Substituída Em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => {
                      const oldCostPerKg = h.ingredients.reduce((acc, ing) => {
                        const item = inventory.find((i) => i.id === ing.inventoryId)
                        return acc + (ing.percentage / 100) * (item?.custoUnitario || 0)
                      }, 0)

                      return (
                        <TableRow key={h.historyId} className="opacity-80">
                          <TableCell className="font-medium whitespace-nowrap">{h.name}</TableCell>
                          <TableCell className="whitespace-nowrap">v{h.version}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 min-w-[200px]">
                              {h.ingredients.map((ing, idx) => {
                                const invItem = inventory.find((i) => i.id === ing.inventoryId)
                                return (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-[10px] font-normal whitespace-nowrap"
                                  >
                                    {invItem?.item || ing.inventoryId}: {ing.percentage}%
                                  </Badge>
                                )
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono whitespace-nowrap">
                            {formatCurrency(oldCostPerKg)}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {new Date(h.updatedAt).toLocaleString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {history.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          Nenhum histórico de alterações. Fórmulas antigas aparecerão aqui.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracao" className="pt-2">
          <IntegrationTab />
        </TabsContent>

        <TabsContent value="desempenho" className="pt-2">
          <FormulaPerformanceChart />
        </TabsContent>
      </Tabs>
    </div>
  )
}
