import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  analisarRupturaEstoque,
  gerarNotificacoesRuptura,
  InsumoRuptura,
  ResultadoAnaliseRuptura,
} from '@/services/alertaRuptura'
import { RefreshCw, PackageX, Info, ChevronDown, ChevronUp, BellRing } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const SEMAFORO_CONFIG: Record<string, { label: string; classe: string; bg: string }> = {
  verde: {
    label: 'Coberto (>1,5×)',
    classe: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    bg: 'bg-emerald-500',
  },
  amarelo: {
    label: 'Atenção (1,0–1,5×)',
    classe: 'text-amber-700 border-amber-200 bg-amber-50',
    bg: 'bg-amber-500',
  },
  vermelho: {
    label: 'Ruptura (<1,0×)',
    classe: 'text-rose-700 border-rose-200 bg-rose-50',
    bg: 'bg-rose-500',
  },
  sem_historico: {
    label: 'Sem histórico p/ projetar',
    classe: 'text-slate-600 border-slate-200 bg-slate-50',
    bg: 'bg-slate-400',
  },
}

export function AlertaRupturaCard() {
  const { toast } = useToast()
  const [resultado, setResultado] = useState<ResultadoAnaliseRuptura | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarBase, setMostrarBase] = useState(false)
  const [notificando, setNotificando] = useState(false)

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await analisarRupturaEstoque()
      setResultado(res)
    } catch (e) {
      console.warn('Erro ao analisar ruptura de estoque:', e)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleGerarNotificacoes = async () => {
    if (!resultado) return
    setNotificando(true)
    try {
      const criadas = await gerarNotificacoesRuptura(resultado)
      toast({
        title: 'Central de Notificações',
        description:
          criadas > 0
            ? `${criadas} alerta(s) de ruptura enviado(s) para a central de notificações do gestor.`
            : 'Nenhum alerta novo — os alertas em aberto já cobrem os insumos em risco.',
      })
    } finally {
      setNotificando(false)
    }
  }

  const emRisco = resultado?.insumos.filter((i) => i.em_risco) ?? []
  const semHistorico = resultado?.insumos.filter((i) => i.semaforo === 'sem_historico') ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PackageX className="h-5 w-5 text-primary" /> Alertas de Ruptura de Estoque
            </CardTitle>
            <CardDescription>
              Projeção do consumo do próximo mês por insumo vs. estoque disponível. Insumos em risco
              ordenados pelos dias restantes até a ruptura.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={carregar}
              disabled={carregando}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
            <Button
              size="sm"
              onClick={handleGerarNotificacoes}
              disabled={notificando || emRisco.length === 0}
              className="gap-1.5"
            >
              <BellRing className="h-4 w-4" />
              Enviar Alertas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Semáforo resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['vermelho', 'amarelo', 'verde', 'sem_historico'] as const).map((k) => {
            const count = resultado?.insumos.filter((i) => i.semaforo === k).length ?? 0
            const cfg = SEMAFORO_CONFIG[k]
            return (
              <div key={k} className={`rounded-lg border p-3 ${cfg.classe}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${cfg.bg}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">{cfg.label}</span>
                </div>
                <p className="text-2xl font-black font-mono mt-1">{count}</p>
                <p className="text-[10px] text-muted-foreground">insumo(s)</p>
              </div>
            )
          })}
        </div>

        {/* Base de cálculo transparente */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMostrarBase(!mostrarBase)}
          className="w-full text-xs text-muted-foreground hover:text-foreground justify-between border border-dashed h-9"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 text-primary" /> Base de Cálculo Transparente
          </span>
          {mostrarBase ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {mostrarBase && (
          <div className="p-4 rounded-xl border bg-muted/30 text-xs space-y-2 animate-fade-in">
            <p>
              <strong>Fonte da projeção:</strong> {resultado?.fonteProjecao || 'carregando...'} —
              prioriza o plano de suplementação ativo (atividades de nutrição planejadas para o
              próximo mês); na ausência, usa a média de consumo dos últimos 90 dias das
              movimentações de estoque.
            </p>
            <p>
              <strong>Estoque disponível:</strong> estoque atual convertido em kg (1 saco = 30 kg).
              Não há módulo de compras em trânsito/pedidos abertos no sistema — a projeção usa
              apenas o estoque atual (sem suposição de chegada de compras).
            </p>
            <p>
              <strong>Dias até a ruptura</strong> = estoque disponível ÷ consumo médio diário
              projetado (kg/dia).
            </p>
            <p>
              <strong>Sugestão de compra</strong> = consumo projetado do próximo mês + 20% de folga
              de segurança − estoque disponível, em kg e sacos de 30 kg.
            </p>
            <p>
              <strong>Semáforo:</strong> verde &gt; 1,5× consumo projetado · amarelo 1,0–1,5× ·
              vermelho &lt; 1,0×. Quando não há histórico de consumo suficiente, o sistema{' '}
              <strong>não inventa projeção</strong> e sinaliza "sem histórico".
            </p>
          </div>
        )}

        {/* Tabela de insumos em risco */}
        {emRisco.length > 0 ? (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Estoque (kg)</TableHead>
                  <TableHead className="text-right">Consumo Projetado (kg/mês)</TableHead>
                  <TableHead className="text-center">Dias até Ruptura</TableHead>
                  <TableHead className="text-right">Sugestão de Compra</TableHead>
                  <TableHead>Semáforo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emRisco.map((i: InsumoRuptura) => {
                  const cfg = SEMAFORO_CONFIG[i.semaforo]
                  return (
                    <TableRow key={i.insumo_id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {i.produto}
                        <span className="block text-[10px] text-muted-foreground">
                          {i.base_calculo}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatNumber(i.estoque_atual_kg, 0)} kg
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatNumber(i.consumo_mensal_projetado, 0)} kg
                      </TableCell>
                      <TableCell className="text-center font-semibold whitespace-nowrap">
                        {i.dias_ate_ruptura !== null ? `${i.dias_ate_ruptura} dias` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary whitespace-nowrap">
                        {i.sugestao_compra_kg > 0
                          ? `${formatNumber(i.sugestao_compra_kg, 0)} kg (${formatNumber(i.sugestao_compra_sacos, 1)} sacos)`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${cfg.classe} whitespace-nowrap`}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 space-y-2 border rounded-lg bg-emerald-50/40 dark:bg-emerald-950/10">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              Nenhum insumo em risco de ruptura no próximo mês
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              O estoque atual cobre o consumo projetado de todos os insumos com histórico. Insumos
              sem histórico de consumo suficiente aparecem na base de cálculo como "sem histórico" —
              o sistema não inventa projeção.
            </p>
          </div>
        )}

        {semHistorico.length > 0 && (
          <p className="text-xs text-muted-foreground border-l-4 border-slate-300 pl-3">
            {semHistorico.length} insumo(s) sem histórico de consumo suficiente:{' '}
            {semHistorico.map((s) => s.produto).join(', ')}. Registre movimentações de estoque para
            que a projeção seja ativada.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
