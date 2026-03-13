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
import useFinanceStore from '@/stores/useFinanceStore'
import { useToast } from '@/hooks/use-toast'
import { Activity } from 'lucide-react'

export function RegisterConsumptionModal() {
  const [open, setOpen] = useState(false)
  const { lots, inventory, registerConsumption } = useFarm()
  const { addEntry } = useFinanceStore()
  const { toast } = useToast()

  const [loteId, setLoteId] = useState('')
  const [inventoryId, setInventoryId] = useState('')
  const [amount, setAmount] = useState('')

  const handleSave = () => {
    if (!loteId || !inventoryId || !amount) return

    registerConsumption(loteId, inventoryId, Number(amount))

    const item = inventory.find((i) => i.id === inventoryId)
    if (item) {
      const unitCost = item.custoUnitario || 2.0
      const totalCost = Number(amount) * unitCost

      addEntry({
        description: `Uso de Insumo: ${item.item}`,
        category:
          item.tipo === 'Biológico' ||
          item.tipo === 'Antiparasitário' ||
          item.tipo === 'Sêmen' ||
          item.tipo === 'Hormônio'
            ? 'Sanidade'
            : 'Custos Operacionais',
        amount: totalCost,
        type: 'expense',
        loteId: loteId,
      })
    }

    toast({
      title: 'Uso Registrado',
      description: 'Estoque deduzido e custo associado ao lote no financeiro.',
    })
    setOpen(false)
    setLoteId('')
    setInventoryId('')
    setAmount('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Activity className="h-4 w-4" /> Registrar Manejo/Uso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Registrar Uso de Insumo
          </DialogTitle>
          <DialogDescription>
            Registre a utilização de itens de farmácia, almoxarifado ou reprodução em lotes
            específicos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Lote Alvo</Label>
            <Select value={loteId} onValueChange={setLoteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lots.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.id} - {l.categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Insumo Geral</Label>
            <Select value={inventoryId} onValueChange={setInventoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o insumo" />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.item} ({i.tipo} - Atual: {i.qtd}
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
              placeholder="Ex: 50"
            />
          </div>
          <Button onClick={handleSave} className="w-full">
            Confirmar Consumo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
