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

  const [email, setEmail] = useState('joaopedro_zoo@hotmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    try {
      setSubmitting(true)
      await login(email, password)
      toast({
        title: 'Login Realizado com Sucesso!',
        description:
          'Autenticado no PocketBase. As ações agora contêm sua assinatura de auditoria.',
      })
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Falha no Login',
        description: err?.message || 'E-mail ou senha incorretos.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickFill = (quickEmail: string) => {
    setEmail(quickEmail)
    setPassword('Skip@Pass')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <DialogTitle>Autenticação Individual de Colaborador</DialogTitle>
          </div>
          <DialogDescription>
            Cada colaborador (Vaqueiro, Capataz, Gestor) entra com sua credencial própria para
            auditoria zootécnica e financeira no PocketBase.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">E-mail Corporativo</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@pecuariaf3.com.br"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Senha de Acesso</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="p-3 bg-muted/40 rounded-lg space-y-2 border text-xs">
            <span className="font-semibold text-muted-foreground block">
              Contas de Acesso Cadastradas:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button
                type="button"
                className="text-left text-xs text-primary hover:underline flex justify-between items-center p-1 rounded hover:bg-muted/50"
                onClick={() => handleQuickFill('proprietario@pecuariaf3.com.br')}
              >
                <span className="truncate">Dr. Carlos (Proprietário)</span>
                <Badge
                  variant="outline"
                  className="text-[9px] shrink-0 text-amber-600 border-amber-300"
                >
                  Proprietário
                </Badge>
              </button>
              <button
                type="button"
                className="text-left text-xs text-primary hover:underline flex justify-between items-center p-1 rounded hover:bg-muted/50"
                onClick={() => handleQuickFill('socio@pecuariaf3.com.br')}
              >
                <span className="truncate">Mariana (Sócia Adm)</span>
                <Badge
                  variant="outline"
                  className="text-[9px] shrink-0 text-blue-600 border-blue-300"
                >
                  Sócio
                </Badge>
              </button>
              <button
                type="button"
                className="text-left text-xs text-primary hover:underline flex justify-between items-center p-1 rounded hover:bg-muted/50"
                onClick={() => handleQuickFill('joaopedro_zoo@hotmail.com')}
              >
                <span className="truncate">João Pedro (Gestor RT)</span>
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
                onClick={() => handleQuickFill('antonio.capataz@pecuariaf3.com.br')}
              >
                <span className="truncate">Antônio (Capataz)</span>
                <Badge
                  variant="outline"
                  className="text-[9px] shrink-0 text-purple-600 border-purple-300"
                >
                  Capataz
                </Badge>
              </button>
              <button
                type="button"
                className="text-left text-xs text-primary hover:underline flex justify-between items-center p-1 rounded hover:bg-muted/50"
                onClick={() => handleQuickFill('joao.vaqueiro@pecuariaf3.com.br')}
              >
                <span className="truncate">João Vaqueiro (Campo)</span>
                <Badge
                  variant="outline"
                  className="text-[9px] shrink-0 text-sky-600 border-sky-300"
                >
                  Vaqueiro
                </Badge>
              </button>
              <button
                type="button"
                className="text-left text-xs text-primary hover:underline flex justify-between items-center p-1 rounded hover:bg-muted/50"
                onClick={() => handleQuickFill('tiago.servente@pecuariaf3.com.br')}
              >
                <span className="truncate">Tiago (Servente Trato)</span>
                <Badge
                  variant="outline"
                  className="text-[9px] shrink-0 text-slate-600 border-slate-300"
                >
                  Servente
                </Badge>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Senha padrão para todas as contas:{' '}
              <code className="font-mono font-bold">Skip@Pass</code>
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
