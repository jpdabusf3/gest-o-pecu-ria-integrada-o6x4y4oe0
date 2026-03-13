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
import { Fuel } from 'lucide-react'
import useFrotaStore from '@/stores/useFrotaStore'
import { useFarm } from '@/contexts/FarmContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export function RefuelModal() {
  const [open, setOpen] = useState(false)
  const { machines, addRefuel } = useFrotaStore()
  const { inventory, registerConsumption } = useFarm()
  const { user } = useAuth()
  const { toast } = useToast()

  const [machineId, setMachineId] = useState('')
  const [fuelType, setFuelType] = useState('Diesel S10')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const handleSave = () => {
    if (!machineId || !quantity) return
    const machine = machines.find((m) => m.id === machineId)
    if (!machine) return

    addRefuel({
      machineId,
      machineName: machine.name,
      fuelType,
      quantity: Number(quantity),
      date,
      operator: user.name,
    })

    const invItem = inventory.find((i) => i.item.includes(fuelType))
    if (invItem) {
      registerConsumption('FROTA', invItem.id, Number(quantity))
    }

    toast({
      title: 'Abastecimento Registrado',
      description: 'O estoque de combustível foi deduzido automaticamente.',
    })
    setOpen(false)
    setQuantity('')
    setMachineId('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Fuel className="h-4 w-4" /> Abastecimento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Abastecimento</DialogTitle>
          <DialogDescription>
            Registre o volume abastecido. O valor será deduzido do tanque (estoque) da fazenda.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Máquina / Veículo</Label>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Combustível</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diesel S10">Diesel S10</SelectItem>
                  <SelectItem value="Gasolina Comum">Gasolina Comum</SelectItem>
                  <SelectItem value="Álcool">Álcool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade (Litros)</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 150"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full mt-2">
            Confirmar e Atualizar Estoque
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
