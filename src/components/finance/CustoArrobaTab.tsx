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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Trophy, TrendingDown, DollarSign, Scale, Beef, AlertCircle, Sparkles } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { getLots, LotRecord } from '@/services/lots'
import { getPesagens, PesagemRecord } from '@/services/pesagens'
import { useCustoArroba, CustoArrobaPorLote } from '@/services/custoArroba'

export function CustoArrobaTab() {
  const [lots, setLots] = useState<LotRecord[]>([])
  const [pesagens, setPesagens] = useState<PesagemRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarDadosReais() {
      try {
        setLoading(true)
        const [lotsData, pesagensData] = await Promise.all([getLots(), getPesagens()])
        setLots(lotsData || [])
        setPesagens(pesagensData || [])
      } catch (err) {
        console.error('Erro ao carregar lotes e pesagens reais:', err)
      } finally {
        setLoading(false)
      }
    }
    carregarDadosReais()
  }, [])

  const { analises, consolidado } = useCustoArroba(lots, pesagens)

  // Filtramos os lotes que têm arrobas produzidas válidas para o comparativo
  const lotesComProducao = analises.filter(
    (a) => a.temFechamentoValido && a.arrobasProduzidasTotal > 0,
  )
  const lotesSemFechamento = analises.filter(
    (a) => !a.temFechamentoValido || a.arrobasProduzidasTotal <= 0,
  )

  // Dados para o gráfico com base real
  const chartData = lotesComProducao.map((lote) => ({
    lote: lote.loteNome,
    custoArroba: lote.custoPorArroba || 0,
    custoNutricaoArroba: lote.custoNutricaoPorArroba || 0,
    custoSanidadeArroba: lote.custoSanidadePorArroba || 0,
    arrobas: lote.arrobasProduzidasTotal,
  }))

  const chartConfig = {
    custoArroba: { label: 'Custo Total / @ (R$)', color: 'hsl(var(--destructive))' },
    custoNutricaoArroba: { label: 'Nutrição / @ (R$)', color: 'hsl(var(--primary))' },
    custoSanidadeArroba: { label: 'Sanidade / @ (R$)', color: 'hsl(var(--chart-2))' },
  }

  const menorCusto = consolidado.loteMaisEficiente?.custoPorArroba || 0

  return (
    <div className="space-y-6 mt-0 animate-fade-in">
      {/* Cards de Métricas Consolidadas Reais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Mais Eficiente (Menor Custo/@)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />{' '}
              {consolidado.loteMaisEficiente
                ? formatCurrency(consolidado.loteMaisEficiente.custoPorArroba || 0)
                : 'Apurando...'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lote:{' '}
              <strong className="text-foreground">
                {consolidado.loteMaisEficiente?.loteNome || '-'}
              </strong>{' '}
              • Produziu {consolidado.loteMaisEficiente?.arrobasProduzidasTotal || 0} @
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Custo Médio Consolidado / @
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-emerald-500" />{' '}
              {consolidado.custoMedioPorArroba
                ? formatCurrency(consolidado.custoMedioPorArroba)
                : 'R$ 0,00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ponderado sobre {formatNumber(consolidado.totalArrobasProduzidas, 1)} @ produzidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Volume Total de @ Produzidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Scale className="h-5 w-5 text-primary" />{' '}
              {formatNumber(consolidado.totalArrobasProduzidas, 1)} @
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de {consolidado.totalCabecas} cabeças em {consolidado.totalLotesValidos} lote(s)
              com pesagem de entrada e saída
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Custo Operacional Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2 text-destructive">
              <DollarSign className="h-5 w-5" /> {formatCurrency(consolidado.custoTotalConsolidado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Nutrição ({formatCurrency(consolidado.custoNutricaoConsolidado)}) + Sanidade (
              {formatCurrency(consolidado.custoSanidadeConsolidado)})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Comparativo & Tabela Detalhada Real */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Custo por @ por Lote Fechado</CardTitle>
            <CardDescription>
              Comparativo real do custo por @ produzida e divisão entre nutrição e sanidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="lote" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <ChartTooltip
                    cursor={{ fill: 'var(--color-muted)' }}
                    content={<ChartTooltipContent />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="custoNutricaoArroba"
                    stackId="a"
                    fill="var(--color-custoNutricaoArroba)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="custoSanidadeArroba"
                    stackId="a"
                    fill="var(--color-custoSanidadeArroba)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground text-sm">
                <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground/60" />
                Nenhum lote com pesagem de entrada e saída suficiente para cálculo do gráfico.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Cruzamento Zootécnico: @ Produzidas x Custos do Período</span>
              <Badge variant="outline" className="font-mono text-xs">
                Base Real Exagro
              </Badge>
            </CardTitle>
            <CardDescription>
              Conforme metodologia Exagro, o lote requer pesagem de entrada e saída registradas para
              apurar o ganho total em arrobas (@) e o custo efetivo por arroba produzida.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Frente / Fase</TableHead>
                  <TableHead className="text-right">Cab</TableHead>
                  <TableHead className="text-right">Entrada / Saída (kg)</TableHead>
                  <TableHead className="text-right">@ Produzidas</TableHead>
                  <TableHead className="text-right">Nutrição (R$)</TableHead>
                  <TableHead className="text-right">Sanidade (R$)</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right font-bold text-destructive">Custo / @</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotesComProducao.map((lote) => {
                  const isBest = lote.loteId === consolidado.loteMaisEficiente?.loteId
                  return (
                    <TableRow key={lote.loteId} className={isBest ? 'bg-primary/5' : ''}>
                      <TableCell className="font-bold text-primary whitespace-nowrap">
                        {lote.loteNome}
                        {lote.isArrendamento && (
                          <Badge
                            variant="outline"
                            className="ml-1 text-[10px] text-amber-600 border-amber-300"
                          >
                            Arrendamento
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap capitalize">
                        {lote.frente} • {lote.fase}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {lote.headcount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                        {lote.pesoEntradaKg.toFixed(0)} &rarr; {lote.pesoSaidaKg.toFixed(0)} kg
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-emerald-600 whitespace-nowrap">
                        {formatNumber(lote.arrobasProduzidasTotal, 1)} @
                        <span className="text-[10px] text-muted-foreground block font-normal">
                          ({formatNumber(lote.arrobasProduzidasPorCabeca, 1)} @/cab)
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                        {formatCurrency(lote.custoNutricao)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                        {formatCurrency(lote.custoSanidade)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                        {formatCurrency(lote.custoTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-destructive text-sm whitespace-nowrap">
                        {lote.custoPorArroba ? formatCurrency(lote.custoPorArroba) : '-'}
                      </TableCell>
                      <TableCell className="text-center w-8">
                        {isBest && (
                          <span title="Mais Eficiente">
                            <Trophy className="h-4 w-4 text-amber-500" />
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {/* Linha de consolidação ponderada */}
                {lotesComProducao.length > 0 && (
                  <TableRow className="bg-muted/40 font-bold border-t-2">
                    <TableCell colSpan={2}>CONSOLIDADO REAL</TableCell>
                    <TableCell className="text-right font-mono">
                      {consolidado.totalCabecas}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      Média Ponderada
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">
                      {formatNumber(consolidado.totalArrobasProduzidas, 1)} @
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(consolidado.custoNutricaoConsolidado)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(consolidado.custoSanidadeConsolidado)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(consolidado.custoTotalConsolidado)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive text-base">
                      {consolidado.custoMedioPorArroba
                        ? formatCurrency(consolidado.custoMedioPorArroba)
                        : '-'}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Aviso sobre lotes em andamento sem pesagem de saída */}
            {lotesSemFechamento.length > 0 && (
              <div className="p-3 bg-muted/20 border-t text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  ℹ️ {lotesSemFechamento.length} lote(s) em andamento aguardando pesagem de saída
                  para cálculo de @ produzidas (
                  {lotesSemFechamento.map((l) => l.loteNome).join(', ')}).
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
