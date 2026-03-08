import { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Save, UserCog } from 'lucide-react'

export default function Configuracoes() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState(user.email)
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || '')
  const [password, setPassword] = useState('')

  const handleSave = () => {
    setUser({ ...user, email, whatsapp })
    toast({
      title: 'Configurações salvas',
      description: 'Seu perfil foi atualizado com sucesso.',
    })
    setPassword('') // Clear password field after visual save
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCog className="h-8 w-8 text-primary" />
          Configurações
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie suas credenciais e informações de contato do sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <CardDescription>
            Atualize seu e-mail, telefone de contato e credenciais de segurança.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail de Acesso</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">Número de WhatsApp</Label>
            <Input
              id="whatsapp"
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
          <div className="space-y-2 pt-2 border-t border-border">
            <Label htmlFor="password">Nova Senha (deixe em branco para não alterar)</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t bg-muted/20 pt-4">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Salvar Alterações
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
