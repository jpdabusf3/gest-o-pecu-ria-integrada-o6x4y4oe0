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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TriangleAlert, BellRing } from 'lucide-react'
import { inventoryData } from '@/data/mock'
import { useFarm } from '@/contexts/FarmContext'
import useFazendaStore from '@/stores/useFazendaStore'

function EditThresholdModal({ item, updateMinThreshold }: { item: any; updateMinThreshold: any }) {
  const [open, setOpen] = useState(false)
  const [minQtd, setMinQtd] = useState(item.minQtd?.toString() || '0')

  const handleSave = () => {
    updateMinThreshold(item.id, Number(minQtd))
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-primary"
        >
          <BellRing className="h-3 w-3" /> Config. Limite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[325px]">
        <DialogHeader>
          <DialogTitle>Ajustar Alerta de Estoque</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Insumo</Label>
            <Input disabled value={item.item} className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Quantidade Mínima ({item.unidade})</Label>
            <Input type="number" value={minQtd} onChange={(e) => setMinQtd(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full">
            Salvar Limite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Estoque() {
  const { inventory, updateMinThreshold } = useFarm()
  const { fazendas, updateFazenda } = useFazendaStore()
  const criticalItems = inventory.filter((i) => i.qtd <= i.minQtd)

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
            <TableHead>Status</TableHead>
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
                <Badge variant={item.qtd < item.minQtd ? 'destructive' : 'secondary'}>
                  {item.qtd < item.minQtd ? 'Crítico' : 'Normal'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Estoque & Insumos</h2>
        <p className="text-muted-foreground mt-1">
          Gestão de almoxarifado, controle automatizado de nutrição animal e custos por fazenda.
        </p>
      </div>

      {criticalItems.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <TriangleAlert className="h-5 w-5" />
          <AlertTitle className="text-base font-bold">Alerta de Compras Necessárias</AlertTitle>
          <AlertDescription className="mt-2 text-destructive-foreground/90">
            Atenção: {criticalItems.length} itens de nutrição operando abaixo do nível de segurança.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="nutricao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-2xl mb-6 h-auto md:h-10">
          <TabsTrigger value="nutricao" className="py-2 md:py-1.5">
            Nutrição
          </TabsTrigger>
          <TabsTrigger value="farmacia" className="py-2 md:py-1.5">
            Farmácia
          </TabsTrigger>
          <TabsTrigger value="almoxarifado" className="py-2 md:py-1.5">
            Almoxarifado
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
                    {inventory.map((item) => {
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
                              <EditThresholdModal
                                item={item}
                                updateMinThreshold={updateMinThreshold}
                              />
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
            <CardContent className="pt-6">{renderGenericTable(inventoryData.farmacia)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="almoxarifado">
          <Card>
            <CardContent className="pt-6">
              {renderGenericTable(inventoryData.almoxarifado)}
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
