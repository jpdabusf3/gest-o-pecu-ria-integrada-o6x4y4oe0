import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import useHedgeStore, { HedgePosition } from '@/stores/useHedgeStore'
import { useFarm } from '@/contexts/FarmContext'
import { useToast } from '@/hooks/use-toast'
import { Shield } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillData?: Partial<HedgePosition> | null
}

export function RegisterHedgeModal({ open, onOpenChange, prefillData }: Props) {
  const { addPosition } = useHedgeStore()
  const { lots } = useFarm()
  const { toast } = useToast()

  const [contractCode, setContractCode] = useState('')
  const [type, setType] = useState<'Futuro' | 'Put' | 'Call' | 'Collar'>('Put')
  const [quantityArrobas, setQuantityArrobas] = useState('')
  const [strikePrice, setStrikePrice] = useState('')
  const [premiumPaid, setPremiumPaid] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [expiryDate, setExpiryDate] = useState('')
  const [objective, setObjective] = useState('')
  const [basisLocal, setBasisLocal] = useState('-15')

  // Calculate total projected arrobas for limits validation
  const totalProjectedArrobas = lots.reduce((acc, lot) => {
    const pesoSaida = lot.pesoMedio + lot.gmd * 90 // default 90 days
    // Arrobas de carcaça protegidas = (pesoSaida * 54%) / 15
    return acc + lot.cabecas * ((pesoSaida * 0.54) / 15)
  }, 0)

  useEffect(() => {
    if (open && prefillData) {
      setContractCode(prefillData.contractCode || '')
      setType(prefillData.type || 'Put')
      setQuantityArrobas(prefillData.quantityArrobas?.toString() || '')
      setStrikePrice(prefillData.strikePrice?.toString() || '')
      setPremiumPaid(prefillData.premiumPaid?.toString() || '')
      if (prefillData.expiryDate) setExpiryDate(prefillData.expiryDate)
      if (prefillData.basisLocal !== undefined) setBasisLocal(prefillData.basisLocal.toString())
    } else if (open) {
      // Reset if no prefill
      setContractCode('')
      setType('Put')
      setQuantityArrobas('')
      setStrikePrice('')
      setPremiumPaid('')
      setExpiryDate('')
      setObjective('')
      setBasisLocal('-15')
    }
  }, [open, prefillData])

  const handleSave = () => {
    if (!contractCode || !quantityArrobas || !strikePrice || !expiryDate) return

    const qty = Number(quantityArrobas)

    // Business Rules validation
    if (totalProjectedArrobas > 0) {
      const pct = (qty / totalProjectedArrobas) * 100
      if (pct > 120) {
        toast({
          title: 'Operação Bloqueada',
          description: `O volume de proteção (${pct.toFixed(1)}%) excede o limite de 120% da projeção física.`,
          variant: 'destructive',
        })
        return
      }
      if (pct < 50 || pct > 100) {
        toast({
          title: 'Atenção ao Risco',
          description: `O volume protegido (${pct.toFixed(1)}%) está fora da janela ideal de 50% a 100% da produção física.`,
        })
      }
    }

    addPosition({
      contractCode,
      type,
      quantityArrobas: qty,
      strikePrice: Number(strikePrice),
      premiumPaid: Number(premiumPaid || 0),
      entryDate,
      expiryDate,
      objective,
      basisLocal: Number(basisLocal || 0),
      status: 'Aberto',
    })

    toast({
      title: 'Hedge Registrado',
      description: 'Posição B3 salva no portfólio de risco com sucesso.',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Nova Posição de Hedge
          </DialogTitle>
          <DialogDescription>
            Registre um novo contrato B3. O sistema fará validação automática de limite de volume
            (Max 120%).
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
                  <SelectItem value="Futuro">Contrato Futuro</SelectItem>
                  <SelectItem value="Collar">Estrutura Collar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Volume Protegido (@)</Label>
              <Input
                type="number"
                placeholder="Ex: 3300"
                value={quantityArrobas}
                onChange={(e) => setQuantityArrobas(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Proj. Total: {totalProjectedArrobas.toFixed(0)} @
              </p>
            </div>
            <div className="space-y-2">
              <Label>Vencimento (B3)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Strike Base (R$)</Label>
              <Input
                type="number"
                value={strikePrice}
                onChange={(e) => setStrikePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prêmio / Custo (R$)</Label>
              <Input
                type="number"
                value={premiumPaid}
                onChange={(e) => setPremiumPaid(e.target.value)}
                disabled={type === 'Futuro'}
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

          <div className="space-y-2">
            <Label>Objetivo / Estratégia</Label>
            <Input
              placeholder="Ex: Travar margem do Lote LEN-02"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>

          <Button onClick={handleSave} className="w-full mt-2">
            Confirmar e Registrar Posição
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
