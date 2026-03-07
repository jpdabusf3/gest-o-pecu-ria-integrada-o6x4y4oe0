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
import { useToast } from '@/hooks/use-toast'

export function QuickAddModal() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const handleSave = () => {
    toast({
      title: 'Registro salvo com sucesso!',
      description: 'A nova entrada foi registrada no sistema e os saldos atualizados.',
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 shadow-sm transition-transform hover:scale-105">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Ação</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Registro Rápido</DialogTitle>
          <DialogDescription>
            Insira os dados básicos. Para mais detalhes, acesse as telas específicas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Registro</Label>
            <Select defaultValue="despesa">
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="despesa">Nova Despesa</SelectItem>
                <SelectItem value="receita">Nova Receita</SelectItem>
                <SelectItem value="animal">Novo Animal / Lote</SelectItem>
                <SelectItem value="movimentacao">Movimentação de Estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descrição / Identificação</Label>
            <Input id="desc" placeholder="Ex: Compra de Sal Mineral" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">Valor ou Quantidade</Label>
            <Input id="valor" type="number" placeholder="Ex: 1500.00" />
          </div>
          <Button onClick={handleSave} className="w-full mt-2">
            Salvar Registro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
