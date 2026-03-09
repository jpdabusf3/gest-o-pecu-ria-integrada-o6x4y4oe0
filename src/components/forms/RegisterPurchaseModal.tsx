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
import { ShoppingCart } from 'lucide-react'

export function RegisterPurchaseModal() {
  const [open, setOpen] = useState(false)
  const { inventory, registerPurchase } = useFarm()
  const { addEntry } = useFinanceStore()
  const { toast } = useToast()

  const [inventoryId, setInventoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [totalCost, setTotalCost] = useState('')

  const handleSave = () => {
    if (!inventoryId || !amount || !totalCost) return

    registerPurchase(inventoryId, Number(amount), Number(totalCost))

    const item = inventory.find((i) => i.id === inventoryId)

    addEntry({
      description: `Compra: ${item?.item || 'Insumo Diversos'}`,
      category:
        item?.tipo === 'Biológico' || item?.tipo === 'Antiparasitário' ? 'Sanidade' : 'Insumos',
      amount: Number(totalCost),
      type: 'expense',
    })

    toast({
      title: 'Compra Registrada',
      description: 'Níveis de estoque atualizados e despesa lançada com sucesso no livro razão.',
    })

    setOpen(false)
    setInventoryId('')
    setAmount('')
    setTotalCost('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ShoppingCart className="h-4 w-4" /> Registrar Compra
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> Compra de Insumos
          </DialogTitle>
          <DialogDescription>
            Adicione itens ao estoque físico. O custo total alimentará automaticamente o financeiro
            global da fazenda.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Insumo Adquirido</Label>
            <Select value={inventoryId} onValueChange={setInventoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o insumo" />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.item} (Atual: {i.qtd}
                    {i.unidade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade Adquirida</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 500"
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Total (R$)</Label>
              <Input
                type="number"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="Ex: 1250.00"
              />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full">
            Confirmar Compra e Atualizar Financeiro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
