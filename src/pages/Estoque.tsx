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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TriangleAlert, TrendingDown, CalendarClock, Trash2 } from 'lucide-react'
import { useFarm } from '@/contexts/FarmContext'
import useFazendaStore from '@/stores/useFazendaStore'
import { RegisterPurchaseModal } from '@/components/forms/RegisterPurchaseModal'
import { RegisterConsumptionModal } from '@/components/forms/RegisterConsumptionModal'
import { ManageInventoryItemModal } from '@/components/forms/ManageInventoryItemModal'

export default function Estoque() {
  const { inventory, removeInventoryItem } = useFarm()
  const { fazendas, updateFazenda } = useFazendaStore()

  const criticalItems = inventory.filter((i) => i.qtd <= i.minQtd)

  const nutricaoItems = inventory.filter(
    (i) => ['Suplemento', 'Concentrado'].includes(i.tipo) || i.id.startsWith('N'),
  )
  const farmaciaItems = inventory.filter(
    (i) => ['Biológico', 'Antiparasitário'].includes(i.tipo) || i.id.startsWith('F'),
  )
  const almoxarifadoItems = inventory.filter(
    (i) => i.tipo === 'Material Cerca' || i.id.startsWith('A'),
  )

  const forecastedItems = useMemo(() => {
    return inventory
      .map((item) => {
        const dailyRate = item.consumoDiario || (item.qtd > 0 ? item.qtd * 0.02 : 5)
        const daysRemaining = dailyRate > 0 ? Math.floor(item.qtd / dailyRate) : 999

        const depletionDate = new Date()
        depletionDate.setDate(depletionDate.getDate() + daysRemaining)

        const needsRestock = daysRemaining <= 30

        return {
          ...item,
          dailyRate: Number(dailyRate.toFixed(1)),
          daysRemaining,
          depletionDate,
          needsRestock,
        }
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
  }, [inventory])

  const renderGenericTable = (items: any[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Qtd Atual</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Status / Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={item.qtd < item.minQtd ? 'bg-destructive/5' : ''}>
              <TableCell className="font-medium">{item.item}</TableCell>
              <TableCell>{item.tipo}</TableCell>
              <TableCell
                className={`text-right font-mono ${item.qtd < item.minQtd ? 'text-destructive font-bold' : ''}`}
              >
                {item.qtd}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {item.minQtd}
              </TableCell>
              <TableCell>{item.unidade}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={item.qtd < item.minQtd ? 'destructive' : 'secondary'}>
                    {item.qtd < item.minQtd ? 'Crítico' : 'Normal'}
                  </Badge>
                  <ManageInventoryItemModal item={item} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => removeInventoryItem(item.id)}
                    title="Remover Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estoque & Insumos</h2>
          <p className="text-muted-foreground mt-1">
            Gestão de almoxarifado, controle automatizado de nutrição animal e custos por fazenda.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <RegisterConsumptionModal />
          <RegisterPurchaseModal />
          <ManageInventoryItemModal />
        </div>
      </div>

      {criticalItems.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <TriangleAlert className="h-5 w-5" />
          <AlertTitle className="text-base font-bold">Alerta de Compras Necessárias</AlertTitle>
          <AlertDescription className="mt-2 text-destructive-foreground/90">
            Atenção: {criticalItems.length} itens operando abaixo do nível de segurança. Reabasteça
            para evitar falta de manejo.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="nutricao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 max-w-3xl mb-6 h-auto md:h-10">
          <TabsTrigger value="nutricao" className="py-2 md:py-1.5">
            Nutrição
          </TabsTrigger>
          <TabsTrigger value="farmacia" className="py-2 md:py-1.5">
            Farmácia
          </TabsTrigger>
          <TabsTrigger value="almoxarifado" className="py-2 md:py-1.5">
            Almoxarifado
          </TabsTrigger>
          <TabsTrigger value="previsao" className="py-2 md:py-1.5 gap-2">
            <TrendingDown className="h-3 w-3" /> Previsão
          </TabsTrigger>
          <TabsTrigger
            value="custos"
            className="py-2 md:py-1.5 whitespace-normal sm:whitespace-nowrap"
          >
            Custos por Fazenda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nutricao">
          <Card>
            <CardHeader>
              <CardTitle>Suplementação e Rações</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Estoque Atual</TableHead>
                      <TableHead className="text-right">Gatilho (Mínimo)</TableHead>
                      <TableHead>Status / Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nutricaoItems.map((item) => {
                      const isCritical = item.qtd <= item.minQtd
                      const isWarning = !isCritical && item.qtd <= item.minQtd * 1.5
                      return (
                        <TableRow key={item.id} className={isCritical ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {item.qtd} {item.unidade}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {item.minQtd} {item.unidade}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  isCritical ? 'destructive' : isWarning ? 'secondary' : 'default'
                                }
                              >
                                {isCritical
                                  ? 'Estoque Crítico'
                                  : isWarning
                                    ? 'Alerta Baixo'
                                    : 'Confortável'}
                              </Badge>
                              <ManageInventoryItemModal item={item} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => removeInventoryItem(item.id)}
                                title="Remover Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="farmacia">
          <Card>
            <CardContent className="pt-6">{renderGenericTable(farmaciaItems)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="almoxarifado">
          <Card>
            <CardContent className="pt-6">{renderGenericTable(almoxarifadoItems)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="previsao">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" /> Módulo de Previsão de Demanda
              </CardTitle>
              <CardDescription>
                Análise preditiva baseada no histórico de consumo médio dos últimos 6 meses.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Consumo Médio Diário</TableHead>
                      <TableHead className="text-center">Duração Estimada</TableHead>
                      <TableHead>Data de Reposição Sugerida</TableHead>
                      <TableHead>Alerta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecastedItems.map((item) => (
                      <TableRow
                        key={`forecast-${item.id}`}
                        className={item.needsRestock ? 'bg-orange-500/5' : ''}
                      >
                        <TableCell className="font-medium">{item.item}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.qtd} {item.unidade}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {item.dailyRate} {item.unidade}/dia
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.daysRemaining > 365 ? '+1 ano' : `${item.daysRemaining} dias`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarClock className="h-4 w-4 text-muted-foreground" />
                            {item.depletionDate.toLocaleDateString('pt-BR')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.needsRestock ? (
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-600 bg-orange-50"
                            >
                              Alerta de Reposição
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                            >
                              Estoque Seguro
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custos">
          <Card>
            <CardHeader>
              <CardTitle>Custos Operacionais (Nutrição & Manejo)</CardTitle>
              <CardDescription>
                Registre os custos de insumos alocados por unidade. Eles serão deduzidos no cálculo
                de lucro nas Simulações.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fazenda</TableHead>
                    <TableHead>Custo Nutrição (R$)</TableHead>
                    <TableHead>Custo Manejo/Sanidade (R$)</TableHead>
                    <TableHead className="text-right">Custo Total / Cab</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fazendas.map((f) => {
                    const total = (f.custoNutricao || 0) + (f.custoManejo || 0)
                    const porCab = f.rebanho > 0 ? total / f.rebanho : 0
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome}</TableCell>
                        <TableCell>
                          <div className="relative max-w-[150px]">
                            <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-medium">
                              R$
                            </span>
                            <Input
                              type="number"
                              className="pl-8 h-8 text-sm"
                              value={f.custoNutricao || ''}
                              onChange={(e) =>
                                updateFazenda(f.id, { custoNutricao: Number(e.target.value) })
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative max-w-[150px]">
                            <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-medium">
                              R$
                            </span>
                            <Input
                              type="number"
                              className="pl-8 h-8 text-sm"
                              value={f.custoManejo || ''}
                              onChange={(e) =>
                                updateFazenda(f.id, { custoManejo: Number(e.target.value) })
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground whitespace-nowrap">
                          R${' '}
                          {porCab.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          / cab
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
