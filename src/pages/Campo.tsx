import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import {
  MapPin,
  Beef,
  Plus,
  Search,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  ListTodo,
} from 'lucide-react'
import { sectorData } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { useFarm } from '@/contexts/FarmContext'

export default function Campo() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { isOnline, queue, addAction, isSyncing } = useOffline()
  const { registerConsumption } = useFarm()

  const [selectedLote, setSelectedLote] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actionType, setActionType] = useState('movimentar')
  const [searchTerm, setSearchTerm] = useState('')

  const [tasks, setTasks] = useState([
    {
      id: 'T1',
      title: 'Fornecer Sal Mineral',
      lote: 'LCR-01',
      item: 'N1',
      amount: 50,
      done: false,
      desc: 'Pasto 01',
    },
    {
      id: 'T2',
      title: 'Vacinação Aftosa',
      lote: 'LCR-02',
      item: 'F1',
      amount: 85,
      done: false,
      desc: 'Pasto 03',
    },
    {
      id: 'T3',
      title: 'Ração Creep Feeding',
      lote: 'LCR-04',
      item: 'N2',
      amount: 120,
      done: false,
      desc: 'Pasto 02',
    },
  ])

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
    addAction({
      type: 'FIELD_OPERATION',
      payload: { operationType: actionType, lote: selectedLote?.id, operator: user.name },
    })

    if (isOnline) {
      toast({
        title: 'Operação Registrada',
        description: `Sincronizando ação de "${actionType}" no lote ${selectedLote?.id}.`,
      })
    } else {
      toast({
        title: 'Salvo Offline',
        description: `Ação salva localmente. Sincronização pendente.`,
        variant: 'secondary',
      })
    }
    setDrawerOpen(false)
  }

  const openDrawer = (lote: any) => {
    setSelectedLote(lote)
    setDrawerOpen(true)
  }

  const handleTaskToggle = (taskId: string, currentDone: boolean) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    if (!currentDone) {
      // Mark as complete and deduct inventory
      registerConsumption(task.lote, task.item, task.amount)
      addAction({
        type: 'COMPLETE_TASK',
        payload: { taskId: task.id, operator: user.name },
      })
      toast({
        title: 'Tarefa Concluída',
        description: `Estoque deduzido (${task.amount} unid. de ${task.item}).`,
      })
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)))
  }

  return (
    <div className="space-y-4 pb-20 sm:pb-6 max-w-md mx-auto">
      <div className="bg-primary text-primary-foreground p-6 -mx-4 -mt-4 sm:rounded-b-2xl shadow-md mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Operações Mobile</h2>
          <p className="text-primary-foreground/80 mt-1 text-sm">
            Operador: <span className="font-semibold">{user.name}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!isOnline && (
            <Badge
              variant="destructive"
              className="bg-destructive text-white border-0 opacity-90 gap-1.5 py-1"
            >
              <CloudOff className="h-3 w-3" /> Offline
            </Badge>
          )}
          {isSyncing && (
            <Badge variant="secondary" className="bg-white/20 text-white border-0 gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin" /> Sync
            </Badge>
          )}
          {!isOnline && queue.length > 0 && (
            <span className="text-xs text-white/80 font-medium">{queue.length} pendente(s)</span>
          )}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2 px-1">
          <ListTodo className="h-4 w-4" /> Tarefas do Dia
        </h3>
        <div className="grid gap-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={`transition-colors ${task.done ? 'bg-muted/50 border-muted' : 'border-border'}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-semibold ${task.done ? 'text-muted-foreground line-through' : ''}`}
                    >
                      {task.title}
                    </span>
                    {task.done && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {task.lote}
                    </Badge>
                    <span>• {task.desc}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Switch
                    checked={task.done}
                    onCheckedChange={() => handleTaskToggle(task.id, task.done)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">
                    {task.done ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
        Lotes & Manejo Livre
      </h3>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar lote ou pasto..."
          className="pl-9 bg-background shadow-sm h-12 text-base rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3 mt-4">
        {filteredLotes.map((lote) => (
          <Card
            key={lote.id}
            className="cursor-pointer hover:border-primary transition-colors active:scale-[0.98] rounded-xl shadow-sm border-muted"
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
              <Label className="text-sm font-semibold">Tipo de Operação</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movimentar">Troca de Pasto / Retiro</SelectItem>
                  <SelectItem value="pesagem">Registro Rápido de Pesagem</SelectItem>
                  <SelectItem value="contagem">Atualizar Contagem (Mortalidade)</SelectItem>
                  <SelectItem value="abate">Saída para Abate / Venda</SelectItem>
                  <SelectItem value="servico">Lançar Manejo Sanitário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === 'pesagem' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="space-y-2">
                  <Label className="text-base">Peso Médio Aferido (kg)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 245"
                    className="h-16 text-3xl font-bold text-center"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  O valor inserido atualizará o histórico do lote e recalibrará a IA de projeção.
                </p>
              </div>
            )}

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
                  <Input placeholder="Ex: Aplicação de vermífugo..." className="h-12" />
                </div>
              </div>
            )}
          </div>
          <DrawerFooter className="pt-4 pb-8">
            <Button onClick={handleAction} size="lg" className="w-full text-base h-12 shadow-md">
              Confirmar Operação {isOnline ? '' : '(Offline)'}
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
