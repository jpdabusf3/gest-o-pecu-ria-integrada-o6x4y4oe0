import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch'
import { Target, Sparkles } from 'lucide-react'
import { LotRecord } from '@/services/lots'
import { atualizarMetaLote } from '@/services/gmdAlertas'
import { useToast } from '@/hooks/use-toast'

interface EditarMetaLoteModalProps {
  lote: LotRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditarMetaLoteModal({
  lote,
  open,
  onOpenChange,
  onSuccess,
}: EditarMetaLoteModalProps) {
  const { toast } = useToast()
  const [gmdAlvoG, setGmdAlvoG] = useState<string>(
    lote?.gmd_alvo_g_dia ? String(lote.gmd_alvo_g_dia) : '900',
  )
  const [faseAtual, setFaseAtual] = useState<LotRecord['fase_atual']>(lote?.fase_atual || 'recria')
  const [frente, setFrente] = useState<LotRecord['frente']>(
    lote?.frente || (lote?.sector as any) || 'recria',
  )
  const [isArrendamento, setIsArrendamento] = useState<boolean>(lote?.is_arrendamento || false)
  const [rendimentoCarcaca, setRendimentoCarcaca] = useState<string>(
    lote?.rendimento_carcaca_pct ? String(lote.rendimento_carcaca_pct) : '53.5',
  )
  const [saving, setSaving] = useState(false)

  // Quando abre com um novo lote, sincronizar
  const handleOpen = (val: boolean) => {
    if (val && lote) {
      setGmdAlvoG(lote.gmd_alvo_g_dia ? String(lote.gmd_alvo_g_dia) : '900')
      setFaseAtual(lote.fase_atual || 'recria')
      setFrente(lote.frente || (lote.sector as any) || 'recria')
      setIsArrendamento(lote.is_arrendamento || false)
      setRendimentoCarcaca(
        lote.rendimento_carcaca_pct ? String(lote.rendimento_carcaca_pct) : '53.5',
      )
    }
    onOpenChange(val)
  }

  if (!lote) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetNum = parseInt(gmdAlvoG, 10)
    if (isNaN(targetNum) || targetNum <= 0) {
      toast({
        title: 'Meta Inválida',
        description: 'Informe um valor numérico em g/dia (ex: 850 para 0,85 kg/dia).',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      await atualizarMetaLote(lote.id, {
        gmd_alvo_g_dia: targetNum,
        fase_atual: faseAtual,
        frente: isArrendamento ? 'arrendamento' : frente,
        is_arrendamento: isArrendamento,
        rendimento_carcaca_pct: parseFloat(rendimentoCarcaca) || 53.5,
      })

      toast({
        title: 'Plano Alimentar Atualizado',
        description: `Meta de GMD ajustada para ${targetNum} g/dia na fase ${faseAtual?.toUpperCase()}.`,
      })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Meta',
        description: err?.message || 'Falha ao atualizar parâmetros de GMD.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-5 w-5" />
            <DialogTitle>Plano Alimentar & Meta de GMD</DialogTitle>
          </div>
          <DialogDescription>
            Defina o GMD alvo do lote {lote.name} por fase produtiva e revise a cada mudança de
            suplemento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="font-semibold">Fase Produtiva Atual</Label>
            <Select
              value={faseAtual}
              onValueChange={(val: any) => {
                setFaseAtual(val)
                // Sugestão automática padrão de mercado / plano nutricional
                if (val === 'cria') setGmdAlvoG('600')
                else if (val === 'recria') setGmdAlvoG('750')
                else if (val === 'engorda') setGmdAlvoG('1100')
                else if (val === 'tip_rip') setGmdAlvoG('1250')
                else if (val === 'confinamento') setGmdAlvoG('1500')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a fase..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cria">Cria (Bezerros / Matrizes)</SelectItem>
                <SelectItem value="recria">Recria a Pasto</SelectItem>
                <SelectItem value="engorda">Engorda / Terminação Pasto</SelectItem>
                <SelectItem value="tip_rip">TIP / RIP (Terminação Intensiva)</SelectItem>
                <SelectItem value="confinamento">Confinamento Grão Inteiro / Silagem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="font-semibold">GMD Alvo Projetado (g/dia) *</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {(parseInt(gmdAlvoG, 10) || 0) / 1000} kg/cab/dia
              </span>
            </div>
            <Input
              type="number"
              step="10"
              min="100"
              max="2500"
              required
              value={gmdAlvoG}
              onChange={(e) => setGmdAlvoG(e.target.value)}
              className="h-11 font-mono text-lg font-bold"
              placeholder="Ex: 900"
            />
            <p className="text-[11px] text-muted-foreground">
              Define a linha de referência no gráfico de acompanhamento de pesagens.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Frente Operacional</Label>
              <Select
                value={isArrendamento ? 'arrendamento' : frente}
                onValueChange={(val: any) => {
                  setFrente(val)
                  if (val === 'arrendamento') setIsArrendamento(true)
                }}
                disabled={isArrendamento}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cria">Cria</SelectItem>
                  <SelectItem value="recria">Recria</SelectItem>
                  <SelectItem value="engorda">Engorda</SelectItem>
                  <SelectItem value="arrendamento">Arrendamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rendimento Carcaça (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="40"
                max="65"
                value={rendimentoCarcaca}
                onChange={(e) => setRendimentoCarcaca(e.target.value)}
                className="h-10 font-mono"
                placeholder="Ex: 53.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <div>
              <Label className="text-xs font-semibold cursor-pointer">
                Lote em Regime de Arrendamento
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Segrega o lote nos relatórios Exagro (nunca misturado à fazenda própria).
              </p>
            </div>
            <Switch
              checked={isArrendamento}
              onCheckedChange={(val) => {
                setIsArrendamento(val)
                if (val) setFrente('arrendamento')
              }}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Parâmetros'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
