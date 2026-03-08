import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MapPin, Beef, Plus, Search } from 'lucide-react'
import { sectorData } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'

export default function Campo() {
  const { toast } = useToast()
  const [selectedLote, setSelectedLote] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actionType, setActionType] = useState('movimentar')
  const [searchTerm, setSearchTerm] = useState('')

  const allLotes = [
    ...sectorData.cria.lotes.map((l) => ({ ...l, setor: 'Cria' })),
    ...sectorData.recria.lotes.map((l) => ({ ...l, setor: 'Recria' })),
    ...sectorData.engorda.lotes.map((l) => ({ ...l, setor: 'Engorda' })),
  ]

  const filteredLotes = allLotes.filter(
    (l) =>
      l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.pasto.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAction = () => {
    toast({
      title: 'Operação de Campo Registrada',
      description: `Ação de "${actionType}" no lote ${selectedLote?.id} salva e sincronizada com sucesso.`,
    })
    setDrawerOpen(false)
  }

  const openDrawer = (lote: any) => {
    setSelectedLote(lote)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-4 pb-20 sm:pb-6 max-w-md mx-auto">
      <div className="bg-primary text-primary-foreground p-6 -mx-4 -mt-4 sm:rounded-b-2xl shadow-md mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Operações de Campo</h2>
        <p className="text-primary-foreground/80 mt-1 text-sm">
          Módulo mobile. Sincronização em tempo real ativada.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar lote ou pasto..."
          className="pl-9 bg-background shadow-sm h-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3 mt-4">
        {filteredLotes.map((lote) => (
          <Card
            key={lote.id}
            className="cursor-pointer hover:border-primary transition-colors active:scale-[0.98]"
            onClick={() => openDrawer(lote)}
          >
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{lote.id}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {lote.setor}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Beef className="h-3.5 w-3.5" /> {lote.cabecas} cab
                  <span className="mx-1">•</span>
                  <MapPin className="h-3.5 w-3.5" /> {lote.pasto}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary rounded-full h-10 w-10 bg-primary/10"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="flex justify-between items-center text-xl">
              Lote {selectedLote?.id}
              <Badge className="text-sm px-2 py-1">{selectedLote?.cabecas} cab</Badge>
            </DrawerTitle>
            <DrawerDescription className="text-sm mt-1">
              Local atual:{' '}
              <span className="font-medium text-foreground">{selectedLote?.pasto}</span> (
              {selectedLote?.setor})
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-2 space-y-5 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tipo de Operação Rápida</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movimentar">Troca de Pasto / Retiro</SelectItem>
                  <SelectItem value="contagem">Atualizar Contagem (Mortalidade)</SelectItem>
                  <SelectItem value="abate">Saída para Abate / Venda</SelectItem>
                  <SelectItem value="servico">Lançar Manejo Sanitário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === 'movimentar' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Select defaultValue="pasto-2">
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pasto-1">Pasto 01 - Sede</SelectItem>
                      <SelectItem value="pasto-2">Pasto 02 - Fundo</SelectItem>
                      <SelectItem value="pasto-3">Pasto 03 - Represa</SelectItem>
                      <SelectItem value="conf-1">Confinamento A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {actionType === 'contagem' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nova Contagem</Label>
                    <Input
                      type="number"
                      defaultValue={selectedLote?.cabecas}
                      className="h-12 text-lg font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Select defaultValue="morte">
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ajuste">Ajuste / Erro</SelectItem>
                        <SelectItem value="morte">Mortalidade</SelectItem>
                        <SelectItem value="nascimento">Nascimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {actionType === 'abate' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <Label>Qtd de Cabeças Desembarcadas</Label>
                  <Input type="number" placeholder="Ex: 40" className="h-12 text-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Comprador / Frigorífico</Label>
                  <Input placeholder="Nome do destino..." className="h-12" />
                </div>
              </div>
            )}

            {actionType === 'servico' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <Label>Descrição do Serviço / Manejo</Label>
                  <Input
                    placeholder="Ex: Aplicação de vermífugo, carrapaticida..."
                    className="h-12"
                  />
                </div>
              </div>
            )}
          </div>
          <DrawerFooter className="pt-4 pb-8">
            <Button onClick={handleAction} size="lg" className="w-full text-base h-12 shadow-md">
              Confirmar Ação
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="lg" className="w-full h-12">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
