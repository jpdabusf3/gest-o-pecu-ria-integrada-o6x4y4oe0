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
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Fazenda } from '@/types/fazenda'
import { useToast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'

export function FarmFormModal({ onSave }: { onSave: (f: Fazenda) => void }) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const [sistemas, setSistemas] = useState<string[]>([])
  const [atividades, setAtividades] = useState<string[]>([])
  const [arrendamento, setArrendamento] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      id: crypto.randomUUID(),
      nome: fd.get('nome') as string,
      proprietario: fd.get('proprietario') as string,
      localizacao: fd.get('localizacao') as string,
      area: Number(fd.get('area')),
      rebanho: Number(fd.get('rebanho')),
      sistemas,
      atividades,
      arrendamento,
    })
    toast({ title: 'Fazenda registrada', description: 'Os dados da propriedade foram salvos.' })
    setOpen(false)
    setSistemas([])
    setAtividades([])
    setArrendamento(false)
  }

  const toggleArray = (
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    val: string,
  ) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  const actList = ['Cria', 'Recria', 'Engorda', 'Ciclo Completo', 'Produção de Genética']
  const sistList = ['ILP', 'ILPF']

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Registrar Fazenda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Propriedade</DialogTitle>
          <DialogDescription>
            Preencha os dados operacionais e de propriedade da fazenda.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-5 py-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Propriedade *</Label>
              <Input name="nome" required placeholder="Ex: Fazenda São João" />
            </div>
            <div className="space-y-2">
              <Label>Proprietário / Grupo *</Label>
              <Input name="proprietario" required placeholder="Nome do titular" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Localização *</Label>
            <Input name="localizacao" required placeholder="Cidade - UF ou Endereço" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área Total (ha) *</Label>
              <Input name="area" type="number" required placeholder="1500" min="1" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>Rebanho Total (Cab) *</Label>
              <Input name="rebanho" type="number" required placeholder="3500" min="0" />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-base">Sistemas de Produção Integrados</Label>
            <div className="flex gap-6">
              {sistList.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sistemas.includes(s)}
                    onCheckedChange={() => toggleArray(sistemas, setSistemas, s)}
                  />
                  <span className="text-sm font-medium">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-base">Atividades Principais</Label>
            <div className="grid grid-cols-2 gap-3">
              {actList.map((act) => (
                <label key={act} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={atividades.includes(act)}
                    onCheckedChange={() => toggleArray(atividades, setAtividades, act)}
                  />
                  <span className="text-sm font-medium">{act}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/30 mt-2">
            <div className="space-y-1">
              <Label className="text-base">Propriedade Arrendada?</Label>
              <p className="text-xs text-muted-foreground">
                Marque se a fazenda for alugada/arrendada.
              </p>
            </div>
            <Switch checked={arrendamento} onCheckedChange={setArrendamento} />
          </div>

          <Button type="submit" className="w-full mt-2">
            Salvar Registro
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
