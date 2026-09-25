import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ProjecaoSafraResult,
  calcularProjecaoSafra,
  SegregacaoArrendamento,
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
import { formatCurrency, formatNumber } from '@/lib/utils'

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

  // Executa o cálculo da projeção usando o acumulado real
  const projecao: ProjecaoSafraResult = useMemo(() => {
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
      cotacaoArroba: 245.0,
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
  ])

  const clProd = projecao.classificacaoArrobasHaAno
  const clCusto = projecao.classificacaoCustoArroba
  const faixasProd = clProd.faixas
  const faixasCusto = clCusto.faixas

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
                        aria-label="Faixas Exagro Camada 2"
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs space-y-1">
                      <p className="font-bold">Faixas Camada 2 Exagro (@/ha/ano):</p>
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
                      TOP EXAGRO
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
                      title={`TOP Exagro (≥ ${faixasProd.top})`}
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
                        aria-label="Faixas de Custo Exagro"
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs space-y-1">
                      <p className="font-bold">Faixas Exagro Custo/@ (sem reposição):</p>
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
                    Ref Exagro:{' '}
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
                    Mesma metodologia de rateio do fechamento anual Exagro, sem valor de reposição:
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

              {/* Tabela Resumo das Variáveis Utilizadas */}
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
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
