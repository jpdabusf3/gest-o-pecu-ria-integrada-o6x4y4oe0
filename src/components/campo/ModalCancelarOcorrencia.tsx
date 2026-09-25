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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, Ban, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { OcorrenciaRecord, cancelarOcorrencia } from '@/services/ocorrencias'

interface ModalCancelarOcorrenciaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ocorrencia: OcorrenciaRecord | null
  usuario: {
    id: string
    name: string
    role: string
  }
  onSuccess?: () => void
}

export function ModalCancelarOcorrencia({
  open,
  onOpenChange,
  ocorrencia,
  usuario,
  onSuccess,
}: ModalCancelarOcorrenciaProps) {
  const { toast } = useToast()
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleConfirmarCancelamento = async () => {
    if (!ocorrencia) return
    if (!motivo.trim() || motivo.trim().length < 5) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Informe o motivo do cancelamento (mínimo 5 caracteres).',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      await cancelarOcorrencia({
        id: ocorrencia.id,
        usuario_id: usuario.id,
        usuario_nome: usuario.name,
        perfil: usuario.role,
        motivo_cancelamento: motivo.trim(),
      })

      toast({
        title: 'Ocorrência Cancelada Logicamente',
        description:
          'O registro foi invalidado com motivo gravado na trilha de auditoria. Nada foi apagado.',
      })

      if (onSuccess) onSuccess()
      onOpenChange(false)
      setMotivo('')
    } catch (err: any) {
      toast({
        title: 'Erro ao cancelar',
        description: err?.message || 'Falha ao cancelar ocorrência.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!ocorrencia) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Exclusão Lógica / Cancelamento</DialogTitle>
              <DialogDescription className="text-xs">
                Ocorrência: {ocorrencia.tipo} • ID: {ocorrencia.id.slice(-6)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl space-y-1 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Princípio de Imutabilidade
            </div>
            <p>
              Nada é apagado fisicamente do banco de dados. O status mudará para "cancelada",
              carimbando seu usuário e o motivo obrigatório na Trilha de Auditoria.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Motivo do Cancelamento <span className="text-destructive">*</span>
            </Label>
            <Textarea
              rows={3}
              placeholder="Descreva obrigatoriamente por que esta ocorrência está sendo cancelada..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmarCancelamento}
            disabled={submitting}
            className="gap-2 font-bold"
          >
            <Ban className="h-4 w-4" />
            {submitting ? 'Cancelando...' : 'Confirmar Cancelamento Lógico'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
