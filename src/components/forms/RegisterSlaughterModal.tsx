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
import useAbateStore from '@/stores/useAbateStore'
import { useFarm } from '@/contexts/FarmContext'
import { useToast } from '@/hooks/use-toast'
import { Plus, Factory } from 'lucide-react'

export function RegisterSlaughterModal() {
  const [open, setOpen] = useState(false)
  const { addRecord } = useAbateStore()
  const { lots } = useFarm()
  const { toast } = useToast()

  const [lotId, setLotId] = useState('')
  const [frigorificoName, setFrigorificoName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [headcount, setHeadcount] = useState('')
  const [pesoVivoTotal, setPesoVivoTotal] = useState('')
  const [pesoCarcacaTotal, setPesoCarcacaTotal] = useState('')
  const [valorTotal, setValorTotal] = useState('')

  const handleSave = () => {
    if (!lotId || !frigorificoName || !pesoVivoTotal || !pesoCarcacaTotal) return

    addRecord({
      lotId,
      frigorificoName,
      date,
      headcount: Number(headcount),
      pesoVivoTotal: Number(pesoVivoTotal),
      pesoCarcacaTotal: Number(pesoCarcacaTotal),
      valorTotal: Number(valorTotal),
    })
    toast({ title: 'Romaneio Registrado', description: 'Dados de abate e rendimento salvos.' })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Lançar Romaneio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" /> Lançamento de Abate
          </DialogTitle>
          <DialogDescription>
            Registre os pesos oficiais de balança para apuração de rendimento de carcaça.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lote de Origem</Label>
              <Select value={lotId} onValueChange={setLotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o Lote" />
                </SelectTrigger>
                <SelectContent>
                  {lots.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.id} ({l.cabecas} cab)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Qtd. Cabeças</Label>
              <Input
                type="number"
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Frigorífico (Destino)</Label>
            <Input
              placeholder="Ex: Frigorífico ABC"
              value={frigorificoName}
              onChange={(e) => setFrigorificoName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peso Vivo Total (kg)</Label>
              <Input
                type="number"
                placeholder="Balança Fazenda"
                value={pesoVivoTotal}
                onChange={(e) => setPesoVivoTotal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Peso Carcaça Total (kg)</Label>
              <Input
                type="number"
                placeholder="Romaneio Frig."
                value={pesoCarcacaTotal}
                onChange={(e) => setPesoCarcacaTotal(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data do Abate</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor Total Recebido (R$)</Label>
              <Input
                type="number"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full mt-2">
            Gravar Romaneio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
