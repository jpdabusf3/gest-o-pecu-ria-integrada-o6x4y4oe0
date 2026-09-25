import { useState, useMemo, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  TrendingUp,
  Scale,
  DollarSign,
  HelpCircle,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  LineChart,
  Wallet,
  RefreshCw,
  Clock,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ModalDefinirMetasSafra } from '@/components/gestor/ModalDefinirMetasSafra'
import { getMetasSafra, calcularAtingimentoMeta, type MetasSafraMap } from '@/services/metasSafra'
import {
  ProjecaoSafraResult,
  calcularProjecaoSafra,
  SegregacaoArrendamento,
  TipoCenarioProjecao,
  CenarioProjecaoItem,
} from '@/services/projecaoSafra'
import { ConfigBenchmarkRecord } from '@/services/configBenchmark'
import { LotRecord } from '@/services/lots'
import { PesagemRecord } from '@/services/pesagens'
import {
  MovimentacaoRebanhoRecord,
  VendaRecord,
  CompraGadoRecord,
  LancamentoFinanceiroRecord,
  EstoqueInsumoRecord,
  ImobilizadoRecord,
} from '@/services/fechamento'
import { getCotacaoB3BoiGordoVigente, type CotacaoB3BoiGordoVigente } from '@/services/market'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'

interface CardProjecaoSafraProps {
  lots: LotRecord[]
  pesagens: PesagemRecord[]
  movimentacoes: MovimentacaoRebanhoRecord[]
  vendas: VendaRecord[]
  compras: CompraGadoRecord[]
  financeiro: LancamentoFinanceiroRecord[]
  estoque: EstoqueInsumoRecord[]
  imobilizado: ImobilizadoRecord[]
  benchmarks: ConfigBenchmarkRecord[]
  className?: string
}

export function CardProjecaoSafra({
  lots,
  pesagens,
  movimentacoes,
  vendas,
  compras,
  financeiro,
  estoque,
  imobilizado,
  benchmarks,
  className = '',
}: CardProjecaoSafraProps) {
  const [segregacao, setSegregacao] = useState<SegregacaoArrendamento>('consolidada')
  const [mostrarBaseCalculo, setMostrarBaseCalculo] = useState<boolean>(false)
  const [cenarioAtivo, setCenarioAtivo] = useState<TipoCenarioProjecao>('realista')
  const [cotacaoB3, setCotacaoB3] = useState<CotacaoB3BoiGordoVigente | null>(null)
  const [modalMetasOpen, setModalMetasOpen] = useState(false)
  const [metasSafraMap, setMetasSafraMap] = useState<MetasSafraMap>({})

  // Cotação B3 vigente do Boi Gordo (serviço centralizado, mesma fonte usada no Hedge)
  useEffect(() => {
    let montado = true
    getCotacaoB3BoiGordoVigente()
      .then((c) => {
        if (montado) setCotacaoB3(c)
      })
      .catch(() => {
        if (montado)
          setCotacaoB3({
            preco: 245.0,
            dataReferencia: new Date().toISOString(),
            origem: 'fallback',
            regiao: 'B3',
            desatualizada: false,
            diasAtraso: 0,
          })
      })
    return () => {
      montado = false
    }
  }, [])

  // Carregar metas da safra vigente
  const carregarMetasSafra = () => {
    getMetasSafra().then((m) => {
      setMetasSafraMap(m)
    })
  }

  useEffect(() => {
    carregarMetasSafra()
  }, [])

  // Executa o cálculo da projeção usando o acumulado real + cotação B3 vigente
  const projecao: ProjecaoSafraResult = useMemo(() => {
    const preco = cotacaoB3?.preco ?? 245.0
    return calcularProjecaoSafra({
      lots,
      pesagens,
      movimentacoes,
      vendas,
      compras,
      financeiro,
      estoque,
      imobilizado,
      benchmarks,
      segregacao,
      frente: 'todas',
      cotacaoArroba: preco,
      cotacaoB3DataReferencia: cotacaoB3?.dataReferencia,
      cotacaoB3Desatualizada: cotacaoB3?.desatualizada ?? false,
      cotacaoB3DiasAtraso: cotacaoB3?.diasAtraso ?? 0,
      cotacaoB3Origem: cotacaoB3?.origem ?? 'b3_real',
    })
  }, [
    lots,
    pesagens,
    movimentacoes,
    vendas,
    compras,
    financeiro,
    estoque,
    imobilizado,
    benchmarks,
    segregacao,
    cotacaoB3,
  ])

  // Cenário ativo exibido no bloco de simulações
  const cenarioAtivoItem: CenarioProjecaoItem = projecao.cenarios[cenarioAtivo]
  const clProd = projecao.classificacaoArrobasHaAno
  const clCusto = projecao.classificacaoCustoArroba
  const faixasProd = clProd.faixas
  const faixasCusto = clCusto.faixas

  // Metas da safra vigentes para exibição e atingimento
  const metaProdRecord = metasSafraMap.arroba_ha_ano
  const metaCustoRecord = metasSafraMap.custo_arroba
  const valorMetaProd = metaProdRecord?.valor_alvo ?? null
  const valorMetaCusto = metaCustoRecord?.valor_alvo ?? null

  const atingimentoProd =
    valorMetaProd !== null
      ? calcularAtingimentoMeta('arroba_ha_ano', projecao.projetado.arrobasPorHaAno, valorMetaProd)
      : null

  const atingimentoCusto =
    valorMetaCusto !== null
      ? calcularAtingimentoMeta(
          'custo_arroba',
          projecao.projetado.custoArrobaProduzida,
          valorMetaCusto,
        )
      : null

  // Normalização visual para a barra do @/ha/ano (0 a 14 @/ha/ano)
  const maxProdEscala = 14
  const pctProd = Math.min(
    100,
    Math.max(2, (projecao.projetado.arrobasPorHaAno / maxProdEscala) * 100),
  )
  const pctMediaProd = (faixasProd.media / maxProdEscala) * 100
  const pctRefProd = (faixasProd.referencia / maxProdEscala) * 100
  const pctTopProd = (faixasProd.top / maxProdEscala) * 100

  return (
    <Card
      className={`border-primary/30 shadow-md bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden ${className}`}
    >
      <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    Projeção de Fechamento de Safra ({projecao.anoSafra})
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/40 text-[10px] font-mono uppercase"
                  >
                    Projeção Estimada
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    Acumulado de <strong>{projecao.periodoRotulo}</strong> extrapolado para os 12
                    meses da safra
                  </span>
                </CardDescription>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Seletor de Segregação (Própria vs Arrendamento vs Consolidado) */}
            <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border">
              <Tabs
                value={segregacao}
                onValueChange={(v) => setSegregacao(v as SegregacaoArrendamento)}
                className="w-full sm:w-auto"
              >
                <TabsList className="h-7 bg-transparent p-0 gap-0.5">
                  <TabsTrigger
                    value="propria"
                    className="h-6 text-[11px] font-medium px-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                  >
                    Própria
                  </TabsTrigger>
                  <TabsTrigger
                    value="arrendamento"
                    className="h-6 text-[11px] font-medium px-2 data-[state=active]:bg-background data-[state=active]:shadow-xs text-amber-700 dark:text-amber-300"
                  >
                    Arrendamento
                  </TabsTrigger>
                  <TabsTrigger
                    value="consolidada"
                    className="h-6 text-[11px] font-medium px-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                  >
                    Consolidado
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalMetasOpen(true)}
                className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              >
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>Metas da Safra</span>
              </Button>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Link to="/fechamento?tab=safras-comparativo">
                  <span>Ver Fechamento</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Régua de Progresso Temporal da Safra */}
        <div className="pt-2 mt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium mb-1.5">
            <span className="flex items-center gap-1">
              <span>Progresso temporal:</span>
              <strong className="text-foreground font-mono">
                {projecao.diasDecorridos} de {projecao.diasTotaisSafra} dias
              </strong>
            </span>
            <span className="font-mono font-bold text-primary">
              safra {projecao.percentualSafraPercorrido.toFixed(1)}% percorrida
            </span>
          </div>
          <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(2, projecao.percentualSafraPercorrido))}%`,
              }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Bloco com os Dois Indicadores Centrais: @/ha/ano e Custo/@ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Indicador 1: @/ha/ano Projetado vs Faixas Camada 2 (6,6 / 10,0 / 11,0) */}
          <div className="p-4 rounded-xl border bg-background/70 space-y-3 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Produtividade Pastoril Projetada
                    </span>
                    <h4 className="text-sm font-bold text-foreground">@ / ha / ano (12 meses)</h4>
                  </div>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Faixas Camada 2 de Referência"
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs space-y-1">
                      <p className="font-bold">Faixas Camada 2 de Referência (@/ha/ano):</p>
                      <p>🔴 Abaixo da Média: &lt; {faixasProd.media.toFixed(1)}</p>
                      <p>
                        🟡 Na Média: {faixasProd.media.toFixed(1)} a{' '}
                        {(faixasProd.referencia - 0.1).toFixed(1)}
                      </p>
                      <p>🟢 Nível Referência: ≥ {faixasProd.referencia.toFixed(1)}</p>
                      <p>⭐ Nível TOP: ≥ {faixasProd.top.toFixed(1)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Valor Numérico Principal e Selo */}
              <div className="flex items-end justify-between mt-3 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground font-medium block">
                    Projeção de Fechamento:
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black font-mono tracking-tight text-foreground">
                      {projecao.projetado.arrobasPorHaAno.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      @ / ha / ano
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Realizado até hoje:{' '}
                    <strong className="font-mono text-foreground">
                      {projecao.acumulado.arrobasPorHa.toFixed(2)} @/ha
                    </strong>{' '}
                    ({projecao.acumulado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @)
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {clProd.seloTop ? (
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-bold px-2.5 py-0.5 text-xs shadow-xs flex items-center gap-1 border-amber-300">
                      <Sparkles className="w-3.5 h-3.5 fill-neutral-950" />
                      TOP BRASIL
                    </Badge>
                  ) : clProd.status === 'verde' ? (
                    <Badge className="bg-emerald-600 text-white font-semibold px-2 py-0.5 text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      REFERÊNCIA
                    </Badge>
                  ) : clProd.status === 'amarelo' ? (
                    <Badge className="bg-amber-500 text-neutral-950 font-semibold px-2 py-0.5 text-xs flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      NA MÉDIA
                    </Badge>
                  ) : (
                    <Badge
                      variant="destructive"
                      className="font-semibold px-2 py-0.5 text-xs flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      ABAIXO DA MÉDIA
                    </Badge>
                  )}

                  <span className="text-[11px] font-mono text-muted-foreground">
                    Alvo:{' '}
                    <strong className="text-foreground">{faixasProd.alvo.toFixed(1)} @/ha</strong>
                  </span>
                </div>
              </div>

              {/* Barra Semafórica Camada 2 */}
              <div className="space-y-1.5 pt-2">
                <div className="relative w-full">
                  <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-muted/60">
                    <div
                      style={{ width: `${pctMediaProd}%` }}
                      className="bg-red-400/80 dark:bg-red-500/60"
                      title={`Abaixo da média (< ${faixasProd.media})`}
                    />
                    <div
                      style={{ width: `${pctRefProd - pctMediaProd}%` }}
                      className="bg-amber-400/80 dark:bg-amber-500/60"
                      title={`Média (${faixasProd.media} a ${faixasProd.referencia})`}
                    />
                    <div
                      style={{ width: `${pctTopProd - pctRefProd}%` }}
                      className="bg-emerald-500/80 dark:bg-emerald-500/70"
                      title={`Referência (${faixasProd.referencia} a ${faixasProd.top})`}
                    />
                    <div
                      style={{ width: `${100 - pctTopProd}%` }}
                      className="bg-purple-500/80 dark:bg-purple-500/70"
                      title={`TOP Brasil (≥ ${faixasProd.top})`}
                    />
                  </div>

                  {/* Marcador do Ponto Projetado */}
                  <div
                    className="absolute -top-1 -bottom-1 w-2.5 bg-neutral-950 dark:bg-white rounded-full shadow-md border-2 border-background -translate-x-1/2 transition-all duration-500"
                    style={{ left: `${Math.min(98, Math.max(2, pctProd))}%` }}
                    title={`Projeção: ${projecao.projetado.arrobasPorHaAno.toFixed(2)} @/ha/ano`}
                  />
                </div>

                <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground pt-1 border-t">
                  <div className="text-left font-mono">&lt; {faixasProd.media.toFixed(1)}</div>
                  <div className="text-center font-mono">
                    {faixasProd.media.toFixed(1)} - {(faixasProd.referencia - 0.1).toFixed(1)}
                  </div>
                  <div className="text-center font-mono text-emerald-600 font-bold">
                    ≥ {faixasProd.referencia.toFixed(1)} (Ref)
                  </div>
                  <div className="text-right font-mono text-purple-600 font-bold">
                    ≥ {faixasProd.top.toFixed(1)} (TOP)
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnóstico em Semáforo */}
            <div
              className={`p-2 rounded-lg border text-xs flex items-center justify-between ${clProd.cor}`}
            >
              <span className="font-semibold">{clProd.label}</span>
              <span className="font-mono text-[11px] font-bold">
                {projecao.projetado.arrobasPorHaAno >= faixasProd.alvo ? (
                  <span className="text-emerald-700 dark:text-emerald-300">
                    +{(projecao.projetado.arrobasPorHaAno - faixasProd.alvo).toFixed(2)} @/ha vs
                    alvo
                  </span>
                ) : (
                  <span className="text-destructive">
                    -{(faixasProd.alvo - projecao.projetado.arrobasPorHaAno).toFixed(2)} @/ha para
                    atingir o alvo
                  </span>
                )}
              </span>
            </div>

            {/* Metas da Safra & Barra de Atingimento */}
            <div className="p-2.5 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  Meta da Safra:{' '}
                  {valorMetaProd !== null ? `${valorMetaProd.toFixed(1)} @/ha/ano` : 'Não definida'}
                </span>
                {atingimentoProd ? (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-1.5 py-0 ${atingimentoProd.corBadge}`}
                  >
                    {atingimentoProd.mensagem}
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalMetasOpen(true)}
                    className="h-5 text-[10px] text-emerald-700 dark:text-emerald-300 p-0 hover:underline"
                  >
                    Definir meta da safra
                  </Button>
                )}
              </div>

              {atingimentoProd && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>
                      Projeção atual:{' '}
                      <strong>{projecao.projetado.arrobasPorHaAno.toFixed(1)} @/ha</strong>
                    </span>
                    <span className="font-mono font-bold">
                      {atingimentoProd.percentual}% da meta
                    </span>
                  </div>
                  <Progress value={Math.min(100, atingimentoProd.percentual)} className="h-1.5" />
                </div>
              )}
            </div>
          </div>

          {/* Indicador 2: Custo/@ Projetado vs Referência (R$ 199,59) */}
          <div className="p-4 rounded-xl border bg-background/70 space-y-3 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Eficiência Econômica Projetada
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      Custo da @ Produzida (sem reposição)
                    </h4>
                  </div>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Faixas de Custo de Referência"
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs space-y-1">
                      <p className="font-bold">Faixas de Custo de Referência (sem reposição):</p>{' '}
                      <p>⭐ TOP Menor Custo: ≤ R$ {faixasCusto.top.toFixed(2)}</p>
                      <p>🟢 Nível Referência: ≤ R$ {faixasCusto.referencia.toFixed(2)}</p>
                      <p>🟡 Na Média: ≤ R$ {faixasCusto.media.toFixed(2)}</p>
                      <p>🔴 Acima do Custo Médio: &gt; R$ {faixasCusto.media.toFixed(2)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Valor Numérico Principal e Selo */}
              <div className="flex items-end justify-between mt-3 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground font-medium block">
                    Custo/@ Projetado:
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black font-mono tracking-tight text-foreground">
                      {formatCurrency(projecao.projetado.custoArrobaProduzida)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">/ @</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Custos operacionais extrapolados:{' '}
                    <strong className="font-mono text-foreground">
                      {formatCurrency(projecao.projetado.custoOperacionalSemReposicaoRs)}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {clCusto.seloTop ? (
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-bold px-2.5 py-0.5 text-xs shadow-xs flex items-center gap-1 border-amber-300">
                      <Sparkles className="w-3.5 h-3.5 fill-neutral-950" />
                      TOP BRASIL
                    </Badge>
                  ) : clCusto.seloReferencia ? (
                    <Badge className="bg-emerald-600 text-white font-semibold px-2 py-0.5 text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      NÍVEL REF
                    </Badge>
                  ) : clCusto.status === 'amarelo' ? (
                    <Badge className="bg-amber-500 text-neutral-950 font-semibold px-2 py-0.5 text-xs flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      NA MÉDIA
                    </Badge>
                  ) : (
                    <Badge
                      variant="destructive"
                      className="font-semibold px-2 py-0.5 text-xs flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      CUSTO ELEVADO
                    </Badge>
                  )}

                  <span className="text-[11px] font-mono text-muted-foreground">
                    Ref. Mercado:{' '}
                    <strong className="text-foreground">
                      {formatCurrency(faixasCusto.referencia)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Barra de Faixa de Custo (Invertida: menor custo à direita) */}
              <div className="space-y-1.5 pt-2">
                <div className="relative w-full">
                  <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-muted/60">
                    <div
                      style={{ width: '30%' }}
                      className="bg-red-400/80 dark:bg-red-500/60"
                      title="Acima da Média de Custo"
                    />
                    <div
                      style={{ width: '35%' }}
                      className="bg-amber-400/80 dark:bg-amber-500/60"
                      title="Na Média de Mercado"
                    />
                    <div
                      style={{ width: '20%' }}
                      className="bg-emerald-500/80 dark:bg-emerald-500/70"
                      title="Nível Referência"
                    />
                    <div
                      style={{ width: '15%' }}
                      className="bg-purple-500/80 dark:bg-purple-500/70"
                      title="TOP Menor Custo"
                    />
                  </div>

                  {/* Marcador do Ponto de Custo Projetado */}
                  <div
                    className="absolute -top-1 -bottom-1 w-2.5 bg-neutral-950 dark:bg-white rounded-full shadow-md border-2 border-background -translate-x-1/2 transition-all duration-500"
                    style={{
                      left: `${Math.min(
                        98,
                        Math.max(
                          2,
                          clCusto.percentualBarra !== undefined ? clCusto.percentualBarra : 65,
                        ),
                      )}%`,
                    }}
                    title={`Custo Projetado: R$ ${projecao.projetado.custoArrobaProduzida.toFixed(2)}/@`}
                  />
                </div>

                <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground pt-1 border-t">
                  <div className="text-left font-mono">&gt; R$ {faixasCusto.media.toFixed(0)}</div>
                  <div className="text-center font-mono">
                    ≤ R$ {faixasCusto.media.toFixed(0)} (Média)
                  </div>
                  <div className="text-center font-mono text-emerald-600 font-bold">
                    ≤ R$ {faixasCusto.referencia.toFixed(0)} (Ref)
                  </div>
                  <div className="text-right font-mono text-purple-600 font-bold">
                    ≤ R$ {faixasCusto.top.toFixed(0)} (TOP)
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnóstico em Semáforo */}
            <div
              className={`p-2 rounded-lg border text-xs flex items-center justify-between ${clCusto.cor}`}
            >
              <span className="font-semibold">{clCusto.label}</span>
              <span className="font-mono text-[11px] font-bold">
                {projecao.projetado.custoArrobaProduzida <= faixasCusto.referencia ? (
                  <span className="text-emerald-700 dark:text-emerald-300">
                    -R${' '}
                    {(faixasCusto.referencia - projecao.projetado.custoArrobaProduzida).toFixed(2)}
                    /@ abaixo da ref
                  </span>
                ) : (
                  <span className="text-destructive">
                    +R${' '}
                    {(projecao.projetado.custoArrobaProduzida - faixasCusto.referencia).toFixed(2)}
                    /@ acima da ref
                  </span>
                )}
              </span>
            </div>

            {/* Metas da Safra & Barra de Atingimento de Custo */}
            <div className="p-2.5 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-600" />
                  Meta da Safra:{' '}
                  {valorMetaCusto !== null ? formatCurrency(valorMetaCusto) + '/@' : 'Não definida'}
                </span>
                {atingimentoCusto ? (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-1.5 py-0 ${atingimentoCusto.corBadge}`}
                  >
                    {atingimentoCusto.mensagem}
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalMetasOpen(true)}
                    className="h-5 text-[10px] text-emerald-700 dark:text-emerald-300 p-0 hover:underline"
                  >
                    Definir meta da safra
                  </Button>
                )}
              </div>

              {atingimentoCusto && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>
                      Projeção atual:{' '}
                      <strong>{formatCurrency(projecao.projetado.custoArrobaProduzida)}/@</strong>
                    </span>
                    <span className="font-mono font-bold">
                      {projecao.projetado.custoArrobaProduzida <= (valorMetaCusto ?? 0)
                        ? 'Dentro do teto'
                        : 'Acima do teto'}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.max(0, atingimentoCusto.percentual))}
                    className="h-1.5"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PROJEÇÃO DE RECEITA: @ projetado × Cotação B3 vigente do Boi Gordo */}
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Projeção de Receita de Fechamento da Safra
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  @ projetada × Cotação B3 Boi Gordo vigente
                </h4>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-background text-blue-700 dark:text-blue-300 border-blue-400/40 font-mono text-[11px] px-2"
              >
                B3: {formatCurrency(projecao.cotacaoB3.preco)}/@
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'font-mono text-[10px] px-2',
                  projecao.cotacaoB3.desatualizada
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/40'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/40',
                )}
              >
                <Clock className="w-3 h-3 mr-1" />
                {projecao.cotacaoB3.desatualizada
                  ? `Atualizada há ${projecao.cotacaoB3.diasAtraso} dia(s)`
                  : 'Cotação vigente'}
              </Badge>
              {cotacaoB3?.dataReferencia && (
                <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
                  ref:{' '}
                  {new Date(cotacaoB3.dataReferencia).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>

          {projecao.cotacaoB3.desatualizada && (
            <div className="p-2 rounded-lg border border-amber-400/40 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                A cotação B3 disponível está desatualizada (última referência registrada{' '}
                {cotacaoB3?.diasAtraso ?? 0} dia(s) atrás). A receita projetada usa o último preço
                conhecido de {formatCurrency(projecao.cotacaoB3.preco)}/@.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-card text-center space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                @ Projetada
              </span>
              <span className="text-xl font-black font-mono text-foreground block">
                {projecao.projetado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @
              </span>
              <span className="text-[10px] text-muted-foreground block">
                acumulado: {projecao.acumulado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @
              </span>
            </div>

            <div className="p-3 rounded-lg border bg-card text-center space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                Cotação B3 Vigente
              </span>
              <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 block">
                {formatCurrency(projecao.cotacaoB3.preco)}
              </span>
              <span className="text-[10px] text-muted-foreground block">por arroba (@)</span>
            </div>

            <div className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/40 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300 block">
                Receita Projetada (B3)
              </span>
              <span className="text-xl font-black font-mono text-blue-700 dark:text-blue-300 block">
                {formatCurrency(projecao.receitaProjetadaB3Rs)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Resultado operacional:{' '}
                <strong
                  className={
                    projecao.resultadoOperacionalProjetadoRs >= 0
                      ? 'text-emerald-600'
                      : 'text-destructive'
                  }
                >
                  {formatCurrency(projecao.resultadoOperacionalProjetadoRs)}
                </strong>
              </span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Fórmula:</strong> Receita Projetada = @ Projetada ×
            Cotação B3 Vigente ({projecao.projetado.arrobasProduzidasTotal.toLocaleString('pt-BR')}{' '}
            @ × {formatCurrency(projecao.cotacaoB3.preco)}/@ ={' '}
            {formatCurrency(projecao.receitaProjetadaB3Rs)}). Resultado Operacional = Receita
            Projetada − Custo Operacional Projetado (
            {formatCurrency(projecao.projetado.custoOperacionalSemReposicaoRs)}).
          </p>
        </div>

        {/* CENÁRIOS DE PROJEÇÃO: Otimista / Realista / Pessimista (GMD × Custo) */}
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <LineChart className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Cenários de Projeção de Safra
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  Simulação Otimista / Realista / Pessimista
                </h4>
              </div>
            </div>

            <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border">
              <Tabs
                value={cenarioAtivo}
                onValueChange={(v) => setCenarioAtivo(v as TipoCenarioProjecao)}
              >
                <TabsList className="h-7 bg-transparent p-0 gap-0.5">
                  <TabsTrigger
                    value="otimista"
                    className="h-6 text-[11px] font-medium px-2.5 data-[state=active]:bg-background data-[state=active]:shadow-xs text-emerald-700 dark:text-emerald-400"
                  >
                    Otimista
                  </TabsTrigger>
                  <TabsTrigger
                    value="realista"
                    className="h-6 text-[11px] font-medium px-2.5 data-[state=active]:bg-background data-[state=active]:shadow-xs text-blue-600 dark:text-blue-400"
                  >
                    Realista
                  </TabsTrigger>
                  <TabsTrigger
                    value="pessimista"
                    className="h-6 text-[11px] font-medium px-2.5 data-[state=active]:bg-background data-[state=active]:shadow-xs text-rose-600 dark:text-rose-400"
                  >
                    Pessimista
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/40 text-[10px] font-mono uppercase"
          >
            Simulação — Projeção Estimada
          </Badge>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card do Cenário Ativo (maior destaque) */}
            <div className="p-3 rounded-lg border-2 border-primary/50 bg-card space-y-2 md:col-span-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {cenarioAtivo === 'otimista'
                    ? 'Otimista'
                    : cenarioAtivo === 'realista'
                      ? 'Realista (Base)'
                      : 'Pessimista'}
                </span>
                <Badge variant="outline" className="text-[9px] font-mono px-1 py-0">
                  {cenarioAtivoItem.variacaoGmdPct >= 0 ? '+' : ''}
                  {cenarioAtivoItem.variacaoGmdPct.toFixed(0)}% GMD ·{' '}
                  {cenarioAtivoItem.variacaoCustoPct >= 0 ? '+' : ''}
                  {cenarioAtivoItem.variacaoCustoPct.toFixed(0)}% Custo
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-[9px] text-muted-foreground uppercase block font-bold">
                    GMD
                  </span>
                  <span className="text-base font-black font-mono text-foreground block">
                    {cenarioAtivoItem.gmdMedioKgDia.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-muted-foreground block">kg/dia</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-[9px] text-muted-foreground uppercase block font-bold">
                    Custo/@
                  </span>
                  <span className="text-base font-black font-mono text-foreground block">
                    {formatCurrency(cenarioAtivoItem.custoArrobaProduzida)}
                  </span>
                  <span className="text-[9px] text-muted-foreground block">por @</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-[9px] text-muted-foreground uppercase block font-bold">
                    @/ha/ano
                  </span>
                  <span
                    className={cn(
                      'text-base font-black font-mono block',
                      cenarioAtivoItem.classificacaoArrobasHaAno.status === 'verde'
                        ? 'text-emerald-600'
                        : cenarioAtivoItem.classificacaoArrobasHaAno.status === 'amarelo'
                          ? 'text-amber-600'
                          : 'text-rose-600',
                    )}
                  >
                    {cenarioAtivoItem.arrobasPorHaAno.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-muted-foreground block">projetado</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-[9px] text-muted-foreground uppercase block font-bold">
                    Receita B3
                  </span>
                  <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400 block">
                    {formatCurrency(cenarioAtivoItem.receitaProjetadaB3Rs)}
                  </span>
                  <span className="text-[9px] text-muted-foreground block">
                    {cenarioAtivoItem.arrobasProduzidasTotal.toLocaleString('pt-BR', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    @
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  'p-2 rounded-lg border text-xs flex items-center justify-between',
                  cenarioAtivoItem.classificacaoArrobasHaAno.cor,
                )}
              >
                <span className="font-semibold">
                  {cenarioAtivoItem.classificacaoArrobasHaAno.label.split('(')[0]}
                </span>
                <span className="font-mono text-[11px] font-bold">
                  <span
                    className={
                      cenarioAtivoItem.resultadoLiquidoRs >= 0
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-destructive'
                    }
                  >
                    {formatCurrency(cenarioAtivoItem.resultadoLiquidoRs)}
                  </span>
                </span>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {cenarioAtivoItem.descricao}
              </p>
            </div>

            {/* Resumo compacto dos três cenários */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['otimista', 'realista', 'pessimista'] as TipoCenarioProjecao[]).map((tipo) => {
                const c = projecao.cenarios[tipo]
                const ativo = tipo === cenarioAtivo
                return (
                  <button
                    type="button"
                    key={tipo}
                    onClick={() => setCenarioAtivo(tipo)}
                    className={cn(
                      'p-3 rounded-lg border text-left space-y-1.5 transition-all hover:shadow-xs text-card-foreground',
                      ativo
                        ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border bg-card',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {tipo === 'otimista'
                          ? 'Otimista'
                          : tipo === 'realista'
                            ? 'Realista'
                            : 'Pessimista'}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1 py-0 font-mono',
                          c.classificacaoArrobasHaAno.cor,
                        )}
                      >
                        {c.classificacaoArrobasHaAno.label.split('(')[0]}
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-black font-mono text-foreground">
                        {c.arrobasPorHaAno.toFixed(2)} @/ha
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-mono font-bold',
                          tipo === 'otimista'
                            ? 'text-emerald-600'
                            : tipo === 'realista'
                              ? 'text-blue-600'
                              : 'text-rose-600',
                        )}
                      >
                        {c.variacaoGmdPct >= 0 ? '+' : ''}
                        {c.variacaoGmdPct.toFixed(0)}% GMD
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-[10px]">
                      <span className="text-muted-foreground">
                        Custo/@:{' '}
                        <strong className="text-foreground font-mono">
                          {formatCurrency(c.custoArrobaProduzida)}
                        </strong>
                      </span>
                      <span className="text-muted-foreground">
                        {c.variacaoCustoPct >= 0 ? '+' : ''}
                        {c.variacaoCustoPct.toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-[10px] pt-1 border-t">
                      <span className="text-muted-foreground">Receita B3:</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(c.receitaProjetadaB3Rs)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-[10px]">
                      <span className="text-muted-foreground">Resultado:</span>
                      <span
                        className={cn(
                          'font-mono font-bold',
                          c.resultadoLiquidoRs >= 0 ? 'text-emerald-600' : 'text-destructive',
                        )}
                      >
                        {formatCurrency(c.resultadoLiquidoRs)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Planejamento de Venda Antecipada */}
          <div className="p-3 rounded-lg border bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-foreground">
                Planejamento de Venda Antecipada (Insight de Cenários)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Comparando os cenários com a cotação B3 vigente (
              {formatCurrency(projecao.cotacaoB3.preco)}/@):
              <br />• No cenário <strong className="text-emerald-600">otimista</strong>, a safra
              fecha com receita de{' '}
              <strong className="text-emerald-600 font-mono">
                {formatCurrency(projecao.cenarios.otimista.receitaProjetadaB3Rs)}
              </strong>{' '}
              (GMD {projecao.cenarios.otimista.gmdMedioKgDia.toFixed(2)} kg/dia). Vale antecipar
              vendas com preço travado em B3 se o mercado oferece{' '}
              {formatCurrency(projecao.cotacaoB3.preco)}/@ ou mais.
              <br />• No cenário <strong className="text-blue-600">realista</strong>, a receita
              projetada é{' '}
              <strong className="font-mono">
                {formatCurrency(projecao.cenarios.realista.receitaProjetadaB3Rs)}
              </strong>
              . Se o resultado do pessimista (
              {formatCurrency(projecao.cenarios.pessimista.resultadoLiquidoRs)}) comprometer margem,
              considerar antecipar parcela do desfrute.
            </p>
          </div>
        </div>

        {/* Resumo de Indicadores Complementares da Projeção */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="p-2.5 rounded-lg border bg-muted/20">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">
              @ Total Projetada
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-foreground">
              {projecao.projetado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              acumulado: {projecao.acumulado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @
            </span>
          </div>

          <div className="p-2.5 rounded-lg border bg-muted/20">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">
              @ / Cab / Ano Proj.
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-foreground">
              {projecao.projetado.arrobasPorCabAno.toFixed(2)} @
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              rebanho: {projecao.rebanhoMedioCab} cab
            </span>
          </div>

          <div className="p-2.5 rounded-lg border bg-muted/20">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">
              Custeio Proj. / Cab
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-foreground">
              {formatCurrency(projecao.projetado.custeioTotalPorCabAno)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">ano de 12 meses</span>
          </div>

          <div className="p-2.5 rounded-lg border bg-muted/20">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">
              Margem EBITDA Proj.
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-primary">
              {projecao.projetado.margemEbitdaPct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-emerald-600 block font-semibold mt-0.5">
              EBITDA: {formatCurrency(projecao.projetado.ebitdaRs)}
            </span>
          </div>
        </div>

        {/* Botão de Expansão para a Base de Cálculo Transparente (Requisito 3) */}
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMostrarBaseCalculo(!mostrarBaseCalculo)}
            className="w-full text-xs text-muted-foreground hover:text-foreground justify-between border border-dashed h-9"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 text-primary" />
              Base de Cálculo Transparente (auditoria da fórmula e premissas)
            </span>
            {mostrarBaseCalculo ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {mostrarBaseCalculo && (
            <div className="mt-2.5 p-4 rounded-xl border bg-muted/30 text-xs space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <h5 className="font-bold text-foreground flex items-center gap-1.5">
                    <span>1. Extrapolação de Produtividade (@/ha/ano)</span>
                  </h5>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    A arroba (@) projetada utiliza a produção real acumulada da safra calculada pela
                    variação de estoque:
                    <br />
                    <code className="text-foreground bg-muted px-1 rounded font-mono text-[10px]">
                      @ Projetada = (@ acumulada ÷ {projecao.diasDecorridos} dias) ×{' '}
                      {projecao.diasTotaisSafra} dias
                    </code>
                    <br />
                    <code className="text-foreground bg-muted px-1 rounded font-mono text-[10px]">
                      @/ha/ano = {projecao.projetado.arrobasProduzidasTotal} @ ÷{' '}
                      {projecao.areaPastorilConsideradaHa} ha ={' '}
                      {projecao.projetado.arrobasPorHaAno.toFixed(2)} @/ha/ano
                    </code>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h5 className="font-bold text-foreground flex items-center gap-1.5">
                    <span>2. Extrapolação de Custo por Arroba Produzida</span>
                  </h5>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Mesma metodologia de rateio do fechamento anual de safra, sem valor de
                    reposição:
                    <br />
                    <code className="text-foreground bg-muted px-1 rounded font-mono text-[10px]">
                      Custo Op. Anual = R${' '}
                      {projecao.acumulado.custoOperacionalSemReposicaoRs.toLocaleString(
                        'pt-BR',
                      )} ×
                      ({projecao.diasTotaisSafra} ÷ {projecao.diasDecorridos})
                    </code>
                    <br />
                    <code className="text-foreground bg-muted px-1 rounded font-mono text-[10px]">
                      Custo / @ = R${' '}
                      {projecao.projetado.custoOperacionalSemReposicaoRs.toLocaleString(
                        'pt-BR',
                      )} ÷{' '}
                      {projecao.projetado.arrobasProduzidasTotal} @ = R${' '}
                      {projecao.projetado.custoArrobaProduzida.toFixed(2)} / @
                    </code>
                  </p>
                </div>
              </div>
              {/* Tabela Resumo das Variáveis Utilizadas */}{' '}
              <div className="border rounded-lg overflow-x-auto bg-card">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/60 text-muted-foreground border-b font-semibold">
                    <tr>
                      <th className="py-1.5 px-3 text-left">Variável de Entrada</th>
                      <th className="py-1.5 px-3 text-center">Valor no Período</th>
                      <th className="py-1.5 px-3 text-center">Fator Extrapolação</th>
                      <th className="py-1.5 px-3 text-right">Fechamento Projetado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    <tr>
                      <td className="py-1.5 px-3 font-sans font-medium text-foreground">
                        Dias Decorridos da Safra
                      </td>
                      <td className="py-1.5 px-3 text-center">{projecao.diasDecorridos} dias</td>
                      <td className="py-1.5 px-3 text-center">365 ÷ {projecao.diasDecorridos}</td>
                      <td className="py-1.5 px-3 text-right font-bold">
                        {projecao.diasTotaisSafra} dias (12 meses)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans font-medium text-foreground">
                        Volume Produzido (@)
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {projecao.acumulado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @
                      </td>
                      <td className="py-1.5 px-3 text-center">× {projecao.fatorAnualizacao}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-primary">
                        {projecao.projetado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans font-medium text-foreground">
                        Área Pastoril Considerada
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {projecao.areaPastorilConsideradaHa} ha
                      </td>
                      <td className="py-1.5 px-3 text-center">Divisor Fixo</td>
                      <td className="py-1.5 px-3 text-right font-bold">
                        {projecao.areaPastorilConsideradaHa} ha útil
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans font-medium text-foreground">
                        Custo Operacional (sem reposição)
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {formatCurrency(projecao.acumulado.custoOperacionalSemReposicaoRs)}
                      </td>
                      <td className="py-1.5 px-3 text-center">× {projecao.fatorAnualizacao}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-amber-600">
                        {formatCurrency(projecao.projetado.custoOperacionalSemReposicaoRs)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans font-medium text-foreground">
                        Rebanho Médio Ativo
                      </td>
                      <td className="py-1.5 px-3 text-center">{projecao.rebanhoMedioCab} cab</td>
                      <td className="py-1.5 px-3 text-center">—</td>
                      <td className="py-1.5 px-3 text-right font-bold">
                        {projecao.rebanhoMedioCab} cabeças
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans font-medium text-foreground">
                        Cotação B3 Vigente (Boi Gordo)
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {formatCurrency(projecao.cotacaoB3.preco)} / @
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        ref:{' '}
                        {cotacaoB3?.dataReferencia
                          ? new Date(cotacaoB3.dataReferencia).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-blue-600">
                        {formatCurrency(projecao.cotacaoB3.preco)} / @
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-sans font-medium text-foreground">
                        Receita Projetada (@ × B3)
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {projecao.projetado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        × {formatCurrency(projecao.cotacaoB3.preco)} / @
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-blue-600">
                        {formatCurrency(projecao.receitaProjetadaB3Rs)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal de Configuração de Metas da Safra */}
      <ModalDefinirMetasSafra
        open={modalMetasOpen}
        onOpenChange={setModalMetasOpen}
        safra={projecao.anoSafra}
        onMetasSalvas={carregarMetasSafra}
      />
    </Card>
  )
}
