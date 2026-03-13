import { useState, useMemo } from 'react'
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
import { Play, Calculator } from 'lucide-react'
import { useFarm } from '@/contexts/FarmContext'
import useFeedMillStore from '@/stores/useFeedMillStore'
import useFinanceStore from '@/stores/useFinanceStore'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatWeight } from '@/lib/utils'

export function RegisterProductionModal() {
  const [open, setOpen] = useState(false)
  const { formulas, addProduction } = useFeedMillStore()
  const { inventory, updateInventoryItem, lots } = useFarm()
  const { addEntry } = useFinanceStore()
  const { toast } = useToast()

  const [formulaId, setFormulaId] = useState('')
  const [amount, setAmount] = useState('')
  const [destType, setDestType] = useState('estoque')
  const [selectedLot, setSelectedLot] = useState('')

  const selectedFormula = useMemo(
    () => formulas.find((f) => f.id === formulaId),
    [formulaId, formulas],
  )

  const preview = useMemo(() => {
    if (!selectedFormula || !amount) return null
    let totalCost = 0
    let hasShortage = false

    const items = selectedFormula.ingredients.map((ing) => {
      const invItem = inventory.find((i) => i.id === ing.inventoryId)
      const reqQty = (Number(amount) * ing.percentage) / 100
      const cost = reqQty * (invItem?.custoUnitario || 0)
      totalCost += cost
      if (invItem && invItem.qtd < reqQty) hasShortage = true

      return {
        name: invItem?.item || 'Desconhecido',
        reqQty,
        available: invItem?.qtd || 0,
        cost,
        unit: invItem?.unidade || 'kg',
        hasShortage: (invItem?.qtd || 0) < reqQty,
      }
    })

    const costPerKg = Number(amount) > 0 ? totalCost / Number(amount) : 0
    return { items, totalCost, costPerKg, hasShortage }
  }, [selectedFormula, amount, inventory])

  const handleSave = () => {
    if (!selectedFormula || !amount) return
    if (destType === 'lote' && !selectedLot) {
      toast({ title: 'Erro', description: 'Selecione o lote de destino.', variant: 'destructive' })
      return
    }

    if (preview?.hasShortage) {
      toast({
        title: 'Aviso',
        description: 'Estoque insuficiente para alguns ingredientes. Os saldos ficarão negativos.',
      })
    }

    // Deduct ingredients
    selectedFormula.ingredients.forEach((ing) => {
      const reqQty = (Number(amount) * ing.percentage) / 100
      const invItem = inventory.find((i) => i.id === ing.inventoryId)
      if (invItem) {
        updateInventoryItem(ing.inventoryId, { qtd: invItem.qtd - reqQty })
      }
    })

    // Log production
    addProduction({
      formulaId: selectedFormula.id,
      formulaName: selectedFormula.name,
      amountProducedKg: Number(amount),
      totalCost: preview!.totalCost,
      costPerKg: preview!.costPerKg,
      destination: destType === 'estoque' ? 'Estoque' : `Lote ${selectedLot}`,
    })

    if (destType === 'estoque') {
      const outItem = inventory.find((i) => i.id === selectedFormula.outputInventoryId)
      if (outItem) {
        const newQtd = outItem.qtd + Number(amount)
        const currentTotalValue = outItem.qtd * (outItem.custoUnitario || 0)
        const newCusto = newQtd > 0 ? (currentTotalValue + preview!.totalCost) / newQtd : 0
        updateInventoryItem(selectedFormula.outputInventoryId, {
          qtd: newQtd,
          custoUnitario: newCusto,
        })
      }
    } else {
      addEntry({
        description: `Produção e Fornecimento: ${selectedFormula.name}`,
        category: 'Nutrição',
        amount: preview!.totalCost,
        type: 'expense',
        loteId: selectedLot,
      })
    }

    toast({
      title: 'Produção Registrada',
      description: 'Estoque de ingredientes deduzido e custos apurados.',
    })
    setOpen(false)
    setAmount('')
    setDestType('estoque')
    setSelectedLot('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Play className="h-4 w-4" /> Registrar Produção
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Registrar Produção de Ração</DialogTitle>
          <DialogDescription>
            Informe a quantidade produzida. O sistema deduzirá os ingredientes e calculará o custo
            final automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fórmula / Receita</Label>
              <Select value={formulaId} onValueChange={setFormulaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {formulas.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Qtd Produzida (kg)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 2000"
              />
            </div>
          </div>

          {preview && (
            <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-3 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" /> Cálculo de Insumos e Custos
              </h4>
              <div className="space-y-1 text-sm">
                {preview.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center border-b border-border/50 pb-1 last:border-0 last:pb-0"
                  >
                    <span className={it.hasShortage ? 'text-destructive font-medium' : ''}>
                      {it.name}
                    </span>
                    <div className="text-right">
                      <span
                        className={`font-mono ${it.hasShortage ? 'text-destructive font-bold' : ''}`}
                      >
                        {formatWeight(it.reqQty, it.unit as any)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        (Disp: {formatWeight(it.available, it.unit as any)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Custo / Kg
                  </div>
                  <div className="font-bold text-primary">{formatCurrency(preview.costPerKg)}</div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Custo / Ton
                  </div>
                  <div className="font-bold text-primary">
                    {formatCurrency(preview.costPerKg * 1000)}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Custo Total
                  </div>
                  <div className="font-bold text-destructive">
                    {formatCurrency(preview.totalCost)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Destino da Produção</Label>
              <Select value={destType} onValueChange={setDestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estoque">Armazenar no Estoque</SelectItem>
                  <SelectItem value="lote">Fornecer para Lote (Cocho)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {destType === 'lote' && (
              <div className="space-y-2 animate-in fade-in">
                <Label>Lote de Destino</Label>
                <Select value={selectedLot} onValueChange={setSelectedLot}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.id} - {l.curral}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <Button onClick={handleSave} className="w-full" disabled={!preview}>
          Confirmar e Deduzir Estoque
        </Button>
      </DialogContent>
    </Dialog>
  )
}
