import { useState, useEffect } from 'react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useSearchParams } from 'react-router-dom'
import { useAppNotifications } from '@/contexts/NotificationContext'
import { useMarket } from '@/contexts/MarketContext'
import { BenchmarkingConfigTab } from '@/components/reports/BenchmarkingConfigTab'
import {
  Save,
  UserCog,
  MessageCircle,
  BellRing,
  TrendingUp,
  Trophy,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'

export default function Configuracoes() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'perfil'
  const [abaAtiva, setAbaAtiva] = useState(tabFromUrl)
  const { addNotification } = useAppNotifications()
  const { isAutoUpdateEnabled, toggleAutoUpdate, marketData, setManualPrice } = useMarket()

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tab !== abaAtiva) {
      setAbaAtiva(tab)
    }
  }, [searchParams, abaAtiva])

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
    setPassword('')
  }

  const handleTestAlert = () => {
    addNotification({
      title: 'Alerta Sanitário de Teste 🚨',
      message: 'Esta é uma mensagem de teste enviada via sistema de notificações integrado.',
      type: 'alert',
    })
    toast({
      title: 'Alerta Disparado',
      description: 'O alerta de teste foi enviado aos canais habilitados.',
    })
  }

  const handleTogglePush = async (enabled: boolean) => {
    if (enabled) {
      if (!('Notification' in window)) {
        toast({
          title: 'Erro',
          description: 'Seu navegador não suporta notificações push.',
          variant: 'destructive',
        })
        return
      }
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPrefs({ ...prefs, pushEnabled: true })

        if ('serviceWorker' in navigator && 'PushManager' in window) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.pushManager
              .subscribe({
                userVisibleOnly: true,
                applicationServerKey:
                  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLcg',
              })
              .catch((err) => console.log('Mock subscribe message', err))
          })
        }
      } else {
        toast({
          title: 'Permissão Negada',
          description: 'Você negou a permissão para notificações.',
          variant: 'destructive',
        })
      }
    } else {
      setPrefs({ ...prefs, pushEnabled: false })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCog className="h-8 w-8 text-primary" />
          Configurações do Sistema
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie suas credenciais, calibração de benchmarking Exagro, contatos e preferências.
        </p>
      </div>

      <Tabs
        value={abaAtiva}
        onValueChange={(v) => {
          setAbaAtiva(v)
          setSearchParams({ tab: v })
        }}
        className="space-y-6"
      >
        <TabsList className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap justify-start h-auto p-1">
          <TabsTrigger value="perfil" className="py-2">
            Perfil
          </TabsTrigger>
          <TabsTrigger
            value="benchmark"
            className="py-2 gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300"
          >
            <Trophy className="w-3.5 h-3.5 text-emerald-600" /> Benchmarking Exagro
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="py-2">
            Notificações
          </TabsTrigger>
          <TabsTrigger value="mercado" className="py-2">
            Mercado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="benchmark" className="mt-0">
          <BenchmarkingConfigTab />
        </TabsContent>

        <TabsContent value="perfil" className="mt-0">
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
            <CardFooter className="flex justify-end border-t bg-muted/20 pt-4 mt-4">
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" /> Salvar Perfil
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                Preferências de Notificação
              </CardTitle>
              <CardDescription>
                Configure como deseja receber os alertas críticos da fazenda (Push Nativo e
                WhatsApp).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pushEnabled" className="flex flex-col gap-1 cursor-pointer">
                    <span>Notificações Push (Nativas)</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Alertas direto no sistema operacional
                    </span>
                  </Label>
                  <Switch
                    id="pushEnabled"
                    checked={prefs.pushEnabled}
                    onCheckedChange={handleTogglePush}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="whatsappEnabled" className="flex flex-col gap-1 cursor-pointer">
                    <span className="flex items-center gap-2">
                      WhatsApp <MessageCircle className="h-3 w-3 text-emerald-500" />
                    </span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Mensagens automatizadas no seu celular
                    </span>
                  </Label>
                  <Switch
                    id="whatsappEnabled"
                    checked={prefs.whatsappEnabled}
                    onCheckedChange={(c) => setPrefs({ ...prefs, whatsappEnabled: c })}
                  />
                </div>
              </div>

              <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                <h4 className="text-sm font-semibold mb-2">
                  Quais eventos gerais devem disparar notificação?
                </h4>

                <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50">
                  <Label
                    htmlFor="notifyCriticalInventory"
                    className="flex flex-col gap-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <ShieldAlert className="h-4 w-4 text-amber-500" /> Níveis Críticos de Estoque
                    </span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Avisos de insumos e rações abaixo do limite mínimo.
                    </span>
                  </Label>
                  <Switch
                    id="notifyCriticalInventory"
                    checked={prefs.notifyCriticalInventory}
                    onCheckedChange={(c) => setPrefs({ ...prefs, notifyCriticalInventory: c })}
                  />
                </div>

                <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50">
                  <Label
                    htmlFor="notifyTaskCompletion"
                    className="flex flex-col gap-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Conclusão de Tarefas de
                      Manejo
                    </span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Avisos quando os operadores finalizam atividades designadas.
                    </span>
                  </Label>
                  <Switch
                    id="notifyTaskCompletion"
                    checked={prefs.notifyTaskCompletion}
                    onCheckedChange={(c) => setPrefs({ ...prefs, notifyTaskCompletion: c })}
                  />
                </div>

                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="notifyHealth" className="cursor-pointer text-sm">
                    Alertas Sanitários (Vacinas, Pesagem)
                  </Label>
                  <Switch
                    id="notifyHealth"
                    checked={prefs.notifyHealth}
                    onCheckedChange={(c) => setPrefs({ ...prefs, notifyHealth: c })}
                  />
                </div>
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="notifyManagement" className="cursor-pointer text-sm">
                    Alertas de Manejo & Operacional
                  </Label>
                  <Switch
                    id="notifyManagement"
                    checked={prefs.notifyManagement}
                    onCheckedChange={(c) => setPrefs({ ...prefs, notifyManagement: c })}
                  />
                </div>
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="notifyFinancial" className="cursor-pointer text-sm">
                    Alertas Financeiros & Orçamento
                  </Label>
                  <Switch
                    id="notifyFinancial"
                    checked={prefs.notifyFinancial}
                    onCheckedChange={(c) => setPrefs({ ...prefs, notifyFinancial: c })}
                  />
                </div>

                <div className="pt-4 border-t border-border space-y-4 mt-4">
                  <h4 className="text-sm font-semibold mb-2">Alertas Específicos por Categoria</h4>
                  <div className="flex items-center justify-between px-1">
                    <Label
                      htmlFor="notifyVacasCorte"
                      className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Protocolos para Vacas de corte
                    </Label>
                    <Switch
                      id="notifyVacasCorte"
                      checked={prefs.notifyVacasCorte}
                      onCheckedChange={(c) => setPrefs({ ...prefs, notifyVacasCorte: c })}
                    />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <Label
                      htmlFor="notifyNovilhasMatrizes"
                      className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Manejo de Novilhas matrizes
                    </Label>
                    <Switch
                      id="notifyNovilhasMatrizes"
                      checked={prefs.notifyNovilhasMatrizes}
                      onCheckedChange={(c) => setPrefs({ ...prefs, notifyNovilhasMatrizes: c })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border mt-4">
                  <Button
                    variant="outline"
                    onClick={handleTestAlert}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <BellRing className="h-4 w-4 text-primary" /> Simular Alerta de Teste
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t bg-muted/20 pt-4">
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" /> Salvar Preferências
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="mercado" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Integração de Mercado
              </CardTitle>
              <CardDescription>
                Sincronização de preços da arroba e indicadores de mercado via API externa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoUpdate" className="flex flex-col gap-1 cursor-pointer">
                  <span>Atualização Automática (API)</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Obter cotações em tempo real de fontes seguras.
                  </span>
                </Label>
                <Switch
                  id="autoUpdate"
                  checked={isAutoUpdateEnabled}
                  onCheckedChange={toggleAutoUpdate}
                />
              </div>

              {!isAutoUpdateEnabled && (
                <div className="pt-4 border-t border-border space-y-4 animate-in fade-in">
                  <h4 className="text-sm font-semibold mb-2">Preços Manuais (R$)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {marketData.map((ind) => (
                      <div key={ind.id} className="space-y-2">
                        <Label>{ind.label}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ind.price}
                          onChange={(e) => setManualPrice(ind.id, Number(e.target.value))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
