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
import { Scale } from 'lucide-react'

export function RegisterWeightModal() {
  const [open, setOpen] = useState(false)
  const { lots, addWeightRecord } = useFarm()
  const { toast } = useToast()

  const [loteId, setLoteId] = useState('')
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const handleSave = () => {
    if (!loteId || !weight || !date) return
    addWeightRecord(loteId, Number(weight), date)
    toast({
      title: 'Pesagem Registrada',
      description: 'O GMD e a projeção de abate foram recalibrados (IA).',
    })
    setOpen(false)
    setLoteId('')
    setWeight('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Scale className="h-4 w-4" /> Nova Pesagem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" /> Adicionar Pesagem
          </DialogTitle>
          <DialogDescription>
            Atualize o peso médio para recalcular a previsão de crescimento e abate preditivo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Lote</Label>
            <Select value={loteId} onValueChange={setLoteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lots.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.id} (Peso Atual: {l.pesoMedio}kg)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Novo Peso Médio (kg)</Label>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 480"
            />
          </div>
          <div className="space-y-2">
            <Label>Data da Pesagem</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full">
            Salvar Pesagem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
