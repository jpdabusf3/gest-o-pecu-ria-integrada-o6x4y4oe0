import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { BellRing, Target } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { marketIndicators } from '@/data/market'

export function PriceAlertModal() {
  const [open, setOpen] = useState(false)
  const [indicator, setIndicator] = useState('sp')
  const [targetPrice, setTargetPrice] = useState('250.00')
  const { toast } = useToast()

  const handleSaveAlert = () => {
    const selectedMarket = marketIndicators.find((m) => m.id === indicator)
    const currentPrice = selectedMarket?.price || 0
    const target = parseFloat(targetPrice)

    toast({
      title: 'Alerta Configurado',
      description: `Notificaremos quando ${selectedMarket?.label} atingir R$ ${target.toFixed(2)}.`,
    })

    // Simulate immediate check against daily API integrated data
    if (currentPrice >= target) {
      setTimeout(() => {
        toast({
          title: '🚨 Alerta de Oportunidade!',
          description: `O mercado atingiu seu alvo! ${selectedMarket?.label} está cotado a R$ ${currentPrice.toFixed(2)}.`,
          variant: 'destructive',
        })
      }, 1500)
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
        >
          <BellRing className="h-4 w-4" /> Alertas de Preço
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Novo Alerta de Oportunidade
          </DialogTitle>
          <DialogDescription>
            Configure um gatilho para receber notificação push quando o mercado atingir o alvo
            desejado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Indicador de Referência</Label>
            <Select value={indicator} onValueChange={setIndicator}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mercado" />
              </SelectTrigger>
              <SelectContent>
                {marketIndicators.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label} (Atual: R$ {m.price.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Preço Alvo (R$ por @)</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">R$</span>
              <Input
                type="number"
                step="0.5"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="pl-10 text-lg font-bold"
              />
            </div>
          </div>
          <Button onClick={handleSaveAlert} className="w-full gap-2">
            <BellRing className="h-4 w-4" /> Salvar Alerta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
