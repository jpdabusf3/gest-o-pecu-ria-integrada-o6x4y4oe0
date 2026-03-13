import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Wrench } from 'lucide-react'
import useFrotaStore from '@/stores/useFrotaStore'
import { useFarm } from '@/contexts/FarmContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export function MaintenanceModal() {
  const [open, setOpen] = useState(false)
  const { machines, addMaintenance } = useFrotaStore()
  const { inventory, registerConsumption } = useFarm()
  const { user } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    machineId: '',
    category: 'Óleos e Lubrificantes',
    description: '',
    inventoryId: 'none',
    qty: '',
    cost: '',
    date: new Date().toISOString().split('T')[0],
  })

  const handleSave = () => {
    if (!formData.machineId || !formData.description) return
    const machine = machines.find((m) => m.id === formData.machineId)
    if (!machine) return

    addMaintenance({
      machineId: formData.machineId,
      machineName: machine.name,
      category: formData.category,
      description: formData.description,
      cost: Number(formData.cost || 0),
      date: formData.date,
      operator: user.name,
    })

    if (formData.inventoryId !== 'none' && formData.qty) {
      registerConsumption('FROTA', formData.inventoryId, Number(formData.qty))
    }

    toast({ title: 'Manutenção Registrada', description: 'Log atualizado e custos alocados.' })
    setOpen(false)
    setFormData({
      machineId: '',
      category: 'Óleos e Lubrificantes',
      description: '',
      inventoryId: 'none',
      qty: '',
      cost: '',
      date: new Date().toISOString().split('T')[0],
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
        >
          <Wrench className="h-4 w-4" /> Registrar Manutenção
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log de Manutenção</DialogTitle>
          <DialogDescription>
            Registre reparos e deduza peças ou óleos diretamente do almoxarifado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Máquina</Label>
              <Select
                value={formData.machineId}
                onValueChange={(v) => setFormData({ ...formData, machineId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Óleos e Lubrificantes">Óleos e Lubrificantes</SelectItem>
                  <SelectItem value="Filtros">Filtros</SelectItem>
                  <SelectItem value="Componentes e Peças">Componentes e Peças</SelectItem>
                  <SelectItem value="Pneus">Pneus</SelectItem>
                  <SelectItem value="Oficina Externa">Oficina Externa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição do Serviço</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Troca de óleo do motor..."
            />
          </div>
          <div className="p-3 bg-muted/30 border border-border/50 rounded-lg space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Integração com Estoque (Opcional)
            </Label>
            <div className="flex gap-2">
              <Select
                value={formData.inventoryId}
                onValueChange={(v) => setFormData({ ...formData, inventoryId: v })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Utilizou peça do estoque?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não utilizar estoque</SelectItem>
                  {inventory
                    .filter(
                      (i) =>
                        ['Lubrificante', 'Peça', 'Material Cerca'].includes(i.tipo) ||
                        i.id.startsWith('A') ||
                        i.id.startsWith('FL'),
                    )
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.item} (Disp: {i.qtd})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formData.inventoryId !== 'none' && (
                <Input
                  type="number"
                  placeholder="Qtd"
                  className="w-24"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Custo Adicional (R$)</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full mt-2">
            Salvar Manutenção
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
