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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Utensils, Wheat } from 'lucide-react'
import { AlertaGMDRecord, resolverAlertaGMD } from '@/services/gmdAlertas'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { format, parseISO } from 'date-fns'
import { obterDiagnosticoLote, DiagnosticoLoteResult } from '@/services/diagnosticoLote'

interface ResolverAlertaModalProps {
  alerta: AlertaGMDRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialCausa?: string
  initialContramedida?: string
}

export function ResolverAlertaModal({
  alerta,
  open,
  onOpenChange,
  onSuccess,
}: ResolverAlertaModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [causa, setCausa] = useState('')
  const [contramedida, setContramedida] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [diagnostico, setDiagnostico] = useState<DiagnosticoLoteResult | null>(null)
  const [carregandoDiagnostico, setCarregandoDiagnostico] = useState(false)

  useEffect(() => {
    if (alerta && open) {
      setCausa(alerta.causa || '')
      setContramedida(alerta.contramedida || '')
      setCarregandoDiagnostico(true)
      const loteId = alerta.lote_id
      obterDiagnosticoLote(loteId)
        .then((diag) => {
          setDiagnostico(diag)
          // Se campos vazios, pré-preencher com a causa provável
          if (!alerta.causa && diag?.sugestaoCausaPreenchimento) {
            setCausa(diag.sugestaoCausaPreenchimento)
          }
          if (!alerta.contramedida && diag?.sugestaoContramedidaPreenchimento) {
            setContramedida(diag.sugestaoContramedidaPreenchimento)
          }
        })
        .finally(() => setCarregandoDiagnostico(false))
    }
  }, [alerta, open])

  if (!alerta) return null

  const handleResolver = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!causa.trim()) {
      toast({
        title: 'Causa Obrigatória',
        description: 'Informe o diagnóstico da causa do desvio nutricional ou de manejo.',
        variant: 'destructive',
      })
      return
    }

    if (!contramedida.trim()) {
      toast({
        title: 'Contramedida Obrigatória',
        description: 'Informe a ação corretiva recomendada (ex: ajuste de formulação ou rotação).',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      await resolverAlertaGMD(alerta.id, causa, contramedida, user?.name || 'Gestor Nutricional')
      toast({
        title: 'Alerta Resolvido',
        description: 'Causa e contramedida registradas com sucesso no histórico.',
      })
      setCausa('')
      setContramedida('')
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao Resolver',
        description: err?.message || 'Falha ao salvar a resolução do alerta.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <DialogTitle>Plano de Ação Corretiva: Alerta GMD</DialogTitle>
          </div>
          <DialogDescription>
            Lote com desvio persistente crítico ({alerta.desvio_pct.toFixed(1)}% abaixo da meta).
            Preencha a causa e contramedida para registrar a decisão técnica.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleResolver} className="space-y-4 py-2">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between font-semibold">
              <span>Lote: {alerta.expand?.lote_id?.name || alerta.lote_id}</span>
              <span className="text-destructive">Desvio: {alerta.desvio_pct.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                GMD Real:{' '}
                {alerta.gmd_real
                  ? alerta.gmd_real > 10
                    ? (alerta.gmd_real / 1000).toFixed(2)
                    : alerta.gmd_real.toFixed(2)
                  : '-'}{' '}
                kg/dia
              </span>
              <span>
                GMD Meta:{' '}
                {alerta.gmd_alvo
                  ? alerta.gmd_alvo > 10
                    ? (alerta.gmd_alvo / 1000).toFixed(2)
                    : alerta.gmd_alvo.toFixed(2)
                  : '-'}{' '}
                kg/dia
              </span>
            </div>
            <div className="text-muted-foreground pt-1">
              Data da Ocorrência: {alerta.data ? format(parseISO(alerta.data), 'dd/MM/yyyy') : '-'}
            </div>
          </div>

          {/* Caixa de Sugestão Automática de Causa */}
          {diagnostico && (
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Diagnóstico Automático: Causa Provável Sugerida
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-background border-indigo-300 font-semibold uppercase"
                >
                  {diagnostico.tituloCausaProvavel}
                </Badge>
              </div>
              <p className="text-xs text-indigo-950 dark:text-indigo-100">{diagnostico.racional}</p>

              {/* Botões de 1 toque para adotar hipóteses */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {diagnostico.hipoteses.map((hip) => (
                  <Button
                    key={hip.categoria}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 gap-1 bg-background hover:bg-indigo-100 dark:hover:bg-indigo-900"
                    onClick={() => {
                      setCausa(hip.sugestaoCausa)
                      setContramedida(hip.sugestaoContramedida)
                      toast({
                        title: 'Sugestão Adotada',
                        description: `Causa e contramedida preenchidas para a hipótese de ${hip.categoria}.`,
                      })
                    }}
                  >
                    <span>
                      Adotar {hip.categoria} ({hip.probabilidade}%)
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Causa Identificada *</Label>
              <span className="text-[11px] text-muted-foreground">Editável</span>
            </div>
            <Textarea
              required
              rows={3}
              placeholder="Ex: Oferta de forragem abaixo da massa crítica esperada; consumo insuficiente do proteinado por espaçamento de cocho; infestação por ectoparasitas..."
              value={causa}
              onChange={(e) => setCausa(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Contramedida Adotada / Recomendação *</Label>
            <Textarea
              required
              rows={3}
              placeholder="Ex: Troca para suplementação com maior aporte energético (0.3% PV); rotação antecipada de piquete; repasse sanitário com antiparasitário injetável..."
              value={contramedida}
              onChange={(e) => setContramedida(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Gravando...' : 'Resolver Alerta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
