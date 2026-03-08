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
          Gestão de almoxarifado e controle automatizado de nutrição animal.
        </p>
      </div>

      {criticalItems.length > 0 && (
        <Alert
          variant="destructive"
          className="border-destructive/50 bg-destructive/10 animate-in slide-in-from-top-4"
        >
          <TriangleAlert className="h-5 w-5" />
          <AlertTitle className="text-base font-bold">Alerta de Compras Necessárias</AlertTitle>
          <AlertDescription className="mt-2 text-destructive-foreground/90">
            Atenção: {criticalItems.length} itens de nutrição operando abaixo do nível de segurança.
            <ul className="mt-2 space-y-1 ml-6 list-disc">
              {criticalItems.map((i) => (
                <li key={i.id} className="font-medium">
                  {i.item} — Atual: {i.qtd} {i.unidade} (Mínimo estipulado: {i.minQtd})
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="nutricao" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
          <TabsTrigger value="nutricao">Nutrição</TabsTrigger>
          <TabsTrigger value="farmacia">Farmácia</TabsTrigger>
          <TabsTrigger value="almoxarifado">Almoxarifado</TabsTrigger>
        </TabsList>

        <TabsContent value="nutricao">
          <Card>
            <CardHeader>
              <CardTitle>Suplementação e Rações</CardTitle>
              <CardDescription>
                O estoque deduz automaticamente quando registros de trato são efetuados nos lotes.
              </CardDescription>
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
                                className={isCritical ? 'animate-pulse-slow' : ''}
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
      </Tabs>
    </div>
  )
}
