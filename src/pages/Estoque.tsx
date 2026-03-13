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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TriangleAlert, TrendingDown, CalendarClock, Trash2, ShieldPlus } from 'lucide-react'
import { useFarm } from '@/contexts/FarmContext'
import useFazendaStore from '@/stores/useFazendaStore'
import { RegisterPurchaseModal } from '@/components/forms/RegisterPurchaseModal'
import { RegisterConsumptionModal } from '@/components/forms/RegisterConsumptionModal'
import { ManageInventoryItemModal } from '@/components/forms/ManageInventoryItemModal'
import { FeedMillTab } from '@/components/estoque/FeedMillTab'
import { formatCurrency, formatNumber, formatWeight } from '@/lib/utils'

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
  const materiaPrimaItems = inventory.filter(
    (i) => i.tipo === 'Materia Prima' || i.id.startsWith('M'),
  )
  const reproducaoItems = inventory.filter(
    (i) => ['Sêmen', 'Hormônio'].includes(i.tipo) || i.id.startsWith('R-'),
  )

  const forecastedItems = useMemo(() => {
    return inventory
      .map((item) => {
        const dailyRate = item.consumoDiario || (item.qtd > 0 ? item.qtd * 0.02 : 5)
        const daysRemaining = dailyRate > 0 ? Math.floor(item.qtd / dailyRate) : 999

        const depletionDate = new Date()
        depletionDate.setDate(depletionDate.getDate() + daysRemaining)

        const needsRestock = daysRemaining <= 30
        const idealPurchase = dailyRate * 30 // Suggest 30 days buffer

        return {
          ...item,
          dailyRate: Number(dailyRate.toFixed(1)),
          daysRemaining,
          depletionDate,
          needsRestock,
          idealPurchase: Number(idealPurchase.toFixed(0)),
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
            <TableHead className="text-right">Mínimo (Alerta)</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Status / Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={item.qtd <= item.minQtd ? 'bg-destructive/5' : ''}>
              <TableCell className="font-medium whitespace-nowrap">{item.item}</TableCell>
              <TableCell className="whitespace-nowrap">{item.tipo}</TableCell>
              <TableCell
                className={`text-right font-mono ${item.qtd <= item.minQtd ? 'text-destructive font-bold' : ''}`}
              >
                {formatNumber(item.qtd, 0)}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {formatNumber(item.minQtd, 0)}
              </TableCell>
              <TableCell>{item.unidade}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={item.qtd <= item.minQtd ? 'destructive' : 'secondary'}
                    className={item.qtd <= item.minQtd ? 'animate-pulse' : ''}
                  >
                    {item.qtd <= item.minQtd ? 'Crítico' : 'Normal'}
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
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                Nenhum item cadastrado nesta categoria.
              </TableCell>
            </TableRow>
          )}
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
            Gestão de almoxarifado, controle automatizado de nutrição animal e previsão de consumo.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <RegisterConsumptionModal />
          <RegisterPurchaseModal />
          <ManageInventoryItemModal />
        </div>
      </div>

      {criticalItems.length > 0 && (
        <Alert
          variant="destructive"
          className="border-destructive/50 bg-destructive/10 border-l-4 shadow-sm animate-in slide-in-from-top-2"
        >
          <TriangleAlert className="h-5 w-5" />
          <AlertTitle className="text-base font-bold tracking-tight">
            Alerta de Estoque Crítico
          </AlertTitle>
          <AlertDescription className="mt-2 text-destructive-foreground/90 font-medium">
            Existem <span className="font-bold">{criticalItems.length} itens</span> abaixo do limite
            mínimo de segurança configurado. Verifique a previsão para o volume ideal de compra.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="nutricao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:flex max-w-full flex-wrap mb-6 h-auto">
          <TabsTrigger value="nutricao" className="py-2">
            Nutrição
          </TabsTrigger>
          <TabsTrigger value="fabrica" className="py-2">
            Fábrica de Ração
          </TabsTrigger>
          <TabsTrigger value="farmacia" className="py-2">
            Farmácia
          </TabsTrigger>
          <TabsTrigger value="reproducao" className="py-2">
            Reprodução
          </TabsTrigger>
          <TabsTrigger value="almoxarifado" className="py-2">
            Almoxarifado
          </TabsTrigger>
          <TabsTrigger value="previsao" className="py-2 gap-2 text-primary">
            <TrendingDown className="h-4 w-4" /> Previsão
          </TabsTrigger>
          <TabsTrigger value="custos" className="py-2">
            Custos por Fazenda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nutricao" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Suplementação e Rações Produzidas</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">{renderGenericTable(nutricaoItems)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matérias-Primas</CardTitle>
              <CardDescription>
                Ingredientes utilizados na formulação e mistura de rações. Alertas automáticos
                baseados nos níveis mínimos.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {renderGenericTable(materiaPrimaItems)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fabrica" className="mt-0">
          <FeedMillTab />
        </TabsContent>

        <TabsContent value="farmacia">
          <Card>
            <CardHeader>
              <CardTitle>Farmácia & Saúde Animal</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">{renderGenericTable(farmaciaItems)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reproducao">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldPlus className="h-5 w-5 text-primary" /> Estoque Reprodutivo
              </CardTitle>
              <CardDescription>
                Controle de Doses de Sêmen, Fármacos e Hormônios para Protocolos IATF.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">{renderGenericTable(reproducaoItems)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="almoxarifado">
          <Card>
            <CardHeader>
              <CardTitle>Almoxarifado Geral</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">{renderGenericTable(almoxarifadoItems)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="previsao">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" /> Módulo de Previsão de Demanda &
                Compras
              </CardTitle>
              <CardDescription>
                Análise preditiva baseada no histórico de consumo. O sistema projeta a data de falta
                de estoque e sugere o volume de compra para 30 dias.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">CMD (Consumo/dia)</TableHead>
                      <TableHead className="text-center">Dias p/ Zerar</TableHead>
                      <TableHead>Data de Reposição</TableHead>
                      <TableHead className="text-right font-bold text-primary">
                        Vol. Ideal Compra
                      </TableHead>
                      <TableHead>Alerta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecastedItems.map((item) => (
                      <TableRow
                        key={`forecast-${item.id}`}
                        className={item.needsRestock ? 'bg-orange-500/5' : ''}
                      >
                        <TableCell className="font-medium whitespace-nowrap">{item.item}</TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatNumber(item.qtd, 0)} {item.unidade}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatNumber(item.dailyRate, 1)} {item.unidade}/dia
                        </TableCell>
                        <TableCell className="text-center font-medium whitespace-nowrap">
                          {item.daysRemaining > 365 ? '+1 ano' : `${item.daysRemaining} dias`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarClock className="h-4 w-4 text-muted-foreground" />
                            {item.depletionDate.toLocaleDateString('pt-BR')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary whitespace-nowrap">
                          {item.idealPurchase > 0
                            ? `${formatNumber(item.idealPurchase, 0)} ${item.unidade}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {item.needsRestock ? (
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-600 bg-orange-50 whitespace-nowrap"
                            >
                              Alerta de Reposição
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 whitespace-nowrap"
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
                        <TableCell className="font-medium whitespace-nowrap">{f.nome}</TableCell>
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
                          {formatCurrency(porCab)} / cab
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
