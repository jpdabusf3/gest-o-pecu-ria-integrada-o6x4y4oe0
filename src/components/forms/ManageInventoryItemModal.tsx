import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
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
import { useFarm, InventoryItem } from '@/contexts/FarmContext'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit } from 'lucide-react'

export function ManageInventoryItemModal({ item }: { item?: InventoryItem }) {
  const isEdit = !!item
  const [open, setOpen] = useState(false)
  const { addInventoryItem, updateInventoryItem } = useFarm()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    item: item?.item || '',
    tipo: item?.tipo || 'Suplemento',
    qtd: item?.qtd?.toString() || '0',
    minQtd: item?.minQtd?.toString() || '0',
    unidade: item?.unidade || 'kg',
    status: item?.status || 'Normal',
    custoUnitario: item?.custoUnitario?.toString() || '0',
  })

  useEffect(() => {
    if (item) {
      setFormData({
        item: item.item,
        tipo: item.tipo,
        qtd: item.qtd.toString(),
        minQtd: item.minQtd.toString(),
        unidade: item.unidade,
        status: item.status,
        custoUnitario: item.custoUnitario?.toString() || '0',
      })
    }
  }, [item])

  const handleSave = () => {
    const payload = {
      item: formData.item,
      tipo: formData.tipo,
      qtd: Number(formData.qtd),
      minQtd: Number(formData.minQtd),
      unidade: formData.unidade,
      status: Number(formData.qtd) <= Number(formData.minQtd) ? 'Crítico' : 'Normal',
      custoUnitario: Number(formData.custoUnitario),
    }

    if (isEdit) {
      updateInventoryItem(item!.id, payload)
      toast({ title: 'Item atualizado', description: 'O insumo foi atualizado no estoque.' })
    } else {
      addInventoryItem(payload)
      toast({
        title: 'Item adicionado',
        description: 'O novo insumo foi registrado no estoque.',
      })
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            title="Editar Insumo"
          >
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Novo Insumo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Insumo' : 'Adicionar Novo Insumo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Item</Label>
            <Input
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Suplemento">Suplemento</SelectItem>
                  <SelectItem value="Concentrado">Concentrado</SelectItem>
                  <SelectItem value="Biológico">Biológico</SelectItem>
                  <SelectItem value="Antiparasitário">Antiparasitário</SelectItem>
                  <SelectItem value="Material Cerca">Material Cerca</SelectItem>
                  <SelectItem value="Sêmen">Sêmen</SelectItem>
                  <SelectItem value="Hormônio">Hormônio</SelectItem>
                  <SelectItem value="Fármaco Reprodutivo">Fármaco Reprodutivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input
                value={formData.unidade}
                onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                placeholder="ex: kg, Frascos, Doses"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Qtd Atual</Label>
              <Input
                type="number"
                value={formData.qtd}
                onChange={(e) => setFormData({ ...formData, qtd: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Qtd Mínima</Label>
              <Input
                type="number"
                value={formData.minQtd}
                onChange={(e) => setFormData({ ...formData, minQtd: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Unit. (R$)</Label>
              <Input
                type="number"
                value={formData.custoUnitario}
                onChange={(e) => setFormData({ ...formData, custoUnitario: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full mt-2">
            Salvar Insumo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
