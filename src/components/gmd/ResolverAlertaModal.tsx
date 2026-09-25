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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { AlertaGMDRecord, resolverAlertaGMD } from '@/services/gmdAlertas'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { format, parseISO } from 'date-fns'

interface ResolverAlertaModalProps {
  alerta: AlertaGMDRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
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
              <span>GMD Real: {alerta.gmd_real || '-'} g/dia</span>
              <span>GMD Meta: {alerta.gmd_alvo || '-'} g/dia</span>
            </div>
            <div className="text-muted-foreground pt-1">
              Data da Ocorrência: {alerta.data ? format(parseISO(alerta.data), 'dd/MM/yyyy') : '-'}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Causa Identificada *</Label>
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
