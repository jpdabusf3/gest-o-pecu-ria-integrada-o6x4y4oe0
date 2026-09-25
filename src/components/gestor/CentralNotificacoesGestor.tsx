import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bell,
  AlertTriangle,
  TrendingDown,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Inbox,
  Check,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  NotificacaoSistemaRecord,
  getNotificacoesSistema,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
} from '@/services/notificacoesSistema'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

export function CentralNotificacoesGestor() {
  const [notificacoes, setNotificacoes] = useState<NotificacaoSistemaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const carregarNotificacoes = async () => {
    try {
      setLoading(true)
      const data = await getNotificacoesSistema()
      setNotificacoes(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarNotificacoes()
  }, [])

  useRealtime('notificacoes_sistema', () => carregarNotificacoes())

  const handleMarcarLida = async (id: string) => {
    try {
      await marcarNotificacaoComoLida(id)
      setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lido: true } : n)))
    } catch (err) {
      console.warn('Erro ao marcar lida:', err)
    }
  }

  const handleMarcarTodasLidas = async () => {
    try {
      await marcarTodasNotificacoesComoLidas()
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lido: true })))
      toast({
        title: 'Notificações Atualizadas',
        description: 'Todas as notificações foram marcadas como lidas.',
      })
    } catch (err) {
      console.warn('Erro ao marcar todas lidas:', err)
    }
  }

  const naoLidas = notificacoes.filter((n) => !n.lido)

  const getSeveridadeBadge = (sev: string) => {
    switch (sev) {
      case 'critica':
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold">
            Crítica
          </Badge>
        )
      case 'alta':
        return (
          <Badge className="bg-amber-600 text-white text-[10px] uppercase font-bold">Alta</Badge>
        )
      case 'media':
        return (
          <Badge variant="secondary" className="text-[10px] uppercase font-bold">
            Média
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px] uppercase font-bold">
            Informativo
          </Badge>
        )
    }
  }

  return (
    <Card className="shadow-xs border border-border">
      <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Central de Notificações do Gestor
            {naoLidas.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs font-mono">
                {naoLidas.length} nova(s)
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Alertas em tempo real de GMD crítico, manejos pendentes e compressão de margem
          </CardDescription>
        </div>

        {naoLidas.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={handleMarcarTodasLidas}
          >
            <Check className="h-3.5 w-3.5" />
            Marcar todas lidas
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-3 space-y-2.5">
        {loading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Carregando notificações...
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-1.5">
            <Inbox className="h-8 w-8 text-muted-foreground/60" />
            <span className="text-xs font-medium">Nenhuma notificação recente para a gestão.</span>
          </div>
        ) : (
          notificacoes.slice(0, 5).map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-lg border text-xs transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
                !notif.lido
                  ? 'bg-primary/5 border-primary/20 shadow-2xs font-medium'
                  : 'bg-muted/10 opacity-75'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getSeveridadeBadge(notif.severidade)}
                  <span className="font-bold text-foreground text-sm">{notif.titulo}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(notif.created).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">{notif.mensagem}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {notif.link_destino && (
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Link to={notif.link_destino}>
                      Ver Detalhes <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
                {!notif.lido && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleMarcarLida(notif.id)}
                    title="Marcar como lida"
                  >
                    ✓
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
