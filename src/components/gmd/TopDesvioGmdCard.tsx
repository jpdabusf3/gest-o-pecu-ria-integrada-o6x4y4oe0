import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingDown,
  TrendingUp,
  AlertCircle,
  ShieldAlert,
  ChevronRight,
  Target,
  Scale,
  Sparkles,
} from 'lucide-react'
import { getLots, LotRecord } from '@/services/lots'
import { getPesagens, PesagemRecord } from '@/services/pesagens'
import {
  getAlertasGMD,
  AlertaGMDRecord,
  analisarLoteGMD,
  LoteGMDAnalise,
} from '@/services/gmdAlertas'
import { SemaforoGmdBadge } from './SemaforoGmdBadge'
import { ResolverAlertaModal } from './ResolverAlertaModal'
import { LotPerformanceDrawer } from '@/components/LotPerformanceDrawer'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function TopDesvioGmdCard() {
  const [lots, setLots] = useState<LotRecord[]>([])
  const [pesagens, setPesagens] = useState<PesagemRecord[]>([])
  const [alertas, setAlertas] = useState<AlertaGMDRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modais
  const [alertaSelecionado, setAlertaSelecionado] = useState<AlertaGMDRecord | null>(null)
  const [modalResolverOpen, setModalResolverOpen] = useState(false)
  const [drawerLoteId, setDrawerLoteId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [lotsData, pesagensData, alertasData] = await Promise.all([
        getLots(),
        getPesagens(),
        getAlertasGMD(),
      ])
      setLots(lotsData || [])
      setPesagens(pesagensData || [])
      setAlertas(alertasData || [])
    } catch (err) {
      console.error('Erro ao carregar dados de GMD no dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Análise de todos os lotes
  const analises = useMemo(() => {
    return lots.map((lot) => {
      const pesagensDoLote = pesagens.filter((p) => p.lote_id === lot.id)
      return analisarLoteGMD(lot, pesagensDoLote, alertas)
    })
  }, [lots, pesagens, alertas])

  // Top 5 lotes com maior desvio (mais distantes ou abaixo da meta)
  // Ordena prioritariamente os que possuem desvio calculado negativo/distante, depois semáforo vermelho, amarelo
  const top5Desvios = useMemo(() => {
    return [...analises]
      .filter((a) => a.lote.status === 'active' || a.desvioPct !== null)
      .sort((a, b) => {
        // Priorizar os em status vermelho/crítico
        const score = (item: LoteGMDAnalise) => {
          if (item.statusSemaforo === 'vermelho') return 1000 + Math.abs(item.desvioPct || 0)
          if (item.statusSemaforo === 'amarelo') return 500 + Math.abs(item.desvioPct || 0)
          if (item.statusSemaforo === 'cinza') return 100
          return Math.abs(item.desvioPct || 0)
        }
        return score(b) - score(a)
      })
      .slice(0, 5)
  }, [analises])

  // Alertas persistentes em aberto (desvio > 20% por 2 ciclos consecutivos)
  const alertasAbertos = useMemo(() => {
    return alertas.filter((a) => a.status === 'aberto')
  }, [alertas])

  return (
    <>
      <div className="space-y-4">
        {/* Banner de Alerta Persistente do Gestor */}
        {alertasAbertos.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-3 animate-fade-in-up">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-destructive/20 text-destructive rounded-lg shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-destructive flex items-center gap-2">
                    Alerta Persistente de Nutrição ({alertasAbertos.length} lote(s) crítico(s))
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lote com GMD abaixo de 20% da meta por{' '}
                    <strong>2 ciclos consecutivos de pesagem</strong>. Requer intervenção zootécnica
                    imediata.
                  </p>
                </div>
              </div>
              <Badge variant="destructive" className="uppercase font-mono text-[10px]">
                Ação Requerida
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {alertasAbertos.map((alerta) => {
                const lote = alerta.expand?.lote_id || lots.find((l) => l.id === alerta.lote_id)
                return (
                  <div
                    key={alerta.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-background/80 rounded-lg border border-destructive/20 shadow-xs text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {lote?.name || 'Lote Não Identificado'}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-destructive border-destructive/40 font-bold"
                        >
                          Desvio: {alerta.desvio_pct.toFixed(1)}%
                        </Badge>
                        <span className="text-muted-foreground">
                          (Meta: {alerta.gmd_alvo || 900} g/d | Real: {alerta.gmd_real || '-'} g/d)
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Sugestão técnica: Revisar formulação do suplemento, aferir consumo de cocho,
                        oferta de matéria seca ou realizar repasse sanitário.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (lote) {
                            setDrawerLoteId(lote.id)
                            setDrawerOpen(true)
                          }
                        }}
                        className="text-xs h-8"
                      >
                        Ver Curva
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setAlertaSelecionado(alerta)
                          setModalResolverOpen(true)
                        }}
                        className="bg-destructive hover:bg-destructive/90 text-white text-xs h-8 gap-1"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" /> Resolver Alerta
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Card Top 5 Lotes com Maior Desvio de GMD */}
        <Card className="hover-lift border-primary/20 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Top 5 Lotes com Maior Desvio de GMD
              </CardTitle>
              <CardDescription>
                Semáforo de acompanhamento zootécnico: Verde (&le;10%), Amarelo (10-20%) e Vermelho
                (&gt;20%).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Link to="/pesagens">
                  <Scale className="h-3.5 w-3.5" /> Módulo Pesagens{' '}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Fase / Setor</TableHead>
                    <TableHead className="text-right">GMD Meta</TableHead>
                    <TableHead className="text-right">GMD Real</TableHead>
                    <TableHead className="text-right">GDC Carcaça</TableHead>
                    <TableHead className="text-right">Desvio (%)</TableHead>
                    <TableHead>Semáforo</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top5Desvios.map((item) => {
                    const { lote } = item
                    return (
                      <TableRow key={lote.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-semibold text-primary">
                          <button
                            type="button"
                            onClick={() => {
                              setDrawerLoteId(lote.id)
                              setDrawerOpen(true)
                            }}
                            className="hover:underline text-left"
                          >
                            {lote.name}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">
                          {lote.fase_atual || lote.sector || 'Recria'}
                          {lote.is_arrendamento && (
                            <Badge
                              variant="outline"
                              className="ml-1 text-[10px] text-amber-600 border-amber-300"
                            >
                              Arrendamento
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-xs">
                          {item.gmdAlvoG} g/d
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs whitespace-nowrap">
                          {item.gmdRealKg !== null ? (
                            <span
                              className={
                                item.gmdRealG! >= item.gmdAlvoG
                                  ? 'text-emerald-600'
                                  : 'text-foreground'
                              }
                            >
                              {item.gmdRealG} g/d
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-normal">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {item.gdcRealKg !== null ? (
                            <span className="text-purple-600 font-semibold">
                              {Math.round(item.gdcRealKg * 1000)} g/d
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-xs whitespace-nowrap">
                          {item.desvioPct !== null ? (
                            <span
                              className={cn(
                                item.desvioPct >= -10
                                  ? 'text-emerald-600'
                                  : item.desvioPct >= -20
                                    ? 'text-amber-600'
                                    : 'text-destructive',
                              )}
                            >
                              {item.desvioPct > 0 ? `+${item.desvioPct}%` : `${item.desvioPct}%`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <SemaforoGmdBadge
                            status={item.statusSemaforo}
                            desvioPct={item.desvioPct}
                            diasSemPesagem={item.diasSemPesagem}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => {
                              setDrawerLoteId(lote.id)
                              setDrawerOpen(true)
                            }}
                          >
                            Analisar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {top5Desvios.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Nenhum lote com dados zootécnicos registrado até o momento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drawer de Detalhes do Lote */}
      <LotPerformanceDrawer loteId={drawerLoteId} open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* Modal de Resolução de Alerta */}
      <ResolverAlertaModal
        alerta={alertaSelecionado}
        open={modalResolverOpen}
        onOpenChange={setModalResolverOpen}
        onSuccess={carregarDados}
      />
    </>
  )
}
