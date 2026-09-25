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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Target, Sparkles, Save, CheckCircle2, RotateCcw } from 'lucide-react'
import {
  IndicadorMetaSafra,
  CONFIG_INDICADORES_METAS,
  getMetasSafra,
  salvarMetasSafra,
  getValoresSugeridosMetas,
  calcularSafraAtual,
} from '@/services/metasSafra'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface ModalDefinirMetasSafraProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  safra?: string
  onMetasSalvas?: () => void
}

export function ModalDefinirMetasSafra({
  open,
  onOpenChange,
  safra,
  onMetasSalvas,
}: ModalDefinirMetasSafraProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const safraAlvo = safra || calcularSafraAtual()

  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sugeridos, setSugeridos] = useState<Record<
    IndicadorMetaSafra,
    {
      valorSugerido: number
      unidade: string
      label: string
      menorMelhor: boolean
      origem: string
    }
  > | null>(null)

  const [valores, setValores] = useState<Record<IndicadorMetaSafra, string>>({
    arroba_ha_ano: '10.0',
    custo_arroba: '199.59',
    margem_ebitda: '17.1',
  })

  const [observacoes, setObservacoes] = useState<Record<IndicadorMetaSafra, string>>({
    arroba_ha_ano: '',
    custo_arroba: '',
    margem_ebitda: '',
  })

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [sug, metasAtuais] = await Promise.all([
        getValoresSugeridosMetas(),
        getMetasSafra(safraAlvo),
      ])

      setSugeridos(sug)

      setValores({
        arroba_ha_ano: metasAtuais.arroba_ha_ano
          ? String(metasAtuais.arroba_ha_ano.valor_alvo)
          : String(sug.arroba_ha_ano?.valorSugerido ?? 10.0),
        custo_arroba: metasAtuais.custo_arroba
          ? String(metasAtuais.custo_arroba.valor_alvo)
          : String(sug.custo_arroba?.valorSugerido ?? 199.59),
        margem_ebitda: metasAtuais.margem_ebitda
          ? String(metasAtuais.margem_ebitda.valor_alvo)
          : String(sug.margem_ebitda?.valorSugerido ?? 17.1),
      })

      setObservacoes({
        arroba_ha_ano: metasAtuais.arroba_ha_ano?.observacoes || '',
        custo_arroba: metasAtuais.custo_arroba?.observacoes || '',
        margem_ebitda: metasAtuais.margem_ebitda?.observacoes || '',
      })
    } catch (err) {
      console.warn('Erro ao carregar metas da safra:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      carregarDados()
    }
  }, [open, safraAlvo])

  const handleAplicarSugerido = (ind: IndicadorMetaSafra) => {
    if (sugeridos && sugeridos[ind]) {
      setValores((prev) => ({
        ...prev,
        [ind]: String(sugeridos[ind].valorSugerido),
      }))
    }
  }

  const handleSalvar = async () => {
    try {
      setSalvando(true)

      const payload = (Object.keys(CONFIG_INDICADORES_METAS) as IndicadorMetaSafra[]).map((ind) => {
        const valNum = parseFloat(valores[ind].replace(',', '.'))
        const valFinal = isNaN(valNum)
          ? (sugeridos?.[ind]?.valorSugerido ?? CONFIG_INDICADORES_METAS[ind].fallbackAlvo)
          : valNum

        return {
          indicador: ind,
          valor_alvo: valFinal,
          observacoes: observacoes[ind],
        }
      })

      await salvarMetasSafra(safraAlvo, payload, user?.id)

      toast({
        title: 'Metas da Safra Salvas',
        description: `Metas para a safra ${safraAlvo} atualizadas com sucesso no banco de dados.`,
      })

      if (onMetasSalvas) onMetasSalvas()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar metas da safra:', err)
      toast({
        title: 'Erro ao salvar metas',
        description: err?.message || 'Verifique os valores informados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Definir Metas da Safra {safraAlvo}</DialogTitle>
              <DialogDescription>
                Estabeleça os alvos de produtividade, custo e margem para alimentar a projeção e o
                fechamento de safra.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert className="py-2.5 text-xs bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription>
              Os valores sugeridos são alimentados dinamicamente pela calibração vigente do{' '}
              <strong>Benchmarking de Mercado</strong> (
              <code className="font-mono">config_benchmark</code>).
            </AlertDescription>
          </Alert>

          {/* Grid dos 3 Indicadores Obrigatórios */}
          {(Object.keys(CONFIG_INDICADORES_METAS) as IndicadorMetaSafra[]).map((ind) => {
            const cfg = CONFIG_INDICADORES_METAS[ind]
            const sug = sugeridos?.[ind]

            return (
              <div
                key={ind}
                className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-colors space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{cfg.label}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {cfg.unidade}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{cfg.descricao}</p>
                  </div>

                  {sug && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAplicarSugerido(ind)}
                      className="h-7 text-[11px] gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 shrink-0"
                      title="Usar valor calibrado no benchmarking"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Sugerido: {sug.valorSugerido.toLocaleString('pt-BR')}
                    </Button>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Valor Alvo ({cfg.unidade}) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={valores[ind]}
                      onChange={(e) => setValores((prev) => ({ ...prev, [ind]: e.target.value }))}
                      className="h-10 font-mono font-bold text-base text-foreground"
                      placeholder={`Ex: ${sug?.valorSugerido || cfg.fallbackAlvo}`}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Observação / Justificativa Estratégica
                    </Label>
                    <Input
                      type="text"
                      value={observacoes[ind]}
                      onChange={(e) =>
                        setObservacoes((prev) => ({ ...prev, [ind]: e.target.value }))
                      }
                      placeholder="Ex: Foco em intensificação com TIP na seca"
                      className="h-10 text-xs"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || loading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {salvando ? (
              'Salvando Metas...'
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Metas da Safra {safraAlvo}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
