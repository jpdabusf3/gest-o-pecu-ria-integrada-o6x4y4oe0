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
import { Lock, LogIn, UserCheck, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { login, isLoadingAuth } = useAuth()
  const { toast } = useToast()

  const [nomeUsuario, setNomeUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeUsuario || !password) return

    try {
      setSubmitting(true)
      await login(nomeUsuario, password)
      toast({
        title: 'Login Realizado com Sucesso!',
        description:
          'Autenticado no PocketBase. As ações agora contêm sua assinatura de auditoria.',
      })
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Falha no Login',
        description: err?.message || 'Nome do usuário ou senha incorretos.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickFill = (quickName: string) => {
    setNomeUsuario(quickName)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <DialogTitle>Autenticação do Sistema</DialogTitle>
          </div>
          <DialogDescription>
            Acesse com o <strong>Nome do usuário</strong> ou <strong>e-mail cadastrado</strong> e
            sua respectiva senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nome do usuário ou E-mail</Label>
            <Input
              type="text"
              value={nomeUsuario}
              onChange={(e) => setNomeUsuario(e.target.value)}
              placeholder="Ex: João Pedro ou Claudio Figueiredo"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="p-3 bg-muted/40 rounded-lg space-y-2 border text-xs">
            <span className="font-semibold text-muted-foreground block">Contas do sistema:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button
                type="button"
                className="text-left text-xs text-primary hover:underline flex justify-between items-center p-1 rounded hover:bg-muted/50"
                onClick={() => handleQuickFill('João Pedro')}
              >
                <span className="truncate">João Pedro</span>
                <Badge
                  variant="outline"
                  className="text-[9px] shrink-0 text-emerald-600 border-emerald-300"
                >
                  Gestor
                </Badge>
              </button>
              <button
                type="button"
                className="text-left text-xs text-primary hover:underline flex justify-between items-center p-1 rounded hover:bg-muted/50"
                onClick={() => handleQuickFill('Claudio Figueiredo')}
              >
                <span className="truncate">Claudio Figueiredo</span>
                <Badge
                  variant="outline"
                  className="text-[9px] shrink-0 text-amber-600 border-amber-300"
                >
                  Proprietário
                </Badge>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Informe suas credenciais registradas pela administração da fazenda.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting || isLoadingAuth}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || isLoadingAuth} className="gap-2">
              <LogIn className="h-4 w-4" />
              {submitting || isLoadingAuth ? 'Entrando...' : 'Entrar com Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
