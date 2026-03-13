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
import useHedgeStore from '@/stores/useHedgeStore'
import { useToast } from '@/hooks/use-toast'
import { Plus, Shield } from 'lucide-react'

export function RegisterHedgeModal() {
  const [open, setOpen] = useState(false)
  const { addPosition } = useHedgeStore()
  const { toast } = useToast()

  const [contractCode, setContractCode] = useState('')
  const [type, setType] = useState<'Future' | 'Put' | 'Call'>('Put')
  const [quantity, setQuantity] = useState('')
  const [strikePrice, setStrikePrice] = useState('')
  const [premiumPaid, setPremiumPaid] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [basisLocal, setBasisLocal] = useState('-15')

  const handleSave = () => {
    if (!contractCode || !quantity || !strikePrice || !expiryDate) return

    addPosition({
      contractCode,
      type,
      quantity: Number(quantity),
      strikePrice: Number(strikePrice),
      premiumPaid: Number(premiumPaid || 0),
      expiryDate,
      basisLocal: Number(basisLocal || 0),
      status: 'Aberto',
    })
    toast({ title: 'Hedge Registrado', description: 'Posição salva no portfólio de risco.' })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Registrar Operação B3
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Nova Posição de Hedge
          </DialogTitle>
          <DialogDescription>
            Registre um novo contrato derivativo para proteção de preços.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código do Contrato</Label>
              <Input
                placeholder="Ex: BGIV26"
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Derivativo</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Put">Opção de Venda (Put)</SelectItem>
                  <SelectItem value="Call">Opção de Compra (Call)</SelectItem>
                  <SelectItem value="Future">Contrato Futuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade (Contratos)</Label>
              <Input
                type="number"
                placeholder="Ex: 10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Strike (R$)</Label>
              <Input
                type="number"
                value={strikePrice}
                onChange={(e) => setStrikePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prêmio (R$)</Label>
              <Input
                type="number"
                value={premiumPaid}
                onChange={(e) => setPremiumPaid(e.target.value)}
                disabled={type === 'Future'}
              />
            </div>
            <div className="space-y-2">
              <Label>Basis Local (R$)</Label>
              <Input
                type="number"
                value={basisLocal}
                onChange={(e) => setBasisLocal(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full mt-2">
            Salvar Posição
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
