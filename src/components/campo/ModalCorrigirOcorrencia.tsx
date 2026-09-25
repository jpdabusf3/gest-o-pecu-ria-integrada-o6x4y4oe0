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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Edit3, CheckCircle2, History } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { OcorrenciaRecord, corrigirOcorrencia } from '@/services/ocorrencias'

interface ModalCorrigirOcorrenciaProps {
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

export function ModalCorrigirOcorrencia({
  open,
  onOpenChange,
  ocorrencia,
  usuario,
  onSuccess,
}: ModalCorrigirOcorrenciaProps) {
  const { toast } = useToast()
  const [camposEditados, setCamposEditados] = useState<Record<string, any>>({})
  const [motivoCorrecao, setMotivoCorrecao] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Ao abrir, clonar os campos específicos atuais
  const handleOpenInit = () => {
    if (ocorrencia) {
      setCamposEditados({ ...(ocorrencia.campos_especificos || {}) })
      setMotivoCorrecao('')
    }
  }

  const handleSalvarCorrecao = async () => {
    if (!ocorrencia) return
    if (!motivoCorrecao.trim() || motivoCorrecao.trim().length < 5) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Descreva a justificativa da correção com no mínimo 5 caracteres.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      await corrigirOcorrencia({
        ocorrenciaOriginalId: ocorrencia.id,
        camposAtualizados: camposEditados,
        usuario_id: usuario.id,
        usuario_nome: usuario.name,
        perfil: usuario.role,
        motivo_correcao: motivoCorrecao.trim(),
      })

      toast({
        title: 'Correção Encadeada Registrada!',
        description:
          'O valor vigente foi atualizado e o evento original permaneceu intacto na auditoria.',
      })

      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao corrigir',
        description: err?.message || 'Falha ao registrar correção.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!ocorrencia) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(op) => {
        if (op) handleOpenInit()
        onOpenChange(op)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Corrigir Valor de Ocorrência</DialogTitle>
              <DialogDescription className="text-xs">
                {ocorrencia.tipo} • Registrada por {ocorrencia.usuario_nome || 'Operador'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <History className="h-4 w-4 text-primary" />
              Princípio de Auditoria: Correção Nunca é Edição
            </div>
            <p className="text-muted-foreground">
              O evento original permanece eternamente intacto na trilha de auditoria. Um novo evento
              de correção será gerado referenciando este registro, e o último valor assume a
              vigência.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold">Editar Valores Operacionais:</Label>
            {Object.entries(ocorrencia.campos_especificos || {}).map(([chave, valorAntigo]) => {
              const valorAtual = camposEditados[chave] ?? valorAntigo
              return (
                <div key={chave} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold capitalize">{chave.replace(/_/g, ' ')}:</span>
                    <span className="text-muted-foreground font-mono">
                      Original: {String(valorAntigo)}
                    </span>
                  </div>
                  <Input
                    type={typeof valorAntigo === 'number' ? 'number' : 'text'}
                    value={valorAtual}
                    onChange={(e) =>
                      setCamposEditados((prev) => ({
                        ...prev,
                        [chave]:
                          typeof valorAntigo === 'number' ? Number(e.target.value) : e.target.value,
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
              )
            })}
          </div>

          <div className="space-y-1.5 pt-2 border-t">
            <Label className="text-xs font-semibold">
              Motivo da Correção <span className="text-destructive">*</span>
            </Label>
            <Textarea
              rows={2}
              placeholder="Ex: Correção de pesagem/quantidade aferida erroneamente pelo vaqueiro..."
              value={motivoCorrecao}
              onChange={(e) => setMotivoCorrecao(e.target.value)}
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
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSalvarCorrecao}
            disabled={submitting}
            className="gap-2 bg-primary font-bold"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? 'Gravando Correção...' : 'Gravar Correção Encadeada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
