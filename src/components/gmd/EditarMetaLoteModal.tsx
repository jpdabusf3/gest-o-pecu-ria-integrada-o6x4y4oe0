import { useState, useEffect } from 'react'
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
import { Target, Sparkles, Info } from 'lucide-react'
import { LotRecord } from '@/services/lots'
import { atualizarMetaLote } from '@/services/gmdAlertas'
import {
  getConfigBenchmarks,
  ConfigBenchmarkRecord,
  getGmdAlvoPadraoFase,
} from '@/services/configBenchmark'
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
  const [benchmarks, setBenchmarks] = useState<ConfigBenchmarkRecord[]>([])
  const [gmdAlvoKg, setGmdAlvoKg] = useState<string>(
    lote?.gmd_alvo_g_dia
      ? (lote.gmd_alvo_g_dia > 15 ? lote.gmd_alvo_g_dia / 1000 : lote.gmd_alvo_g_dia).toFixed(2)
      : '1.30',
  )
  const [faseAtual, setFaseAtual] = useState<LotRecord['fase_atual']>(lote?.fase_atual || 'engorda')
  const [frente, setFrente] = useState<LotRecord['frente']>(
    lote?.frente || (lote?.sector as any) || 'engorda',
  )
  const [isArrendamento, setIsArrendamento] = useState<boolean>(lote?.is_arrendamento || false)
  const [rendimentoCarcaca, setRendimentoCarcaca] = useState<string>(
    lote?.rendimento_carcaca_pct ? String(lote.rendimento_carcaca_pct) : '54.0',
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getConfigBenchmarks().then(setBenchmarks)
  }, [])

  // Quando abre com um novo lote, sincronizar
  const handleOpen = (val: boolean) => {
    if (val && lote) {
      const valKg = lote.gmd_alvo_g_dia
        ? lote.gmd_alvo_g_dia > 15
          ? (lote.gmd_alvo_g_dia / 1000).toFixed(2)
          : lote.gmd_alvo_g_dia.toFixed(2)
        : lote.fase_atual === 'recria'
          ? '0.50'
          : '1.30'
      setGmdAlvoKg(valKg)
      setFaseAtual(lote.fase_atual || 'engorda')
      setFrente(lote.frente || (lote.sector as any) || 'engorda')
      setIsArrendamento(lote.is_arrendamento || false)
      setRendimentoCarcaca(
        lote.rendimento_carcaca_pct ? String(lote.rendimento_carcaca_pct) : '54.0',
      )
    }
    onOpenChange(val)
  }

  const isCria = faseAtual === 'cria'
  const benchmarkInfo = getGmdAlvoPadraoFase(faseAtual, benchmarks)

  if (!lote) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetKg = isCria ? 0 : parseFloat(gmdAlvoKg)
    if (!isCria && (isNaN(targetKg) || targetKg <= 0)) {
      toast({
        title: 'Meta Inválida',
        description: 'Informe um valor numérico em kg/dia (ex: 1.30 kg/dia).',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      // Mantém gmd_alvo_g_dia: armazenamos em kg/dia (ou valor normalizado)
      await atualizarMetaLote(lote.id, {
        gmd_alvo_g_dia: isCria ? 0 : targetKg,
        fase_atual: faseAtual,
        frente: isArrendamento ? 'arrendamento' : frente,
        is_arrendamento: isArrendamento,
        rendimento_carcaca_pct: parseFloat(rendimentoCarcaca) || 54.0,
      })

      toast({
        title: 'Plano Alimentar Atualizado',
        description: isCria
          ? 'Fase de cria salva (avaliação por desmame, sem GMD).'
          : `Meta de GMD ajustada para ${targetKg.toFixed(2)} kg/dia na fase ${faseAtual?.toUpperCase()}.`,
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
                if (val === 'cria') setGmdAlvoKg('0.60')
                else if (val === 'recria') setGmdAlvoKg('0.75')
                else if (val === 'engorda') setGmdAlvoKg('1.10')
                else if (val === 'tip_rip') setGmdAlvoKg('1.25')
                else if (val === 'confinamento') setGmdAlvoKg('1.50')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a fase..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cria">Cria (Bezerros / Matrizes)</SelectItem>
                <SelectItem value="recria">Recria a Pasto (RIP)</SelectItem>
                <SelectItem value="engorda">Engorda / Terminação a Pasto</SelectItem>
                <SelectItem value="tip_rip">TIP (Terminação Intensiva a Pasto)</SelectItem>
                <SelectItem value="confinamento">Confinamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calibração Exagro */}
          {isCria ? (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Metodologia Exagro — Fase de Cria</span>
              </div>
              <p>
                Lotes de cria não utilizam GMD alvo. A avaliação é realizada por{' '}
                <strong>taxa de desmame (%)</strong> e{' '}
                <strong>kg de bezerro desmamado por matriz exposta</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {benchmarkInfo.gmdKgDia !== null && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Referência Exagro ({faseAtual?.toUpperCase()}):</span>
                    <strong className="font-mono text-emerald-700 dark:text-emerald-300">
                      {benchmarkInfo.gmdKgDia.toFixed(2)} kg/dia
                    </strong>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] border-emerald-500/30 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => {
                      if (benchmarkInfo.gmdKgDia !== null) {
                        setGmdAlvoKg(benchmarkInfo.gmdKgDia.toFixed(2))
                      }
                    }}
                  >
                    Usar Alvo Exagro
                  </Button>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">GMD Alvo Projetado (kg/dia) *</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    Unidade oficial: kg/dia
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="3.0"
                  required={!isCria}
                  value={gmdAlvoKg}
                  onChange={(e) => setGmdAlvoKg(e.target.value)}
                  className="h-11 font-mono text-lg font-bold"
                  placeholder="Ex: 1,30"
                />
                <p className="text-[11px] text-muted-foreground">
                  GMD alvo em kg/dia calibrado pelo benchmarking Exagro (Engorda: 1,30 kg/dia;
                  Recria RIP: 0,50 kg/dia).
                </p>
              </div>
            </div>
          )}

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
