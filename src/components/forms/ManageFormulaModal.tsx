import { useState, useEffect } from 'react'
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
import { Plus, Trash2, Edit } from 'lucide-react'
import { useFarm } from '@/contexts/FarmContext'
import useFeedMillStore, { FeedFormula } from '@/stores/useFeedMillStore'
import { useToast } from '@/hooks/use-toast'

export function ManageFormulaModal({ formula }: { formula?: FeedFormula }) {
  const [open, setOpen] = useState(false)
  const { inventory } = useFarm()
  const { saveFormula } = useFeedMillStore()
  const { toast } = useToast()

  const [name, setName] = useState(formula?.name || '')
  const [outputInventoryId, setOutputInventoryId] = useState(formula?.outputInventoryId || '')
  const [ingredients, setIngredients] = useState<{ inventoryId: string; percentage: string }[]>(
    formula
      ? formula.ingredients.map((i) => ({
          inventoryId: i.inventoryId,
          percentage: String(i.percentage),
        }))
      : [],
  )

  useEffect(() => {
    if (open && formula) {
      setName(formula.name)
      setOutputInventoryId(formula.outputInventoryId)
      setIngredients(
        formula.ingredients.map((i) => ({
          inventoryId: i.inventoryId,
          percentage: String(i.percentage),
        })),
      )
    } else if (open && !formula) {
      setName('')
      setOutputInventoryId('')
      setIngredients([])
    }
  }, [open, formula])

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { inventoryId: '', percentage: '' }])
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (
    index: number,
    field: 'inventoryId' | 'percentage',
    value: string,
  ) => {
    const newIngs = [...ingredients]
    newIngs[index] = { ...newIngs[index], [field]: value }
    setIngredients(newIngs)
  }

  const handleSave = () => {
    if (!name || !outputInventoryId || ingredients.length === 0) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    const totalPercentage =
      Math.round(ingredients.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0) * 100) /
      100
    if (totalPercentage !== 100) {
      toast({
        title: 'Erro',
        description: `A soma das porcentagens deve ser 100%. Atual: ${totalPercentage}%`,
        variant: 'destructive',
      })
      return
    }

    if (ingredients.some((i) => !i.inventoryId)) {
      toast({
        title: 'Erro',
        description: 'Selecione um insumo para todos os ingredientes.',
        variant: 'destructive',
      })
      return
    }

    saveFormula(
      {
        name,
        outputInventoryId,
        ingredients: ingredients.map((i) => ({
          inventoryId: i.inventoryId,
          percentage: Number(i.percentage),
        })),
      },
      formula?.id,
    )

    toast({ title: 'Fórmula Salva', description: 'Receita atualizada com sucesso no sistema.' })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {formula ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
          >
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="secondary" className="gap-2">
            <Plus className="h-4 w-4" /> Nova Fórmula
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{formula ? 'Editar Fórmula' : 'Nova Fórmula (Receita)'}</DialogTitle>
          <DialogDescription>
            Defina o produto final e a proporção (%) exata de cada insumo. O sistema registrará uma
            nova versão.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label>Nome da Fórmula</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ração Terminação Alto Grão"
            />
          </div>
          <div className="space-y-2">
            <Label>Insumo Produzido (Destino no Estoque)</Label>
            <Select value={outputInventoryId} onValueChange={setOutputInventoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o insumo final" />
              </SelectTrigger>
              <SelectContent>
                {inventory
                  .filter(
                    (i) => ['Suplemento', 'Concentrado'].includes(i.tipo) || i.id.startsWith('N'),
                  )
                  .map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.item}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-2 border-t space-y-3">
            <div className="flex justify-between items-center">
              <Label>Ingredientes (Matérias-Primas)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddIngredient}
                className="h-8 gap-1"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Select
                    value={ing.inventoryId}
                    onValueChange={(v) => handleIngredientChange(idx, 'inventoryId', v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Insumo" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <div className="relative">
                    <Input
                      type="number"
                      value={ing.percentage}
                      onChange={(e) => handleIngredientChange(idx, 'percentage', e.target.value)}
                      className="h-9 pr-6"
                      placeholder="Qtd"
                    />
                    <span className="absolute right-2 top-2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveIngredient(idx)}
                  className="h-9 w-9 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {ingredients.length > 0 && (
              <div className="flex justify-between items-center text-sm pt-2">
                <span className="font-medium">Total:</span>
                <span
                  className={`font-bold ${
                    Math.round(
                      ingredients.reduce((a, c) => a + Number(c.percentage || 0), 0) * 100,
                    ) /
                      100 ===
                    100
                      ? 'text-emerald-600'
                      : 'text-destructive'
                  }`}
                >
                  {Math.round(
                    ingredients.reduce((a, c) => a + Number(c.percentage || 0), 0) * 100,
                  ) / 100}
                  %
                </span>
              </div>
            )}
          </div>
        </div>
        <Button onClick={handleSave} className="w-full">
          {formula ? 'Salvar Nova Versão' : 'Criar Fórmula'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
