import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calendar, CheckCircle2, Clock, ExternalLink, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ConfigBenchmarkRecord,
  getConfigBenchmarks,
  verificarRecalibracaoDevida,
  registrarRecalibracaoBenchmark,
  adiarRecalibracaoBenchmark,
  emitirNotificacaoRecalibracaoSeNecessario,
} from '@/services/configBenchmark'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface BannerRecalibracaoAnualProps {
  /** Callback opcional quando os benchmarks forem recalibrados ou adiados */
  onRecalibracaoAtualizada?: () => void
  /** Forçar exibição ou ocultação */
  className?: string
}

export function BannerRecalibracaoAnual({
  onRecalibracaoAtualizada,
  className = '',
}: BannerRecalibracaoAnualProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [benchmarks, setBenchmarks] = useState<ConfigBenchmarkRecord[]>([])
  const [isDevida, setIsDevida] = useState(false)
  const [diasAtraso, setDiasAtraso] = useState(0)
  const [ultimaData, setUltimaData] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)
  const [loading, setLoading] = useState(true)
  const notificacaoDisparadaRef = useRef(false)

  const checarStatus = async () => {
    try {
      setLoading(true)
      const list = await getConfigBenchmarks()
      setBenchmarks(list)
      const status = verificarRecalibracaoDevida(list)
      setIsDevida(status.isDevida)
      setDiasAtraso(status.diasAtrasoOuRestantes)
      setUltimaData(status.ultimaData)

      // Disparar notificação in-app na central apenas 1 vez por montagem quando due
      if (status.isDevida && !notificacaoDisparadaRef.current) {
        notificacaoDisparadaRef.current = true
        emitirNotificacaoRecalibracaoSeNecessario(list).catch((err) =>
          console.warn('Erro ao emitir notificação de recalibração:', err),
        )
      }
    } catch (err) {
      console.warn('Erro ao checar recalibração de benchmark:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checarStatus()
  }, [])

  const handleRegistrarRecalibracao = async () => {
    try {
      setProcessando(true)
      await registrarRecalibracaoBenchmark(benchmarks, {
        usuarioId: user?.id,
        usuarioNome: user?.name,
      })
      toast({
        title: 'Recalibração Anual Registrada',
        description:
          'Data da calibração e snapshot gravados no histórico safra a safra. Próxima revisão em 12 meses.',
      })
      await checarStatus()
      if (onRecalibracaoAtualizada) onRecalibracaoAtualizada()
    } catch (err: any) {
      console.error('Erro ao registrar recalibração:', err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao registrar recalibração dos benchmarks.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  const handleAdiar = async () => {
    try {
      setProcessando(true)
      await adiarRecalibracaoBenchmark(benchmarks)
      toast({
        title: 'Recalibração Adiada',
        description: 'A revisão das metas e benchmarks foi adiada por 12 meses.',
      })
      await checarStatus()
      if (onRecalibracaoAtualizada) onRecalibracaoAtualizada()
    } catch (err: any) {
      console.error('Erro ao adiar recalibração:', err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao adiar recalibração.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  if (loading || !isDevida) {
    return null
  }

  const dataFormatada = ultimaData
    ? new Date(ultimaData).toLocaleDateString('pt-BR')
    : 'Nunca recalibrado'

  return (
    <Card
      className={`border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-background shadow-md overflow-hidden animate-in fade-in slide-in-from-top-2 ${className}`}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                Recalibração Anual de Benchmarking Devida
              </span>
              <Badge
                variant="outline"
                className="bg-amber-500/20 border-amber-500/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider"
              >
                Início de Safra
              </Badge>
              {diasAtraso > 0 && (
                <span className="text-xs font-mono text-muted-foreground">
                  (vencida há ~{diasAtraso} dias)
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
              É recomendável <strong>revisar os valores de benchmark no início da safra</strong>{' '}
              (Média, Referência e TOP MT/TIP) para manter o alinhamento com as metas vigentes da
              fazenda. Última recalibração registrada:{' '}
              <strong className="text-foreground">{dataFormatada}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 w-full md:w-auto justify-end">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 bg-background border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
          >
            <Link to="/configuracoes?tab=benchmark">
              <ExternalLink className="w-3.5 h-3.5" />
              Revisar Valores
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={processando}
            onClick={handleAdiar}
            className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Clock className="w-3.5 h-3.5" />
            Adiar 12 meses
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={processando}
            onClick={handleRegistrarRecalibracao}
            className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
          >
            {processando ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Registrar Recalibração
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
