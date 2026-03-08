import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { pasturesData as initialPastures } from '@/data/mock'
import { Plus, Trash, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ManagementTab() {
  const [pastures, setPastures] = useState(initialPastures)
  const [selectedPasto, setSelectedPasto] = useState<number | null>(initialPastures[0]?.id || null)

  const [newPastoName, setNewPastoName] = useState('')
  const [newPastoArea, setNewPastoArea] = useState('')
  const [newPastoCultivar, setNewPastoCultivar] = useState('')
  const [isPastoOpen, setIsPastoOpen] = useState(false)

  const [newInvType, setNewInvType] = useState('')
  const [newInvDate, setNewInvDate] = useState('')
  const [newInvDesc, setNewInvDesc] = useState('')
  const [isInvOpen, setIsInvOpen] = useState(false)

  const pasto = pastures.find((p) => p.id === selectedPasto)

  const handleAddPasto = () => {
    if (!newPastoName) return
    const newId = Math.max(...pastures.map((p) => p.id), 0) + 1
    const newPasto = {
      id: newId,
      nome: newPastoName,
      area: Number(newPastoArea) || 0,
      cultivar: newPastoCultivar,
      estacao: 'Águas',
      lotacaoProjetada: 0,
      lotacaoExecutada: 0,
      alturaEntradaAlvo: 0,
      alturaSaidaAlvo: 0,
      alturaAtual: 0,
      pesoMedioAtual: 0,
      pesoMedioHistorico: 0,
      status: 'Bom',
      ndvi: 0,
      interventions: [],
      sector: 'todos',
      score: 3,
      daysOfRest: 0,
      optimalRestDuration: 30,
      recommendedLotSize: 100,
    }
    setPastures([...pastures, newPasto])
    setIsPastoOpen(false)
    setNewPastoName('')
    setNewPastoArea('')
    setNewPastoCultivar('')
  }

  const handleAddInv = () => {
    if (!pasto || !newInvType) return
    const newInv = {
      id: `I-${Date.now()}`,
      data: newInvDate || new Date().toISOString().split('T')[0],
      tipo: newInvType,
      descricao: newInvDesc,
    }
    setPastures(
      pastures.map((p) =>
        p.id === pasto.id ? { ...p, interventions: [newInv, ...(p.interventions || [])] } : p,
      ),
    )
    setIsInvOpen(false)
    setNewInvType('')
    setNewInvDate('')
    setNewInvDesc('')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 flex flex-col min-h-[500px]">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Map className="w-5 h-5" /> Áreas
          </CardTitle>
          <Dialog open={isPastoOpen} onOpenChange={setIsPastoOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Pasto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={newPastoName} onChange={(e) => setNewPastoName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cultivar (Capim)</Label>
                  <Input
                    value={newPastoCultivar}
                    onChange={(e) => setNewPastoCultivar(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Área (ha)</Label>
                  <Input
                    type="number"
                    value={newPastoArea}
                    onChange={(e) => setNewPastoArea(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddPasto} className="w-full">
                  Salvar Pasto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="flex flex-col">
            {pastures.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPasto(p.id)}
                className={cn(
                  'px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b cursor-pointer flex justify-between group',
                  selectedPasto === p.id && 'bg-muted',
                )}
              >
                <div>
                  <div className="font-medium text-sm">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.cultivar} • {p.area} ha
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPastures(pastures.filter((x) => x.id !== p.id))
                    if (selectedPasto === p.id) setSelectedPasto(null)
                  }}
                >
                  <Trash className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 flex flex-col min-h-[500px]">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
          <CardTitle className="text-lg">
            Intervenções: {pasto?.nome || 'Selecione um pasto'}
          </CardTitle>
          <Dialog open={isInvOpen} onOpenChange={setIsInvOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={!pasto}>
                <Plus className="h-4 w-4" /> Nova Intervenção
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Manejo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Manejo</Label>
                  <Select value={newInvType} onValueChange={setNewInvType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Herbicida">Herbicida</SelectItem>
                      <SelectItem value="Inseticida">Inseticida</SelectItem>
                      <SelectItem value="Correção de Solo">Correção de Solo</SelectItem>
                      <SelectItem value="Adubação">Adubação</SelectItem>
                      <SelectItem value="Reforma Geral">Reforma Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newInvDate}
                    onChange={(e) => setNewInvDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={newInvDesc}
                    onChange={(e) => setNewInvDesc(e.target.value)}
                    placeholder="Detalhes do insumo e dosagem"
                  />
                </div>
                <Button onClick={handleAddInv} className="w-full">
                  Salvar Intervenção
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pasto?.interventions?.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="pl-6 whitespace-nowrap">{inv.data}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground w-full">{inv.descricao}</TableCell>
                </TableRow>
              ))}
              {(!pasto?.interventions || pasto.interventions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                    Nenhuma intervenção registrada neste pasto.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
