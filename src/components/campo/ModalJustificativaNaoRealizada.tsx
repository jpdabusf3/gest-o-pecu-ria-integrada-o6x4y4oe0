import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { MOTIVOS_NAO_REALIZADA_OPTIONS, MotivoNaoRealizada } from '@/services/historicoStatus'
import { AtividadeRecord } from '@/services/atividades'

interface ModalJustificativaNaoRealizadaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  atividade: AtividadeRecord | null
  onConfirm: (motivo: MotivoNaoRealizada | string, detalhes: string) => void
}

export function ModalJustificativaNaoRealizada({
  open,
  onOpenChange,
  atividade,
  onConfirm,
}: ModalJustificativaNaoRealizadaProps) {
  const [motivo, setMotivo] = useState<string>('')
  const [detalhes, setDetalhes] = useState<string>('')
  const [erroValidacao, setErroValidacao] = useState<string>('')

  if (!atividade) return null

  const handleSalvar = () => {
    if (!motivo) {
      setErroValidacao('Selecione uma justificativa obrigatória para registrar.')
      return
    }

    if (motivo === 'outro' && !detalhes.trim()) {
      setErroValidacao('Por favor, especifique o motivo no campo de texto livre.')
      return
    }

    setErroValidacao('')
    onConfirm(motivo, detalhes.trim())
    setMotivo('')
    setDetalhes('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">Justificar: Não Realizado</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            A atividade <strong>"{atividade.titulo}"</strong> não pôde ser executada. A
            justificativa é obrigatória para prestação de contas e replanejamento do gestor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {erroValidacao && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 text-rose-600 text-xs font-semibold border border-rose-500/30">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{erroValidacao}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Selecione o Motivo Principal *
            </Label>
            <RadioGroup
              value={motivo}
              onValueChange={(val) => {
                setMotivo(val)
                setErroValidacao('')
              }}
              className="space-y-2"
            >
              {MOTIVOS_NAO_REALIZADA_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    motivo === opt.id
                      ? 'border-rose-500 bg-rose-500/10 font-semibold text-rose-950 dark:text-rose-100'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <RadioGroupItem value={opt.id} id={opt.id} />
                  <span className="text-sm flex-1">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">
              Observações adicionais / Detalhamento{' '}
              {motivo === 'outro' ? '(Obrigatório)' : '(Opcional)'}
            </Label>
            <Textarea
              rows={3}
              placeholder="Ex: Curral alagado após tempestade matinal; aguardando escoamento..."
              value={detalhes}
              onChange={(e) => {
                setDetalhes(e.target.value)
                if (erroValidacao) setErroValidacao('')
              }}
              className="text-sm"
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
            className="h-11 text-sm bg-rose-600 hover:bg-rose-700 text-white font-semibold flex-1 sm:flex-none"
            onClick={handleSalvar}
          >
            Confirmar Não Realizado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
