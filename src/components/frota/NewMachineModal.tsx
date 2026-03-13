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
import { Plus } from 'lucide-react'
import useFrotaStore from '@/stores/useFrotaStore'
import { useToast } from '@/hooks/use-toast'

export function NewMachineModal() {
  const [open, setOpen] = useState(false)
  const { addMachine } = useFrotaStore()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    type: 'Trator',
    currentHours: '',
    currentKm: '',
  })

  const handleSave = () => {
    if (!formData.name) return
    addMachine({
      name: formData.name,
      type: formData.type,
      acquisitionValue: 0,
      currentHours: formData.currentHours ? Number(formData.currentHours) : null,
      currentKm: formData.currentKm ? Number(formData.currentKm) : null,
      fuelConsumption: 0,
      maintenanceCost: 0,
      depreciation: 0,
      status: 'Ativo',
    })
    toast({ title: 'Máquina Registrada', description: 'O equipamento foi adicionado à frota.' })
    setOpen(false)
    setFormData({ name: '', type: 'Trator', currentHours: '', currentKm: '' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nova Máquina
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Equipamento</DialogTitle>
          <DialogDescription>Insira os dados do novo veículo ou maquinário.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome / Identificação</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Trator John Deere 6100J"
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Trator">Trator</SelectItem>
                <SelectItem value="Veículo">Veículo Leve</SelectItem>
                <SelectItem value="Caminhão">Caminhão</SelectItem>
                <SelectItem value="Implemento">Implemento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horímetro Inicial (h)</Label>
              <Input
                type="number"
                value={formData.currentHours}
                onChange={(e) => setFormData({ ...formData, currentHours: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Odômetro Inicial (km)</Label>
              <Input
                type="number"
                value={formData.currentKm}
                onChange={(e) => setFormData({ ...formData, currentKm: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full mt-2">
            Salvar Cadastro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
