import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CalendarRange, RotateCw } from 'lucide-react'
import { AtividadeRecord, calcularProximoDiaUtil } from '@/services/atividades'
import { getMotivoLabel } from '@/services/historicoStatus'

interface ModalReagendarAtividadeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  atividade: AtividadeRecord | null
  onConfirm: (novaData: string, observacao: string) => void
}

export function ModalReagendarAtividade({
  open,
  onOpenChange,
  atividade,
  onConfirm,
}: ModalReagendarAtividadeProps) {
  const [novaData, setNovaData] = useState<string>('')
  const [observacao, setObservacao] = useState<string>('')

  useEffect(() => {
    if (open) {
      // Sugere +1 dia útil por padrão com 1 toque
      const proximo = calcularProximoDiaUtil(new Date())
      const yyyy = proximo.getFullYear()
      const mm = String(proximo.getMonth() + 1).padStart(2, '0')
      const dd = String(proximo.getDate()).padStart(2, '0')
      setNovaData(`${yyyy}-${mm}-${dd}`)
      setObservacao('')
    }
  }, [open, atividade])

  if (!atividade) return null

  const handleSalvar = () => {
    if (!novaData) return
    onConfirm(novaData, observacao.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <RotateCw className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">Reagendar Atividade</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Reabra a atividade mantendo o histórico de motivos anterior gravado para auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
            <div className="font-semibold text-xs text-foreground">{atividade.titulo}</div>
            {atividade.motivo_nao_realizada && (
              <div className="text-xs text-rose-600 font-medium">
                Motivo anterior: {getMotivoLabel(atividade.motivo_nao_realizada)}
                {atividade.detalhes_motivo && ` (${atividade.detalhes_motivo})`}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nova Data Sugerida (+1 Dia Útil)
            </Label>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="h-11 text-base font-semibold"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Data calculada automaticamente pulando finais de semana. Altere se desejar.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">
              Nota de Reagendamento (Opcional)
            </Label>
            <Input
              placeholder="Ex: Reagendado após confirmação de entrega do insumo..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 text-sm flex-1 sm:flex-none"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11 text-sm font-semibold flex-1 sm:flex-none"
            onClick={handleSalvar}
          >
            Confirmar Reagendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
