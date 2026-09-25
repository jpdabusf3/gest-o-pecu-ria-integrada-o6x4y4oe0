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
import { Textarea } from '@/components/ui/textarea'
import { Hourglass } from 'lucide-react'
import { AtividadeRecord } from '@/services/atividades'

interface ModalEmAndamentoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  atividade: AtividadeRecord | null
  onConfirm: (progresso: string) => void
}

export function ModalEmAndamento({
  open,
  onOpenChange,
  atividade,
  onConfirm,
}: ModalEmAndamentoProps) {
  const [progresso, setProgresso] = useState<string>('')

  useEffect(() => {
    if (atividade?.progresso_observacoes) {
      setProgresso(atividade.progresso_observacoes)
    } else {
      setProgresso('')
    }
  }, [atividade])

  if (!atividade) return null

  const handleSalvar = () => {
    onConfirm(progresso.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <Hourglass className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">Marcar: Em Andamento</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Para atividades iniciadas que demandam mais tempo ou múltiplos dias (ex.: apartação de 2
            dias). Salve parcialmente agora e conclua mais tarde.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">
              Progresso / Observações Parciais (Opcional)
            </Label>
            <Textarea
              rows={4}
              placeholder="Ex: Apartadas 120 de 250 cabeças hoje. Restante será conduzido amanhã cedo..."
              value={progresso}
              onChange={(e) => setProgresso(e.target.value)}
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
            className="h-11 text-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold flex-1 sm:flex-none"
            onClick={handleSalvar}
          >
            Salvar Em Andamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
