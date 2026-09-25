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
import { Badge } from '@/components/ui/badge'
import { KeyRound, Copy, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  MembroEquipeRecord,
  redefinirSenhaColaborador,
  gerarSenhaTemporaria,
} from '@/services/equipe'
import { registrarAuditLog, getDispositivoId } from '@/services/auditoria'

interface ModalRedefinirSenhaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  membro: MembroEquipeRecord | null
  usuarioGestor: {
    id: string
    name: string
    role: string
  }
  onSuccess?: () => void
}

export function ModalRedefinirSenha({
  open,
  onOpenChange,
  membro,
  usuarioGestor,
  onSuccess,
}: ModalRedefinirSenhaProps) {
  const { toast } = useToast()
  const [senhaCustomizada, setSenhaCustomizada] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resultado, setResultado] = useState<{
    senhaTemporaria: string
    mensagemWhatsApp: string
  } | null>(null)

  const handleGerarAutomatica = () => {
    setSenhaCustomizada(gerarSenhaTemporaria())
  }

  const handleConfirmarRedefinicao = async () => {
    if (!membro) return
    try {
      setSubmitting(true)
      const res = await redefinirSenhaColaborador({
        membroId: membro.id,
        novaSenhaTemporaria: senhaCustomizada.trim() || undefined,
        gestorId: usuarioGestor.id,
        gestorNome: usuarioGestor.name,
        gestorPerfil: usuarioGestor.role,
      })

      // Registrar evento na Trilha de Auditoria (APPEND-ONLY)
      await registrarAuditLog({
        evento_id: crypto.randomUUID(),
        tipo_evento: 'redefinicao_senha',
        usuario_id: usuarioGestor.id,
        usuario_nome: usuarioGestor.name,
        perfil: usuarioGestor.role,
        referencia_tipo: 'equipe',
        referencia_id: membro.id,
        payload_antes: { primeiro_acesso: membro.primeiro_acesso },
        payload_depois: {
          primeiro_acesso: true,
          redefinido_em: new Date().toISOString(),
          membro_nome: membro.nome,
          membro_cpf: membro.cpf,
        },
        motivo: `Redefinição de senha temporária solicitada para o colaborador ${membro.nome}`,
        origem: 'online',
        dispositivo_id: getDispositivoId(),
      })

      setResultado({
        senhaTemporaria: res.senhaTemporaria,
        mensagemWhatsApp: res.mensagemWhatsApp,
      })

      toast({
        title: 'Senha Redefinida!',
        description: `Nova senha temporária gerada para ${membro.nome}. Ação gravada na auditoria.`,
      })

      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao redefinir',
        description: err?.message || 'Falha ao redefinir senha do colaborador.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopiarWhatsApp = () => {
    if (!resultado) return
    navigator.clipboard.writeText(resultado.mensagemWhatsApp)
    toast({
      title: 'Mensagem Copiada!',
      description: 'Texto pronto para envio no WhatsApp do colaborador.',
    })
  }

  const handleFechar = () => {
    setResultado(null)
    setSenhaCustomizada('')
    onOpenChange(false)
  }

  if (!membro) return null

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Redefinir Senha do Colaborador</DialogTitle>
              <DialogDescription className="text-xs">
                {membro.nome} • CPF: {membro.cpf}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-center space-y-1">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                Senha Temporária Ativada
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                O colaborador deverá obrigatoriamente trocar a senha no próximo login.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl border space-y-2">
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">
                Nova Senha Temporária:
              </span>
              <div className="flex items-center justify-between bg-background p-2.5 rounded-lg border">
                <span className="font-mono text-lg font-black text-primary">
                  {resultado.senhaTemporaria}
                </span>
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                  Troca obrigatória
                </Badge>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleCopiarWhatsApp}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10"
                >
                  <Copy className="h-4 w-4" /> Copiar Mensagem de Acesso (WhatsApp)
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" onClick={handleFechar} className="w-full">
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                Segurança & Trilha de Auditoria
              </div>
              <p>
                Ao redefinir, a senha atual é invalidada. Uma nova senha temporária será exigida e a
                ação fica carimbada na trilha de auditoria com seu usuário ({usuarioGestor.name}).
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Nova Senha Temporária</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary gap-1"
                  onClick={handleGerarAutomatica}
                >
                  <RefreshCw className="h-3 w-3" /> Gerar Aleatória
                </Button>
              </div>
              <Input
                type="text"
                placeholder="Ex: F3@8K92X (deixe em branco para auto)"
                value={senhaCustomizada}
                onChange={(e) => setSenhaCustomizada(e.target.value)}
                className="font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                Mínimo 6 caracteres. Se deixar em branco, o sistema gera automaticamente.
              </span>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={handleFechar} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmarRedefinicao}
                disabled={submitting}
                className="gap-2 bg-primary font-bold"
              >
                <KeyRound className="h-4 w-4" />
                {submitting ? 'Gravando...' : 'Confirmar e Gerar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
