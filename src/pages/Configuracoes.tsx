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
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useAppNotifications } from '@/contexts/NotificationContext'
import { Save, UserCog, MessageCircle } from 'lucide-react'

export default function Configuracoes() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()
  const { addNotification } = useAppNotifications()

  const [email, setEmail] = useState(user.email)
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || '')
  const [password, setPassword] = useState('')
  const [prefs, setPrefs] = useState(user.preferences)

  const handleSave = () => {
    setUser({ ...user, email, whatsapp, preferences: prefs })
    toast({
      title: 'Configurações salvas',
      description: 'Seu perfil e preferências foram atualizados com sucesso.',
    })
    setPassword('') // Clear password field after visual save
  }

  const handleTestWhatsApp = () => {
    // Triggers a test notification through the context, which will then dispatch the WhatsApp simulation
    addNotification({
      title: 'Alerta Sanitário de Teste 🚨',
      message: 'Esta é uma mensagem de teste enviada via integração WhatsApp.',
      type: 'alert',
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCog className="h-8 w-8 text-primary" />
          Configurações
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie suas credenciais, contatos e preferências do sistema.
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
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            Notificações por WhatsApp
          </CardTitle>
          <CardDescription>
            Configure o envio automatizado de alertas críticos diretamente para o seu número
            registrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsappEnabled" className="flex flex-col gap-1 cursor-pointer">
              <span>Ativar Integração WhatsApp</span>
              <span className="font-normal text-xs text-muted-foreground">
                Habilita o envio de mensagens
              </span>
            </Label>
            <Switch
              id="whatsappEnabled"
              checked={prefs.whatsappEnabled}
              onCheckedChange={(c) => setPrefs({ ...prefs, whatsappEnabled: c })}
            />
          </div>

          {prefs.whatsappEnabled && (
            <div className="pl-4 border-l-2 border-border space-y-4 animate-in fade-in slide-in-from-left-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifyHealth" className="cursor-pointer text-sm">
                  Alertas Sanitários (Vacinas, Pesagem)
                </Label>
                <Switch
                  id="notifyHealth"
                  checked={prefs.notifyHealth}
                  onCheckedChange={(c) => setPrefs({ ...prefs, notifyHealth: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifyManagement" className="cursor-pointer text-sm">
                  Alertas de Manejo & Tarefas
                </Label>
                <Switch
                  id="notifyManagement"
                  checked={prefs.notifyManagement}
                  onCheckedChange={(c) => setPrefs({ ...prefs, notifyManagement: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifyFinancial" className="cursor-pointer text-sm">
                  Alertas Financeiros & Orçamento
                </Label>
                <Switch
                  id="notifyFinancial"
                  checked={prefs.notifyFinancial}
                  onCheckedChange={(c) => setPrefs({ ...prefs, notifyFinancial: c })}
                />
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleTestWhatsApp}
                  className="gap-2 w-full sm:w-auto"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-500" /> Simular Alerta WhatsApp
                </Button>
              </div>
            </div>
          )}
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
