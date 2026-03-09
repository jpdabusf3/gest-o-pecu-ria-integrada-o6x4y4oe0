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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckSquare, Clock, Plus, DollarSign, CheckCircle2, CloudOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useAppNotifications } from '@/contexts/NotificationContext'
import { useTasks, Task } from '@/contexts/TaskContext'
import { useOffline } from '@/contexts/OfflineContext'
import { useFarm } from '@/contexts/FarmContext'
import useFinanceStore from '@/stores/useFinanceStore'

type OptimisticTask = Task & { isPendingSync?: boolean }

export default function Tarefas() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const { addNotification } = useAppNotifications()
  const { serverTasks, addTaskOnServer, completeTaskOnServer } = useTasks()
  const { queue, addAction, isOnline } = useOffline()
  const { inventory, registerConsumption } = useFarm()
  const { addEntry } = useFinanceStore()

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    frequency: 'Semanal',
    assignedTo: '',
    duration: 2,
    costPerHour: 20,
    lotId: '',
    resources: [],
  })

  const [selectedInventory, setSelectedInventory] = useState('')
  const [resourceAmount, setResourceAmount] = useState('')

  const handleAddResource = () => {
    if (!selectedInventory || !resourceAmount) return
    const current = newTask.resources || []
    setNewTask({
      ...newTask,
      resources: [...current, { inventoryId: selectedInventory, amount: Number(resourceAmount) }],
    })
    setSelectedInventory('')
    setResourceAmount('')
  }

  const optimisticTasks: OptimisticTask[] = serverTasks.map((t) => {
    const isPending = queue.some((q) => q.type === 'COMPLETE_TASK' && q.payload.taskId === t.id)
    if (isPending && t.status !== 'Concluído') {
      return { ...t, status: 'Concluído', isPendingSync: true }
    }
    return t
  })

  const getTaskTotalCost = (t: Task) => {
    const laborCost = t.duration * t.costPerHour
    let inventoryCost = 0
    if (t.resources) {
      t.resources.forEach((r) => {
        const item = inventory.find((i) => i.id === r.inventoryId)
        if (item) inventoryCost += (item.custoUnitario || 0) * r.amount
      })
    }
    return laborCost + inventoryCost
  }

  const handleSave = () => {
    if (!newTask.title || !newTask.assignedTo) return
    const taskToSave = { ...newTask, id: `T${Date.now()}`, status: 'Pendente' } as Task
    addTaskOnServer(taskToSave)

    addNotification({
      title: 'Nova Tarefa Atribuída',
      message: `A atividade "${newTask.title}" foi atribuída para ${newTask.assignedTo}.`,
      type: 'task',
    })

    setOpen(false)
    setNewTask({
      title: '',
      frequency: 'Semanal',
      assignedTo: '',
      duration: 2,
      costPerHour: 20,
      lotId: '',
      resources: [],
    })
    toast({
      title: 'Tarefa Criada',
      description: 'Nova atividade operacional registrada com sucesso.',
    })
  }

  const handleComplete = (t: OptimisticTask) => {
    addAction({ type: 'COMPLETE_TASK', payload: { taskId: t.id } })

    let inventoryCost = 0
    if (t.resources && t.resources.length > 0) {
      t.resources.forEach((r) => {
        registerConsumption(t.lotId, r.inventoryId, r.amount)
        const item = inventory.find((i) => i.id === r.inventoryId)
        if (item) inventoryCost += (item.custoUnitario || 0) * r.amount
      })
    }

    const laborCost = t.duration * t.costPerHour
    const totalCost = laborCost + inventoryCost

    addEntry({
      description: `Tarefa: ${t.title}`,
      category: inventoryCost > 0 ? 'Mão de Obra e Insumos' : 'Mão de Obra',
      amount: totalCost,
      type: 'expense',
      loteId: t.lotId,
    })

    completeTaskOnServer(t.id)

    if (!isOnline) {
      toast({
        title: 'Salvo Offline',
        description: `A tarefa "${t.title}" foi marcada como concluída localmente. Sincronização ocorrerá quando houver conexão.`,
        variant: 'secondary',
      })
    } else {
      toast({
        title: 'Atividade Concluída',
        description: `Tarefa finalizada. Custo (R$ ${totalCost.toFixed(2)}) alocado ao lote ${t.lotId}.`,
      })
    }
  }

  const visibleTasks =
    user.role === 'operador'
      ? optimisticTasks.filter((t) => t.assignedTo.includes('João'))
      : optimisticTasks

  const pending = visibleTasks.filter((t) => t.status === 'Pendente')
  const completed = visibleTasks.filter((t) => t.status === 'Concluído')
  const pendingCost = pending.reduce((acc, t) => acc + getTaskTotalCost(t), 0)

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-8 w-8 text-primary" /> Minhas Tarefas
          </h2>
          <p className="text-muted-foreground mt-1">
            {user.role === 'admin'
              ? 'Controle de atividades de campo, horas trabalhadas e alocação de custos.'
              : 'Acompanhe e conclua suas atividades. Modo offline suportado.'}
          </p>
        </div>

        {user.role === 'admin' && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Atividade Operacional</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nome da Tarefa</Label>
                  <Input
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Ex: Manutenção de Cerca"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Input
                      onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })}
                      defaultValue="Semanal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lote / Alvo</Label>
                    <Input
                      onChange={(e) => setNewTask({ ...newTask, lotId: e.target.value })}
                      placeholder="Ex: LEN-01"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    placeholder="Nome do colaborador"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duração Estimada (h)</Label>
                    <Input
                      type="number"
                      onChange={(e) => setNewTask({ ...newTask, duration: Number(e.target.value) })}
                      defaultValue={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo Hora (R$)</Label>
                    <Input
                      type="number"
                      onChange={(e) =>
                        setNewTask({ ...newTask, costPerHour: Number(e.target.value) })
                      }
                      defaultValue={20}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t mt-2 space-y-2">
                  <Label>Recursos / Insumos (Opcional)</Label>
                  <div className="flex gap-2">
                    <Select value={selectedInventory} onValueChange={setSelectedInventory}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.item} (Disp: {i.qtd} {i.unidade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Qtd"
                      value={resourceAmount}
                      onChange={(e) => setResourceAmount(e.target.value)}
                      className="w-24"
                    />
                    <Button type="button" variant="secondary" onClick={handleAddResource}>
                      Add
                    </Button>
                  </div>
                  {newTask.resources && newTask.resources.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {newTask.resources.map((r, idx) => {
                        const invItem = inventory.find((i) => i.id === r.inventoryId)
                        return (
                          <div
                            key={idx}
                            className="flex justify-between text-xs bg-muted p-2 rounded"
                          >
                            <span>{invItem?.item}</span>
                            <span className="font-semibold">
                              {r.amount} {invItem?.unidade}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave}>Salvar Tarefa</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className={`grid gap-4 ${user.role === 'admin' ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-500">
              Tarefas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
              <Clock className="h-5 w-5" /> {pending.length} atividades
            </div>
          </CardContent>
        </Card>

        {user.role === 'admin' && (
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive">
                Custo Pendente Projetado (Recursos + Mão de Obra)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive flex items-center gap-2">
                <DollarSign className="h-5 w-5" /> R$ {pendingCost.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Duração</TableHead>
                    {user.role === 'admin' && <TableHead>Custo Proj.</TableHead>}
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          <span>{t.frequency}</span>•<span>Alvo: {t.lotId}</span>
                        </div>
                      </TableCell>
                      <TableCell>{t.assignedTo}</TableCell>
                      <TableCell>{t.duration}h</TableCell>
                      {user.role === 'admin' && (
                        <TableCell>R$ {getTaskTotalCost(t).toFixed(2)}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          onClick={() => handleComplete(t)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pending.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={user.role === 'admin' ? 5 : 4}
                        className="text-center py-6 text-muted-foreground"
                      >
                        Nenhuma tarefa pendente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="concluidas">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Responsável</TableHead>
                    {user.role === 'admin' && <TableHead>Custo Efetivado</TableHead>}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completed.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.lotId}</div>
                      </TableCell>
                      <TableCell>{t.assignedTo}</TableCell>
                      {user.role === 'admin' && (
                        <TableCell>R$ {getTaskTotalCost(t).toFixed(2)}</TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-200"
                          >
                            Concluído
                          </Badge>
                          {t.isPendingSync && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                              <CloudOff className="h-3 w-3" /> Fila Offline
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {completed.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={user.role === 'admin' ? 4 : 3}
                        className="text-center py-6 text-muted-foreground"
                      >
                        Nenhuma tarefa concluída.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
