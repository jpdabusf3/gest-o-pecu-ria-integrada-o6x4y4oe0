import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
import { useFarm } from '@/contexts/FarmContext'
import { useToast } from '@/hooks/use-toast'
import { Wheat } from 'lucide-react'

export function RegisterFeedModal() {
  const [open, setOpen] = useState(false)
  const { lots, inventory, registerFeedConsumption } = useFarm()
  const { toast } = useToast()

  const [loteId, setLoteId] = useState('')
  const [inventoryId, setInventoryId] = useState('')
  const [amount, setAmount] = useState('')

  const handleSave = () => {
    if (!loteId || !inventoryId || !amount) return
    registerFeedConsumption(loteId, inventoryId, Number(amount))
    toast({
      title: 'Trato Registrado',
      description: 'O estoque de nutrição foi deduzido automaticamente.',
    })
    setOpen(false)
    setLoteId('')
    setInventoryId('')
    setAmount('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Wheat className="h-4 w-4" /> Registrar Trato
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-primary" /> Registrar Trato
          </DialogTitle>
          <DialogDescription>
            Informe o consumo de insumos para um lote. O sistema irá deduzir o estoque
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Lote Confinado</Label>
            <Select value={loteId} onValueChange={setLoteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lots.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.id} - {l.curral}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Insumo Utilizado</Label>
            <Select value={inventoryId} onValueChange={setInventoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o insumo" />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.item} ({i.qtd}
                    {i.unidade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantidade Consumida</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 150"
            />
          </div>
          <Button onClick={handleSave} className="w-full">
            Confirmar Baixa de Estoque
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
