import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WeightGainChart } from './charts/WeightGainChart'
import { DailyWeightChart } from './charts/DailyWeightChart'
import {
  TrendingUp,
  BrainCircuit,
  Scale,
  Calendar,
  Clock,
  Layers,
  Target,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPesagensByLote, PesagemRecord } from '@/services/pesagens'
import { getLots, LotRecord } from '@/services/lots'
import {
  getAlertasGMD,
  AlertaGMDRecord,
  analisarLoteGMD,
  LoteGMDAnalise,
} from '@/services/gmdAlertas'
import { GmdEstimadoVsRealChart } from './gmd/GmdEstimadoVsRealChart'
import { SemaforoGmdBadge } from './gmd/SemaforoGmdBadge'
import { EditarMetaLoteModal } from './gmd/EditarMetaLoteModal'
import { ResolverAlertaModal } from './gmd/ResolverAlertaModal'
import useFinanceStore from '@/stores/useFinanceStore'
import { calcularCustoArrobaLote } from '@/services/custoArroba'
import { formatCurrency } from '@/lib/utils'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function LotPerformanceDrawer({
  loteId,
  open,
  onOpenChange,
}: {
  loteId: string | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [lotDetails, setLotDetails] = useState<LotRecord | null>(null)
  const [pesagens, setPesagens] = useState<PesagemRecord[]>([])
  const [alertas, setAlertas] = useState<AlertaGMDRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Modais de suporte
  const [modalMetaOpen, setModalMetaOpen] = useState(false)
  const [modalResolverOpen, setModalResolverOpen] = useState(false)

  const fetchDetails = async () => {
    if (!loteId) return
    try {
      setLoading(true)
      const allLots = await getLots()
      const target = allLots.find((l) => l.name === loteId || l.id === loteId)
      if (target) {
        setLotDetails(target)
        const [records, alertasData] = await Promise.all([
          getPesagensByLote(target.id),
          getAlertasGMD(`lote_id = '${target.id}'`),
        ])
        setPesagens(records || [])
        setAlertas(alertasData || [])
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes do lote:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && loteId) {
      fetchDetails()
    }
  }, [loteId, open])

  const { ledger } = useFinanceStore()

  // Diagnóstico zootécnico e cálculo de custo por @ produzida
  const analise = lotDetails ? analisarLoteGMD(lotDetails, pesagens, alertas) : null
  const custoArroba = lotDetails ? calcularCustoArrobaLote(lotDetails, pesagens, ledger) : null

  // Alerta em aberto para esse lote
  const alertaAberto = alertas.find((a) => a.status === 'aberto')

  // Última pesagem registrada
  const ultimaPesagem = pesagens.length > 0 ? pesagens[0] : null

  // Cálculo de dias de permanência Exagro
  const dataEntrada = lotDetails?.data_entrada || lotDetails?.entry_date
  const dataSaida = lotDetails?.data_saida || lotDetails?.exit_date
  const diasPermanencia = dataEntrada
    ? differenceInDays(dataSaida ? parseISO(dataSaida) : new Date(), parseISO(dataEntrada))
    : lotDetails?.dias_permanencia || 0

  // Dados do gráfico de evolução do peso real
  const chartEvolucao = [...pesagens]
    .sort((a, b) => new Date(a.data_pesagem).getTime() - new Date(b.data_pesagem).getTime())
    .map((p) => ({
      data: format(parseISO(p.data_pesagem), 'dd/MM'),
      peso: p.peso_medio_kg,
      gmd: p.gmd_intervalo || 0,
    }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-[95vw] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Desempenho: {lotDetails?.name || loteId}
          </SheetTitle>
          <SheetDescription>
            Análise zootécnica Exagro, acompanhamento de pesagens reais e curva de ganho de peso.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-5">
          {/* Card ÚLTIMA PESAGEM */}
          {/* Alerta Persistente Ativo */}
          {alertaAberto && (
            <div className="bg-destructive/15 border border-destructive/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> Alerta Persistente Ativo
                </span>
                <Badge variant="destructive" className="text-[10px]">
                  Desvio: {alertaAberto.desvio_pct.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Lote em vermelho por 2 ciclos consecutivos. Sugestão: revisar formulação ou consumo
                no cocho.
              </p>
              <Button
                size="sm"
                variant="destructive"
                className="w-full h-8 text-xs gap-1.5"
                onClick={() => setModalResolverOpen(true)}
              >
                Registrar Diagnóstico & Contramedida
              </Button>
            </div>
          )}

          {/* Meta de GMD e Semáforo */}
          <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">
                  Meta de GMD: {analise?.gmdAlvoG || 900} g/dia
                </span>
                <span className="text-xs text-muted-foreground">
                  ({lotDetails?.fase_atual || 'recria'})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setModalMetaOpen(true)}
              >
                Ajustar Meta
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t">
              <div>
                <span className="text-xs text-muted-foreground block">Semáforo:</span>
                {analise && (
                  <SemaforoGmdBadge
                    status={analise.statusSemaforo}
                    desvioPct={analise.desvioPct}
                    diasSemPesagem={analise.diasSemPesagem}
                  />
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">GMD Real Último:</span>
                <span className="text-base font-bold text-emerald-600">
                  {analise?.gmdRealG ? `${analise.gmdRealG} g/d` : '-'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">GDC Carcaça:</span>
                <span className="text-base font-bold text-purple-600">
                  {analise?.gdcRealKg ? `${Math.round(analise.gdcRealKg * 1000)} g/d` : '-'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Desvio Meta:</span>
                <span className="text-base font-bold">
                  {analise?.desvioPct !== null && analise?.desvioPct !== undefined
                    ? `${analise.desvioPct > 0 ? '+' : ''}${analise.desvioPct}%`
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Card de Custo por Arroba Produzida Exagro */}
          {custoArroba && (
            <div className="bg-muted/30 border rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-primary" /> Fechamento Zootécnico & Custo / @
                </span>
                {custoArroba.temFechamentoValido ? (
                  <Badge
                    variant="outline"
                    className="text-emerald-600 border-emerald-300 bg-emerald-50 text-[10px]"
                  >
                    Fechamento Válido
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                    Em Andamento (Sem saída)
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">@ Produzidas:</span>
                  <span className="text-base font-bold text-foreground">
                    {custoArroba.arrobasProduzidasTotal > 0
                      ? `${custoArroba.arrobasProduzidasTotal} @`
                      : '-'}
                  </span>
                  {custoArroba.arrobasProduzidasPorCabeca > 0 && (
                    <span className="text-[10px] text-muted-foreground block">
                      ({custoArroba.arrobasProduzidasPorCabeca} @/cab)
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Custo Total Acumulado:
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {formatCurrency(custoArroba.custoTotal)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {formatCurrency(custoArroba.custoPorCabeca)}/cab
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Custo / @ Produzida:
                  </span>
                  <span className="text-base font-bold text-destructive font-mono">
                    {custoArroba.custoPorArroba
                      ? formatCurrency(custoArroba.custoPorArroba)
                      : custoArroba.arrobasProduzidasTotal <= 0
                        ? 'Requer pesagem saída'
                        : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Nutrição vs Sanidade:
                  </span>
                  <span className="text-xs font-medium text-foreground block font-mono">
                    Nutri: {formatCurrency(custoArroba.custoNutricao)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground block font-mono">
                    Sani: {formatCurrency(custoArroba.custoSanidade)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="gmd_comparativo" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="gmd_comparativo" className="text-xs">
                GMD Estimado
              </TabsTrigger>
              <TabsTrigger value="custo_arroba_tab" className="text-xs">
                Custo / @
              </TabsTrigger>
              <TabsTrigger value="intervalos" className="text-xs">
                Intervalos
              </TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs">
                Projeção IA
              </TabsTrigger>
            </TabsList>

            {/* Nova Aba: Detalhamento do Custo por Arroba */}
            <TabsContent
              value="custo_arroba_tab"
              className="mt-3 rounded-xl border bg-card p-4 shadow-sm space-y-3"
            >
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-primary" /> Metodologia de Custo por Arroba (@)
              </h3>
              <p className="text-xs text-muted-foreground">
                Cálculo baseado no ganho de peso aferido entre a pesagem de entrada (
                {custoArroba?.pesoEntradaKg} kg) e a pesagem final ({custoArroba?.pesoSaidaKg} kg)
                multiplicado por {custoArroba?.headcount} cabeças, dividido por 15 kg/@.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-muted-foreground block text-[11px]">Nutrição por @:</span>
                  <span className="font-bold text-sm text-foreground">
                    {custoArroba?.custoNutricaoPorArroba
                      ? formatCurrency(custoArroba.custoNutricaoPorArroba)
                      : '-'}
                  </span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-muted-foreground block text-[11px]">Sanidade por @:</span>
                  <span className="font-bold text-sm text-foreground">
                    {custoArroba?.custoSanidadePorArroba
                      ? formatCurrency(custoArroba.custoSanidadePorArroba)
                      : '-'}
                  </span>
                </div>
              </div>

              {custoArroba?.arrobasProduzidasTotal === 0 && (
                <div className="p-3 border border-amber-200 bg-amber-50/50 rounded-lg text-xs text-amber-800">
                  Para calcular o custo por arroba deste lote, registre uma pesagem de saída ou
                  feche o lote.
                </div>
              )}
            </TabsContent>

            {/* Aba 1: Gráfico Estimado vs Real */}
            <TabsContent
              value="gmd_comparativo"
              className="mt-3 rounded-xl border bg-card p-4 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" /> Curva de GMD Estimado (Meta) vs.
                  Real
                </h3>
              </div>
              <GmdEstimadoVsRealChart
                pesagens={pesagens}
                gmdAlvoG={analise?.gmdAlvoG || 900}
                rendimentoCarcacaPct={lotDetails?.rendimento_carcaca_pct || 53.5}
              />
            </TabsContent>

            {/* Aba 2: Tabela de Intervalos */}
            <TabsContent
              value="intervalos"
              className="mt-3 rounded-xl border bg-card p-3 shadow-sm space-y-2"
            >
              <h3 className="font-semibold text-sm">Pesagens e Intervalos Consecutivos</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Peso (kg)</TableHead>
                      <TableHead className="text-right">Dias</TableHead>
                      <TableHead className="text-right">GMD (kg/d)</TableHead>
                      <TableHead className="text-right">Desvio vs Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...pesagens]
                      .sort(
                        (a, b) =>
                          new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
                      )
                      .map((p) => {
                        const gmd = p.gmd_intervalo
                        const metaKg = (analise?.gmdAlvoG || 900) / 1000
                        const dev = gmd
                          ? Number((((gmd - metaKg) / metaKg) * 100).toFixed(1))
                          : null
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs">
                              {p.data_pesagem
                                ? format(parseISO(p.data_pesagem), 'dd/MM/yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs">
                              {p.peso_medio_kg.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {p.dias_intervalo ? `${p.dias_intervalo} d` : 'Entrada'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                              {gmd ? `${gmd.toFixed(3)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {dev !== null ? (
                                <span
                                  className={
                                    dev >= -10
                                      ? 'text-emerald-600'
                                      : dev >= -20
                                        ? 'text-amber-600'
                                        : 'text-destructive font-bold'
                                  }
                                >
                                  {dev > 0 ? `+${dev}%` : `${dev}%`}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Aba 3: Projeções IA e Histórico de Peso */}
            <TabsContent
              value="monthly"
              className="mt-3 rounded-xl border bg-card p-4 shadow-sm space-y-4"
            >
              <h3 className="font-medium text-sm">Curva Preditiva vs. Real</h3>
              {loteId && <WeightGainChart loteId={loteId} />}
              <h3 className="font-medium text-sm pt-2">Acompanhamento Diário Estimado</h3>
              {loteId && <DailyWeightChart loteId={loteId} />}
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal Ajustar Meta */}
        <EditarMetaLoteModal
          lote={lotDetails}
          open={modalMetaOpen}
          onOpenChange={setModalMetaOpen}
          onSuccess={fetchDetails}
        />

        {/* Modal Resolver Alerta */}
        <ResolverAlertaModal
          alerta={alertaAberto || null}
          open={modalResolverOpen}
          onOpenChange={setModalResolverOpen}
          onSuccess={fetchDetails}
        />
      </SheetContent>
    </Sheet>
  )
}
